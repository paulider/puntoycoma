(() => {
  'use strict';
  const STATE_KEY='pyc_office_v2';
  const DRAFT_KEY='pyc_invoice_advanced_i18n_draft_v1';
  const ADVANCED_URL='invoice-rc1-stable.html?build=rc1-3';

  function loadState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{documents:[],cases:[]};}
    catch{return{documents:[],cases:[]};}
  }

  function saveDraftFromInvoice(invoice){
    const language=invoice?.language||localStorage.getItem('pyc_language_v1')||'ca';
    const groups=invoice?.groups||window.PYCInvoiceGroupI18N?.defaultGroups?.()||[
      {id:'group-fees',key:'fees',kind:'builtin',order:0},
      {id:'group-expenses',key:'expenses',kind:'builtin',order:1},
      {id:'group-disbursements',key:'disbursements',kind:'builtin',order:2},
      {id:'group-discounts',key:'discounts',kind:'builtin',order:3}
    ];
    const lines=(invoice?.lines||[]).map(line=>({
      id:line.id||crypto.randomUUID?.()||String(Date.now()),
      sourceType:line.sourceType||'manual',
      sourceId:line.sourceId||null,
      concept:line.concept||'',
      description:line.description||'',
      groupKey:line.groupKey||'fees',
      qty:Number(line.qty??1),
      price:Number(line.price??0),
      vat:Number(line.vat??21),
      discount:Number(line.discount??0),
      exempt:Boolean(line.exempt)
    }));
    const draft={
      invoiceId:invoice?.id||null,
      caseId:invoice?.caseId||loadState().cases?.[0]?.id||'',
      status:invoice?.status||'esborrany',
      language,
      groups,
      lines:lines.length?lines:[{id:crypto.randomUUID?.()||String(Date.now()),sourceType:'manual',sourceId:null,concept:'',description:'',groupKey:'fees',qty:1,price:0,vat:21,discount:0,exempt:false}],
      selected:[]
    };
    localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));
  }

  function openNewInvoice(){saveDraftFromInvoice(null);location.href=ADVANCED_URL;}
  function openInvoice(id){
    const invoice=loadState().documents?.find(item=>item.id===id&&item.type==='factura');
    saveDraftFromInvoice(invoice||null);
    location.href=ADVANCED_URL;
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest('#addInvoice');
    if(add){event.preventDefault();event.stopImmediatePropagation();openNewInvoice();return;}
    const row=event.target.closest('[data-action^="edit-invoice:"]');
    if(row){event.preventDefault();event.stopImmediatePropagation();openInvoice(row.dataset.action.split(':')[1]);}
  },true);

  window.PYCRC1={openNewInvoice,openInvoice};
})();