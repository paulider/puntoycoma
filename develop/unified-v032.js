(() => {
  'use strict';
  const VERSION = 'v0.2.1-dev.32';
  const KEY = 'pyc_office_v2';
  const $ = id => document.getElementById(id);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const round = n => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const empty = () => ({version:3,build:VERSION,settings:{invoicePrefix:'F-2026-',nextInvoiceNumber:1},clients:[],cases:[],documents:[],serviceCatalog:[],provisions:[],payments:[],activity:[]});
  const load = () => { try { return {...empty(), ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {})}; } catch { return empty(); } };
  const save = s => { s.version = 3; s.build = VERSION; localStorage.setItem(KEY, JSON.stringify(s)); render(); };
  const row = (a,b='') => `<div class="row"><div><strong>${esc(a)}</strong><div class="label">${esc(b)}</div></div><span>›</span></div>`;

  function render() {
    const s = load();
    $('mClients').textContent = s.clients.length;
    $('mCases').textContent = s.cases.length;
    const invoices = s.documents.filter(d => d.type === 'factura');
    $('mInvoices').textContent = invoices.length;
    $('mProvisions').textContent = `${round(s.provisions.reduce((a,p)=>a+(p.availableAmount||0),0)).toFixed(2)} €`;
    const q = ($('clientSearch').value || '').toLowerCase();
    $('clientList').innerHTML = s.clients.filter(c => `${c.name} ${c.tax||''}`.toLowerCase().includes(q)).map(c => row(c.name,c.tax||'Sense NIF')).join('') || '<div class="status">No hi ha clients.</div>';
    $('caseList').innerHTML = s.cases.map(c => row(c.name,c.code||'Sense codi')).join('') || '<div class="status">No hi ha expedients.</div>';
    $('invoiceList').innerHTML = invoices.map(i => row(i.number||'Sense número',`${Number(i.total||0).toFixed(2)} € · ${i.status||'esborrany'}`)).join('') || '<div class="status">No hi ha factures.</div>';
    $('provisionList').innerHTML = s.provisions.map(p => row(p.title||'Provisió',`${Number(p.availableAmount||0).toFixed(2)} € · ${p.status||'pendent'}`)).join('') || '<div class="status">No hi ha provisions.</div>';
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === name));
    document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    sessionStorage.setItem('pyc_unified_view', name);
  }

  function addClient() {
    const s = load();
    const index = s.clients.length + 1;
    s.clients.push({id:uid(),name:`Client ${index}`,tax:`TEST-${String(index).padStart(4,'0')}`});
    save(s);
  }

  function addCase() {
    const s = load();
    if (!s.clients.length) return alert('Crea primer un client.');
    const index = s.cases.length + 1;
    s.cases.push({id:uid(),name:`Expedient ${index}`,code:`EXP-2026-${String(index).padStart(3,'0')}`,participants:[{clientId:s.clients[0].id}],status:'obert'});
    save(s);
  }

  function addInvoice() {
    const s = load();
    if (!s.cases.length) return alert('Crea primer un expedient.');
    const base = 100;
    const vat = 21;
    const total = 121;
    const seq = Number(s.settings.nextInvoiceNumber || 1);
    s.documents.push({id:uid(),caseId:s.cases[0].id,type:'factura',number:`${s.settings.invoicePrefix}${String(seq).padStart(3,'0')}`,status:'emesa',base,vat,total,amountDue:total,lines:[{id:uid(),concept:'Honoraris professionals',qty:1,price:base,vat:21}]});
    s.settings.nextInvoiceNumber = seq + 1;
    save(s);
  }

  function addProvision() {
    const s = load();
    if (!s.cases.length) return alert('Crea primer un expedient.');
    s.provisions.push({id:uid(),caseId:s.cases[0].id,title:'Provisió de fons',requestedAmount:300,paidAmount:300,availableAmount:300,appliedAmount:0,status:'pagada'});
    save(s);
  }

  function loadDemo() {
    const s = empty();
    s.clients = [{id:'c1',name:'Anna Garcia',tax:'12345678A'},{id:'c2',name:'Marc Pérez',tax:'87654321B'}];
    s.cases = [{id:'e1',name:'Divorci Garcia - Pérez',code:'EXP-2026-001',participants:[{clientId:'c1'},{clientId:'c2'}],status:'obert'}];
    s.documents = [{id:'f1',caseId:'e1',type:'factura',number:'F-2026-001',status:'emesa',base:500,vat:105,total:605,amountDue:305,lines:[{id:'l1',concept:'Conveni regulador',qty:1,price:500,vat:21}]}];
    s.settings.nextInvoiceNumber = 2;
    s.provisions = [{id:'p1',caseId:'e1',title:'Provisió inicial',requestedAmount:300,paidAmount:300,availableAmount:0,appliedAmount:300,status:'aplicada'}];
    save(s);
  }

  document.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $('loadDemo').addEventListener('click', loadDemo);
  $('addClient').addEventListener('click', addClient);
  $('addCase').addEventListener('click', addCase);
  $('addInvoice').addEventListener('click', addInvoice);
  $('addProvision').addEventListener('click', addProvision);
  $('clientSearch').addEventListener('input', render);
  showView(sessionStorage.getItem('pyc_unified_view') || 'home');
  render();
  window.PYC = {VERSION,KEY,load,save,empty,render,showView,addClient,addCase,addInvoice,addProvision,loadDemo,round};
})();