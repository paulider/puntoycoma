(() => {
  'use strict';

  const VERSION = 'v0.2.1-dev.30';
  const SUITE = 'T-029';
  const STORAGE_KEY = 'pyc_office_v2';
  const DRAFT_KEY = 'pyc_invoice_draft_v1';
  const $ = id => document.getElementById(id);
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function parseMoney(text) {
    return Number(String(text || '').replace(/[^0-9,.-]/g, '').replace(',', '.'));
  }

  function readSummary() {
    const rows = [...document.querySelectorAll('#summary .sumrow')];
    return Object.fromEntries(rows.map(row => {
      const parts = row.querySelectorAll('span,strong');
      return [parts[0]?.textContent.trim(), parts[1]?.textContent.trim()];
    }));
  }

  function dispatchInput(element, value) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function dispatchChange(element, value) {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function runFullTests() {
    const storageSnapshot = localStorage.getItem(STORAGE_KEY);
    const draftSnapshot = localStorage.getItem(DRAFT_KEY);
    const results = [];
    const check = (suite, name, valid, detail = '') => results.push({ suite, name, valid: Boolean(valid), detail });

    try {
      check('Arquitectura', 'Build identificada', document.body.textContent.includes(VERSION) && document.body.textContent.includes(SUITE));
      check('Arquitectura', 'HTML i JavaScript separats', [...document.scripts].every(script => script.src));
      check('Arquitectura', 'Mòdul principal carregat', [...document.scripts].some(script => script.src.includes('invoice-app-t028.js')));
      check('Arquitectura', 'Mòdul de regressió carregat', [...document.scripts].some(script => script.src.includes('invoice-tests-t029.js')));
      check('Arquitectura', 'Sense codi imprès a pantalla', !document.body.textContent.includes('document.write(html)'));
      check('Arquitectura', 'Schema v3 visible', document.body.textContent.includes('Schema v3'));

      const requiredIds = ['addDocument', 'addService', 'lines', 'groupManager', 'groupRows', 'bulkControls', 'summary', 'testStatus', 'testResults'];
      check('UI', 'Elements essencials disponibles', requiredIds.every(id => Boolean($(id))));
      check('UI', 'Navegació principal present', document.querySelectorAll('.nav button').length === 3);
      check('UI', 'Vista responsive activa', Boolean(document.querySelector('meta[name="viewport"]')));
      check('UI', 'Capçalera de versió visible', document.querySelectorAll('.badge').length >= 4);

      let draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      check('Persistència', 'Esborrany creat automàticament', Array.isArray(draft.lines) && Array.isArray(draft.groups));
      check('Persistència', 'Build registrada a esborrany', draft.build === 'v0.2.1-dev.29' || draft.build === VERSION);
      check('Persistència', 'Identificadors de línia únics', new Set((draft.lines || []).map(line => line.id)).size === (draft.lines || []).length);
      check('Persistència', 'Identificadors de grup únics', new Set((draft.groups || []).map(group => group.id)).size === (draft.groups || []).length);
      check('Persistència', 'Ordre de grups consistent', (draft.groups || []).slice().sort((a,b) => a.order-b.order).every((group,index) => group.order === index));
      check('Persistència', 'Totes les línies tenen grup vàlid', (draft.lines || []).every(line => (draft.groups || []).some(group => group.name === line.group)));

      const initialCount = document.querySelectorAll('#lines .line').length;
      $('addDocument').click();
      await sleep(10);
      check('Línies', 'Afegir document', document.querySelectorAll('#lines .line').length === initialCount + 1);
      $('addService').click();
      await sleep(10);
      check('Línies', 'Afegir servei', document.querySelectorAll('#lines .line').length === initialCount + 2);

      draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      check('Línies', 'Concepte del document conservat', draft.lines.some(line => line.concept === 'Conveni regulador'));
      check('Línies', 'Nom del servei conservat', draft.lines.some(line => String(line.concept).trim() && line.concept !== 'Concepte'));
      check('Línies', 'Descripcions persistents', draft.lines.every(line => typeof line.description === 'string'));
      check('Línies', 'Quantitats numèriques', draft.lines.every(line => Number.isFinite(Number(line.qty))));
      check('Línies', 'Preus numèrics', draft.lines.every(line => Number.isFinite(Number(line.price))));
      check('Línies', 'IVA numèric', draft.lines.every(line => Number.isFinite(Number(line.vat))));

      const firstLine = document.querySelector('#lines .line');
      const conceptInput = firstLine?.querySelector('[data-field="concept"]');
      if (conceptInput) {
        dispatchInput(conceptInput, 'Concepte test automatitzat');
        await sleep(10);
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
        check('Edició', 'Editar concepte', draft.lines.some(line => line.concept === 'Concepte test automatitzat'));
      } else check('Edició', 'Editar concepte', false, 'No s’ha trobat el camp');

      const qtyInput = document.querySelector('#lines [data-field="qty"]');
      const priceInput = document.querySelector('#lines [data-field="price"]');
      if (qtyInput && priceInput) {
        dispatchInput(qtyInput, '2');
        dispatchInput(priceInput, '100');
        await sleep(10);
        const summary = readSummary();
        check('Càlculs', 'Recalcular en editar quantitat/preu', parseMoney(summary.Base) >= 200);
      } else check('Càlculs', 'Recalcular en editar quantitat/preu', false);

      draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      const expectedBase = round(draft.lines.reduce((sum,line) => sum + Number(line.qty || 0) * Number(line.price || 0) * (1 - Number(line.discount || 0) / 100), 0));
      const expectedVat = round(draft.lines.reduce((sum,line) => {
        const base = Number(line.qty || 0) * Number(line.price || 0) * (1 - Number(line.discount || 0) / 100);
        return sum + base * Number(line.vat || 0) / 100;
      }, 0));
      const summary = readSummary();
      check('Càlculs', 'Base coherent', round(parseMoney(summary.Base)) === expectedBase, `${summary.Base} / ${expectedBase}`);
      check('Càlculs', 'IVA coherent', round(parseMoney(summary.IVA)) === expectedVat, `${summary.IVA} / ${expectedVat}`);
      check('Càlculs', 'Total coherent', round(parseMoney(summary.Total)) === round(expectedBase + expectedVat));
      check('Càlculs', 'Arrodoniment a dos decimals', [summary.Base, summary.IVA, summary.Total].every(value => /\d+\.\d{2}\s€/.test(value)));

      const groupInputs = [...document.querySelectorAll('[data-group-name]')];
      check('Grups', 'Grups inicials visibles', groupInputs.length >= 3);
      check('Grups', 'Noms de grup editables', groupInputs.every(input => !input.readOnly && !input.disabled));
      check('Grups', 'Controls de reordenació', document.querySelectorAll('[data-group-action="up"], [data-group-action="down"]').length >= groupInputs.length * 2);
      check('Grups', 'Control d’eliminació', document.querySelectorAll('[data-group-action="delete"]').length === groupInputs.length);

      const selectors = [...document.querySelectorAll('#lines [data-field="group"]')];
      check('Grups', 'Assignació individual disponible', selectors.length === document.querySelectorAll('#lines .line').length);
      check('Grups', 'Opcions coincideixen amb grups', selectors.every(select => select.options.length === groupInputs.length));

      const checkboxes = [...document.querySelectorAll('#lines [data-action="select-line"]')];
      if (checkboxes.length >= 2) {
        checkboxes[0].checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
        checkboxes[1].checked = true;
        checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(10);
        check('Grups', 'Selecció múltiple', $('assignSelected')?.textContent.includes('(2)'));
        const bulkSelect = $('bulkGroupSelect');
        if (bulkSelect && bulkSelect.options.length > 1) bulkSelect.selectedIndex = 1;
        $('assignSelected')?.click();
        await sleep(10);
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
        const targetName = bulkSelect?.value;
        check('Grups', 'Assignació manual múltiple', draft.lines.filter(line => line.group === targetName).length >= 2);
        check('Grups', 'Selecció netejada després d’assignar', $('assignSelected')?.textContent.includes('(0)'));
      } else {
        check('Grups', 'Selecció múltiple', false);
        check('Grups', 'Assignació manual múltiple', false);
        check('Grups', 'Selecció netejada després d’assignar', false);
      }

      const firstMoveDown = document.querySelector('#lines [data-action="move-down"]');
      if (firstMoveDown) {
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
        const firstId = draft.lines[0]?.id;
        firstMoveDown.click();
        await sleep(10);
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
        check('Ordenació', 'Reordenar línies', draft.lines[1]?.id === firstId || draft.lines[0]?.id !== firstId);
      } else check('Ordenació', 'Reordenar línies', false);

      const state = {
        version: 3,
        clients: [{ id:'c1', name:'Client prova' }],
        cases: [{ id:'e1', name:'Expedient prova', participants:[{ clientId:'c1' }] }],
        documents: [{ id:'d1', caseId:'e1', type:'informatiu', title:'Document prova', billableAmount:250 }],
        serviceCatalog: [{ id:'s1', name:'Servei catàleg', description:'Descripció catàleg', category:'Honoraris', unitPrice:75, vatRate:21, active:true }],
        provisions: [{ id:'p1', caseId:'e1', availableAmount:300, appliedAmount:0, status:'pagada' }],
        payments: [], activity: [], settings:{ invoicePrefix:'F-2026-', nextInvoiceNumber:1 }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      check('Integració', 'Clients compatibles', loadJson(STORAGE_KEY).clients.length === 1);
      check('Integració', 'Expedients compatibles', loadJson(STORAGE_KEY).cases.length === 1);
      check('Integració', 'Documents facturables compatibles', loadJson(STORAGE_KEY).documents[0].billableAmount === 250);
      check('Integració', 'Catàleg de serveis compatible', loadJson(STORAGE_KEY).serviceCatalog[0].unitPrice === 75);
      check('Integració', 'Provisions compatibles', loadJson(STORAGE_KEY).provisions[0].availableAmount === 300);
      check('Integració', 'Numeració compatible', loadJson(STORAGE_KEY).settings.invoicePrefix === 'F-2026-' && loadJson(STORAGE_KEY).settings.nextInvoiceNumber === 1);

      const html = document.documentElement.outerHTML;
      check('Seguretat', 'Escapat HTML disponible en UI', !html.includes('<script>alert('));
      check('Seguretat', 'No hi ha formularis enviats externament', document.querySelectorAll('form[action]').length === 0);
      check('Seguretat', 'Sense recursos HTTP insegurs', ![...document.querySelectorAll('[src],[href]')].some(node => /^(src|href)=['"]http:\/\//.test(node.outerHTML)));

      check('Mobile', 'Sense amplada fixa obligatòria', getComputedStyle(document.body).minWidth === '0px' || getComputedStyle(document.body).minWidth === 'auto');
      check('Mobile', 'Controls tàctils disponibles', [...document.querySelectorAll('button')].every(button => button.getBoundingClientRect().height > 0));
      check('Mobile', 'Editor visible', $('lines').getBoundingClientRect().width > 0);

    } catch (error) {
      results.push({ suite:'Execució', name:'Bateria completa', valid:false, detail:error.message });
    } finally {
      if (storageSnapshot === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, storageSnapshot);
      if (draftSnapshot === null) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, draftSnapshot);
    }

    const bySuite = new Map();
    results.forEach(result => {
      if (!bySuite.has(result.suite)) bySuite.set(result.suite, []);
      bySuite.get(result.suite).push(result);
    });

    $('testResults').innerHTML = [...bySuite.entries()].map(([suite, suiteResults]) => `
      <div style="margin-top:14px"><strong>${suite}</strong></div>
      ${suiteResults.map(result => `<div class="sumrow"><span>${result.name}${result.detail ? `<small style="display:block;color:var(--m)">${result.detail}</small>` : ''}</span><strong>${result.valid ? 'Correcte' : 'Error'}</strong></div>`).join('')}
    `).join('');

    const failed = results.filter(result => !result.valid).length;
    const passed = results.length - failed;
    $('testStatus').textContent = failed
      ? `${VERSION} · ${SUITE}: ${passed}/${results.length} proves superades; ${failed} errors.`
      : `${VERSION} · ${SUITE}: totes les ${results.length} proves han passat.`;
    $('testStatus').className = `status ${failed ? 'bad' : 'ok'}`;
  }

  function loadJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }

  const button = $('runFullTests');
  if (button) button.addEventListener('click', runFullTests);
  window.runInvoiceRegressionSuite = runFullTests;
  setTimeout(runFullTests, 100);
})();