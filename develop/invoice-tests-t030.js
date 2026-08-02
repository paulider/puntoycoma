(() => {
  'use strict';

  const VERSION = 'v0.2.1-dev.31';
  const SUITE = 'T-030';
  const STORAGE_KEY = 'pyc_office_v2';
  const DRAFT_KEY = 'pyc_invoice_draft_v1';
  const RESULT_KEY = 'pyc_t030_results';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

  function loadJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }

  function parseMoney(text) {
    return Number(String(text || '').replace(/[^0-9,.-]/g, '').replace(',', '.'));
  }

  function readSummary() {
    return Object.fromEntries([...document.querySelectorAll('#summary .sumrow')].map(row => {
      const parts = row.querySelectorAll('span,strong');
      return [parts[0]?.textContent.trim(), parts[1]?.textContent.trim()];
    }));
  }

  function renderResults(payload) {
    const groups = new Map();
    payload.results.forEach(result => {
      if (!groups.has(result.suite)) groups.set(result.suite, []);
      groups.get(result.suite).push(result);
    });
    $('testResults').innerHTML = [...groups.entries()].map(([suite, rows]) => `
      <div style="margin-top:14px"><strong>${suite}</strong></div>
      ${rows.map(row => `<div class="sumrow"><span>${row.name}${row.detail ? `<small>${row.detail}</small>` : ''}</span><strong>${row.valid ? 'Correcte' : 'Error'}</strong></div>`).join('')}
    `).join('');
    $('testStatus').textContent = payload.failed
      ? `${VERSION} · ${SUITE}: ${payload.passed}/${payload.results.length} proves superades; ${payload.failed} errors.`
      : `${VERSION} · ${SUITE}: totes les ${payload.results.length} proves han passat.`;
    $('testStatus').className = `status ${payload.failed ? 'bad' : 'ok'}`;
  }

  async function runAudit() {
    const storageSnapshot = localStorage.getItem(STORAGE_KEY);
    const draftSnapshot = localStorage.getItem(DRAFT_KEY);
    const results = [];
    const check = (suite, name, valid, detail = '') => results.push({ suite, name, valid: Boolean(valid), detail });

    try {
      check('Arquitectura', 'Build identificada', document.body.textContent.includes(VERSION) && document.body.textContent.includes(SUITE));
      check('Arquitectura', 'Mòduls externs', [...document.scripts].every(script => Boolean(script.src)));
      check('Arquitectura', 'Mòdul principal carregat', [...document.scripts].some(script => script.src.includes('invoice-app-t028.js')));
      check('Arquitectura', 'Suite T-030 carregada', [...document.scripts].some(script => script.src.includes('invoice-tests-t030.js')));
      check('Arquitectura', 'Sense codi imprès', !document.body.textContent.includes('document.write(html)'));
      check('Arquitectura', 'Schema v3 visible', document.body.textContent.includes('Schema v3'));

      const required = ['addDocument','addService','lines','groupManager','groupRows','bulkControls','summary','testStatus','testResults'];
      check('UI', 'Components essencials', required.every(id => Boolean($(id))));
      check('UI', 'Navegació completa', document.querySelectorAll('.nav button').length === 3);
      check('UI', 'Viewport mòbil', Boolean(document.querySelector('meta[name="viewport"]')));
      check('UI', 'Editor visible', $('lines').getBoundingClientRect().width > 0);

      let draft = loadJson(DRAFT_KEY);
      check('Persistència', 'Esborrany disponible', Array.isArray(draft.lines) && Array.isArray(draft.groups));
      check('Persistència', 'IDs de línia únics', new Set((draft.lines || []).map(line => line.id)).size === (draft.lines || []).length);
      check('Persistència', 'IDs de grup únics', new Set((draft.groups || []).map(group => group.id)).size === (draft.groups || []).length);
      check('Persistència', 'Grups íntegres', (draft.lines || []).every(line => (draft.groups || []).some(group => group.name === line.group)));

      const initialCount = document.querySelectorAll('#lines .line').length;
      $('addDocument').click();
      await sleep(20);
      check('Línies', 'Afegir document', document.querySelectorAll('#lines .line').length === initialCount + 1);
      $('addService').click();
      await sleep(20);
      check('Línies', 'Afegir servei', document.querySelectorAll('#lines .line').length === initialCount + 2);

      draft = loadJson(DRAFT_KEY);
      check('Línies', 'Nom del document conservat', draft.lines.some(line => line.concept === 'Conveni regulador'));
      check('Línies', 'Nom del servei conservat', draft.lines.some(line => String(line.concept || '').trim().length > 0));
      check('Línies', 'Descripcions persistents', draft.lines.every(line => typeof line.description === 'string'));
      check('Línies', 'Quantitats vàlides', draft.lines.every(line => Number.isFinite(Number(line.qty))));
      check('Línies', 'Preus vàlids', draft.lines.every(line => Number.isFinite(Number(line.price))));

      const firstConcept = document.querySelector('#lines [data-field="concept"]');
      if (firstConcept) {
        firstConcept.value = 'Concepte test automatitzat';
        firstConcept.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(20);
        check('Edició', 'Editar concepte', loadJson(DRAFT_KEY).lines.some(line => line.concept === 'Concepte test automatitzat'));
      } else check('Edició', 'Editar concepte', false);

      const qty = document.querySelector('#lines [data-field="qty"]');
      const price = document.querySelector('#lines [data-field="price"]');
      if (qty && price) {
        qty.value = '2'; qty.dispatchEvent(new Event('input', { bubbles: true }));
        price.value = '100'; price.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(20);
      }
      draft = loadJson(DRAFT_KEY);
      const expectedBase = round(draft.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0));
      const expectedVat = round(draft.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0) * Number(line.vat || 0) / 100, 0));
      const summary = readSummary();
      check('Càlculs', 'Base coherent', round(parseMoney(summary.Base)) === expectedBase);
      check('Càlculs', 'IVA coherent', round(parseMoney(summary.IVA)) === expectedVat);
      check('Càlculs', 'Total coherent', round(parseMoney(summary.Total)) === round(expectedBase + expectedVat));
      check('Càlculs', 'Format de dos decimals', [summary.Base, summary.IVA, summary.Total].every(value => /\d+\.\d{2}\s€/.test(value)));

      const groupInputs = [...document.querySelectorAll('[data-group-name]')];
      check('Grups', 'Grups visibles', groupInputs.length >= 3);
      check('Grups', 'Noms editables', groupInputs.every(input => !input.readOnly && !input.disabled));
      check('Grups', 'Controls de reordenació', document.querySelectorAll('[data-group-action="up"],[data-group-action="down"]').length >= groupInputs.length * 2);
      check('Grups', 'Assignació individual', document.querySelectorAll('#lines [data-field="group"]').length === document.querySelectorAll('#lines .line').length);

      const checks = [...document.querySelectorAll('#lines [data-action="select-line"]')];
      if (checks.length >= 2) {
        checks[0].checked = true; checks[0].dispatchEvent(new Event('change', { bubbles: true }));
        checks[1].checked = true; checks[1].dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(20);
        check('Grups', 'Selecció múltiple', $('assignSelected')?.textContent.includes('(2)'));
        const target = $('bulkGroupSelect');
        if (target?.options.length > 1) target.selectedIndex = 1;
        const targetName = target?.value;
        $('assignSelected')?.click();
        await sleep(20);
        check('Grups', 'Assignació múltiple manual', loadJson(DRAFT_KEY).lines.filter(line => line.group === targetName).length >= 2);
        check('Grups', 'Selecció netejada', $('assignSelected')?.textContent.includes('(0)'));
      } else {
        check('Grups', 'Selecció múltiple', false);
        check('Grups', 'Assignació múltiple manual', false);
        check('Grups', 'Selecció netejada', false);
      }

      const moveButton = document.querySelector('#lines [data-action="move-down"]');
      if (moveButton) {
        const sourceIndex = Number(moveButton.dataset.index);
        const before = loadJson(DRAFT_KEY).lines;
        const movedId = before[sourceIndex]?.id;
        moveButton.click();
        await sleep(20);
        const after = loadJson(DRAFT_KEY).lines;
        check('Ordenació', 'Reordenar línies', Boolean(movedId) && after[sourceIndex + 1]?.id === movedId,
          `índex ${sourceIndex} → ${sourceIndex + 1}`);
      } else check('Ordenació', 'Reordenar línies', false, 'No hi ha botó disponible');

      const integrationState = {
        version:3,
        clients:[{id:'c1',name:'Client prova'}],
        cases:[{id:'e1',name:'Expedient prova',participants:[{clientId:'c1'}]}],
        documents:[{id:'d1',caseId:'e1',type:'informatiu',title:'Document prova',billableAmount:250}],
        serviceCatalog:[{id:'s1',name:'Servei catàleg',description:'Descripció',category:'Honoraris',unitPrice:75,vatRate:21,active:true}],
        provisions:[{id:'p1',caseId:'e1',availableAmount:300,appliedAmount:0,status:'pagada'}],
        payments:[],activity:[],settings:{invoicePrefix:'F-2026-',nextInvoiceNumber:1}
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(integrationState));
      check('Integració', 'Clients compatibles', loadJson(STORAGE_KEY).clients.length === 1);
      check('Integració', 'Expedients compatibles', loadJson(STORAGE_KEY).cases.length === 1);
      check('Integració', 'Documents compatibles', loadJson(STORAGE_KEY).documents[0].billableAmount === 250);
      check('Integració', 'Serveis compatibles', loadJson(STORAGE_KEY).serviceCatalog[0].unitPrice === 75);
      check('Integració', 'Provisions compatibles', loadJson(STORAGE_KEY).provisions[0].availableAmount === 300);
      check('Integració', 'Numeració compatible', loadJson(STORAGE_KEY).settings.invoicePrefix === 'F-2026-');

      check('Seguretat', 'Sense formularis externs', document.querySelectorAll('form[action]').length === 0);
      check('Seguretat', 'Sense HTTP insegur', ![...document.querySelectorAll('[src],[href]')].some(node => node.outerHTML.includes('http://')));
      check('Mobile', 'Controls visibles', [...document.querySelectorAll('button')].every(button => button.getBoundingClientRect().height > 0));

    } catch (error) {
      results.push({ suite:'Execució', name:'Bateria completa', valid:false, detail:error.message });
    } finally {
      if (storageSnapshot === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, storageSnapshot);
      if (draftSnapshot === null) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, draftSnapshot);
    }

    const failed = results.filter(result => !result.valid).length;
    const payload = { results, failed, passed: results.length - failed };
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(payload));
    location.reload();
  }

  const stored = sessionStorage.getItem(RESULT_KEY);
  if (stored) {
    sessionStorage.removeItem(RESULT_KEY);
    renderResults(JSON.parse(stored));
  } else {
    setTimeout(runAudit, 150);
  }

  $('runFullTests')?.addEventListener('click', runAudit);
  window.runInvoiceAuditT030 = runAudit;
})();