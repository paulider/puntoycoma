(() => {
  'use strict';
  const VERSION = 'v0.2.1-dev.34';
  const KEY = 'pyc_office_v2';
  const $ = id => document.getElementById(id);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const round = n => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t = key => window.PYCI18N?.t(key) || key;
  const empty = () => ({version:3,build:VERSION,settings:{invoicePrefix:'F-2026-',nextInvoiceNumber:1},clients:[],cases:[],documents:[],serviceCatalog:[],provisions:[],payments:[],activity:[]});
  const load = () => { try { return {...empty(), ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {})}; } catch { return empty(); } };
  const save = state => { state.version = 3; state.build = VERSION; localStorage.setItem(KEY, JSON.stringify(state)); render(); };
  const row = (title, meta = '') => `<div class="row"><div><strong>${esc(title)}</strong><div class="label">${esc(meta)}</div></div><span>›</span></div>`;

  function render() {
    const state = load();
    $('mClients').textContent = state.clients.length;
    $('mCases').textContent = state.cases.length;
    const invoices = state.documents.filter(document => document.type === 'factura');
    $('mInvoices').textContent = invoices.length;
    $('mProvisions').textContent = `${round(state.provisions.reduce((sum, provision) => sum + (provision.availableAmount || 0), 0)).toFixed(2)} €`;
    const query = ($('clientSearch').value || '').toLowerCase();
    $('clientList').innerHTML = state.clients.filter(client => `${client.name} ${client.tax || ''}`.toLowerCase().includes(query)).map(client => row(client.name, client.tax || t('noTaxId'))).join('') || `<div class="status">${esc(t('noClients'))}</div>`;
    $('caseList').innerHTML = state.cases.map(item => row(item.name, item.code || t('noCode'))).join('') || `<div class="status">${esc(t('noCases'))}</div>`;
    $('invoiceList').innerHTML = invoices.map(invoice => row(invoice.number || t('noNumber'), `${Number(invoice.total || 0).toFixed(2)} € · ${invoice.status || t('draft')}`)).join('') || `<div class="status">${esc(t('noInvoices'))}</div>`;
    $('provisionList').innerHTML = state.provisions.map(provision => row(provision.title || t('provisions'), `${Number(provision.availableAmount || 0).toFixed(2)} € · ${provision.status || t('pending')}`)).join('') || `<div class="status">${esc(t('noProvisions'))}</div>`;
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === name));
    document.querySelectorAll('.nav button').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    sessionStorage.setItem('pyc_unified_view', name);
  }

  function addClient() {
    const state = load();
    const index = state.clients.length + 1;
    state.clients.push({id:uid(),name:`${t('clients')} ${index}`,tax:`TEST-${String(index).padStart(4,'0')}`});
    save(state);
  }

  function addCase() {
    const state = load();
    if (!state.clients.length) return alert(t('createClientFirst'));
    const index = state.cases.length + 1;
    state.cases.push({id:uid(),name:`${t('cases')} ${index}`,code:`EXP-2026-${String(index).padStart(3,'0')}`,participants:[{clientId:state.clients[0].id}],status:'obert'});
    save(state);
  }

  function addInvoice() {
    const state = load();
    if (!state.cases.length) return alert(t('createCaseFirst'));
    const sequence = Number(state.settings.nextInvoiceNumber || 1);
    state.documents.push({id:uid(),caseId:state.cases[0].id,type:'factura',number:`${state.settings.invoicePrefix}${String(sequence).padStart(3,'0')}`,status:'emesa',base:100,vat:21,total:121,amountDue:121,lines:[{id:uid(),concept:'Honoraris professionals',qty:1,price:100,vat:21}]});
    state.settings.nextInvoiceNumber = sequence + 1;
    save(state);
  }

  function addProvision() {
    const state = load();
    if (!state.cases.length) return alert(t('createCaseFirst'));
    state.provisions.push({id:uid(),caseId:state.cases[0].id,title:t('provisions'),requestedAmount:300,paidAmount:300,availableAmount:300,appliedAmount:0,status:'pagada'});
    save(state);
  }

  function loadDemo() {
    const state = empty();
    state.clients = [{id:'c1',name:'Anna Garcia',tax:'12345678A'},{id:'c2',name:'Marc Pérez',tax:'87654321B'}];
    state.cases = [{id:'e1',name:'Divorci Garcia - Pérez',code:'EXP-2026-001',participants:[{clientId:'c1'},{clientId:'c2'}],status:'obert'}];
    state.documents = [{id:'f1',caseId:'e1',type:'factura',number:'F-2026-001',status:'emesa',base:500,vat:105,total:605,amountDue:305,lines:[{id:'l1',concept:'Conveni regulador',qty:1,price:500,vat:21}]}];
    state.settings.nextInvoiceNumber = 2;
    state.provisions = [{id:'p1',caseId:'e1',title:t('provisions'),requestedAmount:300,paidAmount:300,availableAmount:0,appliedAmount:300,status:'aplicada'}];
    save(state);
  }

  document.querySelectorAll('.nav button').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $('loadDemo').addEventListener('click', loadDemo);
  $('addClient').addEventListener('click', addClient);
  $('addCase').addEventListener('click', addCase);
  $('addInvoice').addEventListener('click', addInvoice);
  $('addProvision').addEventListener('click', addProvision);
  $('clientSearch').addEventListener('input', render);
  $('languageSelector').addEventListener('change', event => window.PYCI18N.setLanguage(event.target.value));
  showView(sessionStorage.getItem('pyc_unified_view') || 'home');
  render();
  window.PYC = {VERSION,KEY,load,save,empty,render,showView,addClient,addCase,addInvoice,addProvision,loadDemo,round};
  window.PYCI18N.applyTranslations();
})();