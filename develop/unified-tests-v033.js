(() => {
  'use strict';

  const VERSION = 'v0.2.1-dev.32';
  const SUITE = 'T-032';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function setStatus(text, type = '') {
    const node = $('testStatus');
    if (!node) return;
    node.textContent = text;
    node.className = `status ${type}`.trim();
  }

  function renderResults(results) {
    const grouped = new Map();
    results.forEach(result => {
      if (!grouped.has(result.suite)) grouped.set(result.suite, []);
      grouped.get(result.suite).push(result);
    });

    $('testResults').innerHTML = [...grouped.entries()].map(([suite, rows]) => `
      <div style="margin-top:14px"><strong>${suite}</strong></div>
      ${rows.map(row => `<div class="row"><span>${row.name}${row.detail ? `<small style="display:block;color:var(--m)">${row.detail}</small>` : ''}</span><strong>${row.ok ? 'Correcte' : 'Error'}</strong></div>`).join('')}
    `).join('');

    const failed = results.filter(result => !result.ok).length;
    const passed = results.length - failed;
    setStatus(
      failed ? `${VERSION} · ${SUITE}: ${passed}/${results.length} proves superades; ${failed} errors.` : `${VERSION} · ${SUITE}: totes les ${results.length} proves han passat.`,
      failed ? 'bad' : 'ok'
    );
  }

  async function waitForApp(timeout = 5000) {
    const started = performance.now();
    while (!window.PYC) {
      if (performance.now() - started > timeout) throw new Error('El mòdul principal PYC no s’ha carregat.');
      await sleep(50);
    }
  }

  async function runAudit() {
    const results = [];
    const check = (suite, name, ok, detail = '') => results.push({ suite, name, ok: Boolean(ok), detail });
    const storageSnapshot = localStorage.getItem('pyc_office_v2');
    const viewSnapshot = sessionStorage.getItem('pyc_unified_view');

    $('runAllTests').disabled = true;
    setStatus('Executant auditoria…');
    $('testResults').innerHTML = '';

    try {
      await waitForApp();
      const PYC = window.PYC;

      check('Arrencada', 'Mòdul principal disponible', Boolean(PYC));
      check('Arrencada', 'Versió global disponible', PYC.VERSION === VERSION, PYC.VERSION || 'sense versió');
      check('Arrencada', 'Suite carregada', true);
      check('Core', 'Schema v3 visible', document.body.textContent.includes('Schema v3'));
      check('Core', 'Cinc vistes unificades', document.querySelectorAll('.view').length === 5);
      check('Core', 'Navegació unificada', document.querySelectorAll('.nav button').length === 5);
      check('Core', 'Sense builds antigues visibles', !/v0\.2\.1-dev\.(?:[0-9]|1[0-9]|2[0-9]|30|31)(?![0-9])/.test(document.body.textContent));

      PYC.save(PYC.empty());
      await sleep(20);
      let state = PYC.load();
      check('Persistència', 'Estat buit vàlid', state.version === 3 && state.build === VERSION);

      PYC.addClient();
      PYC.addClient();
      await sleep(20);
      state = PYC.load();
      check('Clients', 'Crear dos clients', state.clients.length === 2);
      check('Clients', 'IDs únics', new Set(state.clients.map(item => item.id)).size === 2);
      check('Clients', 'NIFs únics', new Set(state.clients.map(item => item.tax)).size === 2);

      $('clientSearch').value = 'Client 2';
      $('clientSearch').dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(10);
      check('Clients', 'Cerca per nom', $('clientList').textContent.includes('Client 2') && !$('clientList').textContent.includes('Client 1'));
      $('clientSearch').value = '';
      $('clientSearch').dispatchEvent(new Event('input', { bubbles: true }));

      PYC.addCase();
      PYC.addCase();
      await sleep(20);
      state = PYC.load();
      check('Expedients', 'Crear dos expedients', state.cases.length === 2);
      check('Expedients', 'Numeració consecutiva', state.cases[0].code === 'EXP-2026-001' && state.cases[1].code === 'EXP-2026-002');
      check('Expedients', 'Participants vàlids', state.cases.every(item => state.clients.some(client => client.id === item.participants[0].clientId)));

      PYC.addInvoice();
      PYC.addInvoice();
      await sleep(20);
      state = PYC.load();
      const invoices = state.documents.filter(item => item.type === 'factura');
      check('Facturació', 'Crear dues factures', invoices.length === 2);
      check('Facturació', 'Numeració consecutiva', invoices[0].number === 'F-2026-001' && invoices[1].number === 'F-2026-002');
      check('Facturació', 'Càlcul fiscal coherent', invoices.every(item => item.base === 100 && item.vat === 21 && item.total === 121));
      check('Facturació', 'Relació amb expedient', invoices.every(item => state.cases.some(caseItem => caseItem.id === item.caseId)));

      PYC.addProvision();
      PYC.addProvision();
      await sleep(20);
      state = PYC.load();
      check('Provisions', 'Crear dues provisions', state.provisions.length === 2);
      check('Provisions', 'Saldo disponible coherent', state.provisions.reduce((sum, item) => sum + item.availableAmount, 0) === 600);

      for (const view of ['home', 'clients', 'cases', 'billing', 'quality']) {
        PYC.showView(view);
        check('Navegació', `Vista ${view}`, document.getElementById(view).classList.contains('active'));
      }

      const stress = PYC.empty();
      for (let i = 0; i < 200; i += 1) {
        stress.clients.push({ id: `c${i}`, name: `Client ${i}`, tax: `NIF${i}` });
        stress.cases.push({ id: `e${i}`, name: `Expedient ${i}`, code: `EXP-${i}`, participants: [{ clientId: `c${i}` }], status: 'obert' });
      }
      for (let i = 0; i < 500; i += 1) {
        stress.documents.push({ id: `f${i}`, caseId: `e${i % 200}`, type: 'factura', number: `F-${i}`, base: 100, vat: 21, total: 121, status: 'emesa', lines: [{ id: `l${i}`, concept: 'Servei', qty: 1, price: 100, vat: 21 }] });
      }
      const started = performance.now();
      PYC.save(stress);
      await sleep(30);
      const elapsed = performance.now() - started;
      state = PYC.load();
      check('Estrès', '200 clients persistits', state.clients.length === 200);
      check('Estrès', '200 expedients persistits', state.cases.length === 200);
      check('Estrès', '500 factures persistides', state.documents.length === 500);
      check('Estrès', 'Sense referències orfes', state.documents.every(item => state.cases.some(caseItem => caseItem.id === item.caseId)));
      check('Estrès', 'Temps inferior a 1 segon', elapsed < 1000, `${Math.round(elapsed)} ms`);

      localStorage.setItem(PYC.KEY, '{invalid-json');
      state = PYC.load();
      check('Resiliència', 'Recuperació de dades corruptes', state.version === 3 && Array.isArray(state.clients));

      const xss = PYC.empty();
      xss.clients = [{ id: 'x', name: '<img src=x onerror=alert(1)>', tax: 'X' }];
      PYC.save(xss);
      await sleep(10);
      check('Seguretat', 'Entrada HTML escapada', !$('clientList').innerHTML.includes('<img'));
      check('Responsive', 'Viewport configurat', Boolean(document.querySelector('meta[name="viewport"]')));
      check('Responsive', 'Controls visibles', [...document.querySelectorAll('button')].every(button => button.getBoundingClientRect().height > 0));
    } catch (error) {
      check('Execució', 'Error de la suite', false, error.message);
    } finally {
      if (storageSnapshot === null) localStorage.removeItem('pyc_office_v2');
      else localStorage.setItem('pyc_office_v2', storageSnapshot);
      if (viewSnapshot === null) sessionStorage.removeItem('pyc_unified_view');
      else sessionStorage.setItem('pyc_unified_view', viewSnapshot);
      window.PYC?.render?.();
      window.PYC?.showView?.('quality');
      $('runAllTests').disabled = false;
    }

    renderResults(results);
  }

  window.addEventListener('error', event => {
    setStatus(`Error JavaScript: ${event.message}`, 'bad');
  });
  window.addEventListener('unhandledrejection', event => {
    setStatus(`Error asíncron: ${event.reason?.message || event.reason}`, 'bad');
  });

  $('runAllTests')?.addEventListener('click', runAudit);
  setStatus('Suite carregada. Prem “Executar totes”.');
  window.runUnifiedT032 = runAudit;
})();