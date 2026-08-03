(() => {
  'use strict';
  const STATE_KEY='pyc_office_v2';
  const DRAFT_KEY='pyc_invoice_rc2_draft';
  const ADVANCED_URL='invoice-rc2.html?build=rc2-main';

  function loadState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{documents:[],cases:[]};}
    catch{return{documents:[],cases:[]};}
  }

  function saveDraftFromInvoice(invoice){
    const language=invoice?.language||localStorage.getItem('pyc_language_v1')||'ca';
    const lines=(invoice?.lines||[]).map(line=>({
      id:line.id||crypto.randomUUID?.()||String(Date.now()),
      concept:line.concept||'',
      description:line.description||'',
      qty:line.qty??1,
      price:line.price??0,
      vat:line.vat??line.vatRate??21,
      discount:line.discount??0
    }));
    const draft={
      invoiceId:invoice?.id||null,
      caseId:invoice?.caseId||loadState().cases?.[0]?.id||'',
      status:invoice?.status||'esborrany',
      language,
      lines:lines.length?lines:[{id:crypto.randomUUID?.()||String(Date.now()),concept:'',description:'',qty:1,price:0,vat:21,discount:0}],
      allocations:(invoice?.allocations||[]).map(item=>({
        clientId:item.clientId,
        enabled:item.enabled!==false,
        mode:item.mode||'percent',
        value:item.value??0
      }))
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