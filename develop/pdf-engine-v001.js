(() => {
  'use strict';
  if (window.PYCPDF) return;

  const STATE_KEY='pyc_office_v2';
  const DRAFT_KEY='pyc_invoice_advanced_i18n_draft_v1';

  function loadState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{documents:[],provisions:[]};}
    catch{return{documents:[],provisions:[]};}
  }

  function resolveRecord(id){
    const state=loadState();
    return state.documents?.find(item=>item.id===id)||state.provisions?.find(item=>item.id===id)||null;
  }

  function renderer(){
    if(!window.PYCDocumentRenderer)throw new Error('Document Renderer no está cargado.');
    return window.PYCDocumentRenderer;
  }

  function buildHtml(record){
    const r=renderer();
    const title=record.number||record.title||record.name||'Documento';
    return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(title).replace(/[<>]/g,'')}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}${r.styles()}@media print{.pyc-document{margin:0}}</style></head><body>${r.render(record)}<script>window.onload=()=>setTimeout(()=>window.print(),180);<\/script></body></html>`;
  }

  function printRecord(recordOrId){
    const record=typeof recordOrId==='string'?resolveRecord(recordOrId):recordOrId;
    if(!record){window.alert?.('No se ha encontrado el documento.');return false;}
    let popup=null;
    try{popup=window.open('','_blank')}catch{}
    if(!popup){window.alert?.('El navegador ha bloqueado la ventana de impresión. Activa las ventanas emergentes para este sitio.');return false;}
    popup.document.open();popup.document.write(buildHtml(record));popup.document.close();
    return true;
  }

  function printCurrentInvoiceDraft(){
    let draft=null;
    try{draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{}
    if(!draft)return false;
    const totals=(draft.lines||[]).reduce((acc,line)=>{
      const gross=Number(line.qty||1)*Number(line.price||0);
      const base=gross*(1-Number(line.discount||0)/100);
      const vat=base*Number(line.vat||0)/100;
      acc.base+=base;acc.vat+=vat;acc.total+=base+vat;return acc;
    },{base:0,vat:0,total:0});
    return printRecord({...draft,type:'factura',number:draft.number||'Borrador',...totals});
  }

  function renderPreview(recordOrId,target){
    const record=typeof recordOrId==='string'?resolveRecord(recordOrId):recordOrId;
    const targetElement=typeof target==='string'?document.querySelector(target):target;
    if(!record||!targetElement)return false;
    const r=renderer();
    if(!document.getElementById('pycDocumentRendererStyles')){
      const style=document.createElement('style');style.id='pycDocumentRendererStyles';style.textContent=r.styles()+'.pyc-preview-stage{overflow:auto;background:#e9e4df;padding:12px;border-radius:14px}.pyc-preview-stage .pyc-document{transform-origin:top left}';document.head.appendChild(style);
    }
    targetElement.classList.add('pyc-preview-stage');
    targetElement.innerHTML=r.render(record);
    return true;
  }

  function installButtons(){
    const docHead=[...document.querySelectorAll('.head')].find(head=>head.querySelector('h2')?.textContent?.toLowerCase().includes('document'));
    if(docHead&&!document.getElementById('pycPrintCurrentDocument')){
      const button=document.createElement('button');button.id='pycPrintCurrentDocument';button.className='btn primary';button.textContent='Crear PDF';
      button.onclick=()=>{let stored=null;try{stored=JSON.parse(localStorage.getItem('pyc_document_demo_v1')||'null')}catch{}if(stored)return printRecord(stored);window.alert?.('No hay un documento activo.');};
      docHead.appendChild(button);
    }
    document.querySelectorAll('[data-action^="edit-invoice:"],[data-action^="edit-provision:"]').forEach(row=>{
      if(row.querySelector('.pyc-pdf-inline'))return;
      const id=row.dataset.action.split(':')[1],button=document.createElement('button');
      button.className='btn pyc-pdf-inline';button.textContent='PDF';button.style.marginLeft='8px';
      button.onclick=event=>{event.preventDefault();event.stopPropagation();printRecord(id)};
      row.appendChild(button);
    });
  }

  document.addEventListener('click',event=>{const action=event.target.closest('[data-pdf-id]');if(action){event.preventDefault();printRecord(action.dataset.pdfId)}});
  const observer=new MutationObserver(()=>installButtons());observer.observe(document.documentElement,{subtree:true,childList:true});
  installButtons();
  window.PYCPDF={printRecord,printCurrentInvoiceDraft,renderPreview,buildHtml,installButtons};
})();