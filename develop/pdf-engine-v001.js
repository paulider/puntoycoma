(() => {
  'use strict';
  if (window.PYCPDF) return;

  const STATE_KEY='pyc_office_v2';
  const DRAFT_KEY='pyc_invoice_advanced_i18n_draft_v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const date=value=>value?new Date(value).toLocaleDateString('es-ES'):new Date().toLocaleDateString('es-ES');

  function loadState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{settings:{},clients:[],cases:[],documents:[],provisions:[]};}
    catch{return{settings:{},clients:[],cases:[],documents:[],provisions:[]};}
  }

  function resolveRecord(id){
    const state=loadState();
    return state.documents?.find(item=>item.id===id)||state.provisions?.find(item=>item.id===id)||null;
  }

  function resolveContext(record){
    const state=loadState();
    const matter=state.cases?.find(item=>item.id===record.caseId)||null;
    const participantId=matter?.participants?.[0]?.clientId;
    const client=state.clients?.find(item=>item.id===participantId)||null;
    return{state,matter,client,settings:state.settings||{}};
  }

  function invoiceHtml(record,ctx){
    const lines=record.lines||[];
    return`<section class="doc"><header class="doc-head"><div><div class="brand">PUNTO Y COMA</div><div class="sub">LEGAL OFFICE</div></div><div class="doc-title"><h1>FACTURA</h1><strong>${esc(record.number||'Borrador')}</strong></div></header><div class="rule"></div><section class="parties"><div><small>DE</small><strong>${esc(ctx.settings.name||'Punto y Coma')}</strong><span>${esc(ctx.settings.tax||'')}</span><span>${esc(ctx.settings.address||'')}</span></div><div><small>PARA</small><strong>${esc(ctx.client?.name||'Cliente')}</strong><span>${esc(ctx.client?.tax||'')}</span><span>${esc(ctx.matter?.name||'')}</span></div></section><table><thead><tr><th>Concepto</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${esc(line.concept||'')}</td><td>${esc(line.description||'')}</td><td class="num">${Number(line.qty||1)}</td><td class="num">${money(line.price||0)}</td><td class="num">${money(Number(line.qty||1)*Number(line.price||0)*(1-Number(line.discount||0)/100))}</td></tr>`).join('')}</tbody></table><section class="totals"><div><span>Base imponible</span><strong>${money(record.base||0)}</strong></div><div><span>IVA</span><strong>${money(record.vat||0)}</strong></div><div class="grand"><span>Total</span><strong>${money(record.total||0)}</strong></div></section><footer><span>${esc(ctx.settings.email||'')}</span><span>${esc(ctx.settings.iban||'')}</span><span>Emitida ${date(record.updatedAt||record.createdAt)}</span></footer></section>`;
  }

  function provisionHtml(record,ctx){
    return`<section class="doc"><header class="doc-head"><div><div class="brand">PUNTO Y COMA</div><div class="sub">LEGAL OFFICE</div></div><div class="doc-title"><h1>PROVISIÓN DE FONDOS</h1></div></header><div class="rule"></div><section class="kv"><div><small>Expediente</small><strong>${esc(ctx.matter?.name||'')}</strong></div><div><small>Cliente</small><strong>${esc(ctx.client?.name||'')}</strong></div><div><small>Fecha</small><strong>${date(record.createdAt)}</strong></div><div><small>Estado</small><strong>${esc(record.status||'pendiente')}</strong></div></section><section class="amount-card"><small>Importe solicitado</small><strong>${money(record.requestedAmount||0)}</strong></section><section class="kv"><div><small>Importe cobrado</small><strong>${money(record.paidAmount||0)}</strong></div><div><small>Importe aplicado</small><strong>${money(record.appliedAmount||0)}</strong></div><div><small>Saldo disponible</small><strong>${money(record.availableAmount||0)}</strong></div></section>${record.notes?`<section class="note"><small>Observaciones</small><p>${esc(record.notes)}</p></section>`:''}<footer><span>${esc(ctx.settings.name||'Punto y Coma')}</span><span>${esc(ctx.settings.email||'')}</span></footer></section>`;
  }

  function genericHtml(record,ctx){
    const title=record.title||record.name||record.type||'Documento';
    const body=record.content||record.description||record.notes||'';
    return`<section class="doc"><header class="doc-head"><div><div class="brand">PUNTO Y COMA</div><div class="sub">LEGAL OFFICE</div></div><div class="doc-title"><h1>${esc(title)}</h1></div></header><div class="rule"></div><section class="kv"><div><small>Expediente</small><strong>${esc(ctx.matter?.name||'')}</strong></div><div><small>Cliente</small><strong>${esc(ctx.client?.name||'')}</strong></div><div><small>Fecha</small><strong>${date(record.updatedAt||record.createdAt)}</strong></div><div><small>Idioma</small><strong>${esc(record.language||'ca')}</strong></div></section><article class="content">${esc(body).replace(/\n/g,'<br>')}</article><footer><span>${esc(ctx.settings.name||'Punto y Coma')}</span><span>${esc(ctx.settings.email||'')}</span></footer></section>`;
  }

  function buildHtml(record){
    const ctx=resolveContext(record);
    const content=record.type==='factura'||record.type==='invoice'?invoiceHtml(record,ctx):record.requestedAmount!==undefined||record.type==='provision'?provisionHtml(record,ctx):genericHtml(record,ctx);
    return`<!doctype html><html><head><meta charset="utf-8"><title>${esc(record.number||record.title||record.name||'Documento')}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#282125;font-family:Arial,Helvetica,sans-serif}.doc{width:210mm;min-height:297mm;padding:18mm 17mm 15mm;margin:auto;position:relative}.doc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.brand{font:600 22px Georgia,serif;letter-spacing:.12em;color:#6b1730}.sub{font-size:8px;letter-spacing:.35em;color:#9b8473;margin-top:7px}.doc-title{text-align:right}.doc-title h1{margin:0;font:500 23px Georgia,serif;letter-spacing:.12em}.doc-title strong{display:block;margin-top:8px;color:#9b8473}.rule{border-top:1px solid #ded6d1;margin:12mm 0 9mm}.parties,.kv{display:grid;grid-template-columns:1fr 1fr;gap:15mm;margin-bottom:10mm}.parties div,.kv div{display:grid;gap:4px}.parties small,.kv small,.note small,.amount-card small{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#9b8473}.parties strong,.kv strong{font-size:11px}.parties span{font-size:9px;color:#655b5f}.amount-card{background:#f3ede8;padding:18px;border-left:4px solid #6b1730;margin:12mm 0}.amount-card strong{display:block;margin-top:8px;font:700 28px Georgia,serif;color:#6b1730}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f6f2ee;text-transform:uppercase;letter-spacing:.12em;font-size:7px;color:#5c5055}th,td{padding:10px 8px;border-bottom:1px solid #e7e0dc;text-align:left}.num{text-align:right}.totals{width:42%;margin:10mm 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:7px 10px;font-size:10px}.totals .grand{background:#f3ede8;color:#6b1730;font:700 16px Georgia,serif}.note{border-left:2px solid #b7a08d;padding-left:12px;margin-top:12mm}.note p,.content{font-size:10px;line-height:1.65}.content{min-height:120mm}footer{position:absolute;left:17mm;right:17mm;bottom:12mm;border-top:1px solid #ded6d1;padding-top:6mm;display:flex;justify-content:space-between;gap:12px;font-size:7px;color:#9b8473;letter-spacing:.08em}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.doc{margin:0}}</style></head><body>${content}<script>window.onload=()=>setTimeout(()=>window.print(),120);<\/script></body></html>`;
  }

  function printRecord(recordOrId){
    const record=typeof recordOrId==='string'?resolveRecord(recordOrId):recordOrId;
    if(!record){window.alert?.('No se ha encontrado el documento.');return false;}
    const popup=window.open('','_blank','noopener,noreferrer');
    if(!popup){window.alert?.('El navegador ha bloqueado la ventana de impresión.');return false;}
    popup.document.open();popup.document.write(buildHtml(record));popup.document.close();
    return true;
  }

  function printCurrentInvoiceDraft(){
    let draft=null;try{draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{}
    if(!draft)return false;
    const totals=(draft.lines||[]).reduce((acc,line)=>{const gross=Number(line.qty||1)*Number(line.price||0);const base=gross*(1-Number(line.discount||0)/100);const vat=base*Number(line.vat||0)/100;acc.base+=base;acc.vat+=vat;acc.total+=base+vat;return acc},{base:0,vat:0,total:0});
    return printRecord({...draft,type:'factura',number:draft.number||'Borrador',...totals});
  }

  function installButtons(){
    const docHead=[...document.querySelectorAll('.head')].find(head=>head.querySelector('h2')?.textContent?.toLowerCase().includes('document'));
    if(docHead&&!document.getElementById('pycPrintCurrentDocument')){const button=document.createElement('button');button.id='pycPrintCurrentDocument';button.className='btn primary';button.textContent='Crear PDF';button.onclick=()=>{const preview=document.getElementById('docPreview');if(preview){const stored=JSON.parse(localStorage.getItem('pyc_document_demo_v1')||'null');if(stored)return printRecord(stored)}window.alert?.('No hay un documento activo.');};docHead.appendChild(button)}
    document.querySelectorAll('[data-action^="edit-invoice:"],[data-action^="edit-provision:"]').forEach(row=>{if(row.querySelector('.pyc-pdf-inline'))return;const id=row.dataset.action.split(':')[1],button=document.createElement('button');button.className='btn pyc-pdf-inline';button.textContent='PDF';button.style.marginLeft='8px';button.onclick=event=>{event.preventDefault();event.stopPropagation();printRecord(id)};row.appendChild(button)});
  }

  document.addEventListener('click',event=>{const action=event.target.closest('[data-pdf-id]');if(action){event.preventDefault();printRecord(action.dataset.pdfId)}});
  const observer=new MutationObserver(()=>installButtons());observer.observe(document.documentElement,{subtree:true,childList:true});
  installButtons();
  window.PYCPDF={printRecord,printCurrentInvoiceDraft,buildHtml,installButtons};
})();