(() => {
  'use strict';
  if (window.PYCDocumentRenderer) return;

  const STATE_KEY='pyc_office_v2';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const fmtDate=value=>value?new Date(value).toLocaleDateString('es-ES'):new Date().toLocaleDateString('es-ES');

  function loadState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{settings:{},clients:[],cases:[],documents:[],provisions:[]};}
    catch{return{settings:{},clients:[],cases:[],documents:[],provisions:[]};}
  }

  function context(record){
    const state=loadState();
    const matter=state.cases?.find(item=>item.id===record.caseId)||null;
    const clientId=matter?.participants?.[0]?.clientId;
    const client=state.clients?.find(item=>item.id===clientId)||null;
    return{state,matter,client,settings:state.settings||{}};
  }

  function shell(title,body,ctx,options={}){
    return`<article class="pyc-document" data-document-type="${esc(options.type||'generic')}"><header class="pyc-document__header"><div><div class="pyc-document__brand">PUNTO Y COMA</div><div class="pyc-document__subbrand">LEGAL OFFICE</div></div><div class="pyc-document__title"><h1>${esc(title)}</h1>${options.number?`<strong>${esc(options.number)}</strong>`:''}</div></header><div class="pyc-document__rule"></div>${body}<footer class="pyc-document__footer"><span>${esc(ctx.settings.name||'Punto y Coma')}</span><span>${esc(ctx.settings.email||'')}</span><span>${esc(ctx.settings.iban||'')}</span></footer></article>`;
  }

  function invoice(record,ctx){
    const lines=record.lines||[];
    const rows=lines.map(line=>`<tr><td>${esc(line.concept||'')}</td><td>${esc(line.description||'')}</td><td class="num">${Number(line.qty||1)}</td><td class="num">${money(line.price||0)}</td><td class="num">${money(Number(line.qty||1)*Number(line.price||0)*(1-Number(line.discount||0)/100))}</td></tr>`).join('');
    const body=`<section class="pyc-parties"><div><small>DE</small><strong>${esc(ctx.settings.name||'Punto y Coma')}</strong><span>${esc(ctx.settings.tax||'')}</span><span>${esc(ctx.settings.address||'')}</span></div><div><small>PARA</small><strong>${esc(ctx.client?.name||'Cliente')}</strong><span>${esc(ctx.client?.tax||'')}</span><span>${esc(ctx.matter?.name||'')}</span></div></section><table class="pyc-table"><thead><tr><th>Concepto</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Sin líneas</td></tr>'}</tbody></table><section class="pyc-totals"><div><span>Base imponible</span><strong>${money(record.base||0)}</strong></div><div><span>IVA</span><strong>${money(record.vat||0)}</strong></div><div class="grand"><span>Total</span><strong>${money(record.total||0)}</strong></div></section>`;
    return shell('FACTURA',body,ctx,{type:'invoice',number:record.number||'Borrador'});
  }

  function provision(record,ctx){
    const body=`<section class="pyc-kv"><div><small>Expediente</small><strong>${esc(ctx.matter?.name||'')}</strong></div><div><small>Cliente</small><strong>${esc(ctx.client?.name||'')}</strong></div><div><small>Fecha</small><strong>${fmtDate(record.createdAt)}</strong></div><div><small>Estado</small><strong>${esc(record.status||'pendiente')}</strong></div></section><section class="pyc-amount"><small>Importe solicitado</small><strong>${money(record.requestedAmount||0)}</strong></section><section class="pyc-kv"><div><small>Cobrado</small><strong>${money(record.paidAmount||0)}</strong></div><div><small>Aplicado</small><strong>${money(record.appliedAmount||0)}</strong></div><div><small>Disponible</small><strong>${money(record.availableAmount||0)}</strong></div></section>${record.notes?`<section class="pyc-note"><small>Observaciones</small><p>${esc(record.notes)}</p></section>`:''}`;
    return shell('PROVISIÓN DE FONDOS',body,ctx,{type:'provision'});
  }

  function generic(record,ctx){
    const title=record.title||record.name||record.type||'Documento';
    const bodyText=record.content||record.description||record.notes||'';
    const body=`<section class="pyc-kv"><div><small>Expediente</small><strong>${esc(ctx.matter?.name||'')}</strong></div><div><small>Cliente</small><strong>${esc(ctx.client?.name||'')}</strong></div><div><small>Fecha</small><strong>${fmtDate(record.updatedAt||record.createdAt)}</strong></div><div><small>Idioma</small><strong>${esc(record.language||'ca')}</strong></div></section><section class="pyc-content">${esc(bodyText).replace(/\n/g,'<br>')}</section>`;
    return shell(title,body,ctx,{type:'generic',number:record.number||''});
  }

  function render(record){
    if(!record)throw new Error('Document record is required');
    const ctx=context(record);
    if(record.type==='factura'||record.type==='invoice')return invoice(record,ctx);
    if(record.requestedAmount!==undefined||record.type==='provision')return provision(record,ctx);
    return generic(record,ctx);
  }

  function styles(){
    return`.pyc-document{width:210mm;min-height:297mm;padding:18mm 17mm 15mm;margin:auto;background:#fff;color:#282125;font-family:Arial,Helvetica,sans-serif;position:relative}.pyc-document__header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.pyc-document__brand{font:600 22px Georgia,serif;letter-spacing:.12em;color:#6b1730}.pyc-document__subbrand{font-size:8px;letter-spacing:.35em;color:#9b8473;margin-top:7px}.pyc-document__title{text-align:right}.pyc-document__title h1{margin:0;font:500 23px Georgia,serif;letter-spacing:.12em}.pyc-document__title strong{display:block;margin-top:8px;color:#9b8473}.pyc-document__rule{border-top:1px solid #ded6d1;margin:12mm 0 9mm}.pyc-parties,.pyc-kv{display:grid;grid-template-columns:1fr 1fr;gap:15mm;margin-bottom:10mm}.pyc-parties div,.pyc-kv div{display:grid;gap:4px}.pyc-parties small,.pyc-kv small,.pyc-note small,.pyc-amount small{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#9b8473}.pyc-parties strong,.pyc-kv strong{font-size:11px}.pyc-parties span{font-size:9px;color:#655b5f}.pyc-table{width:100%;border-collapse:collapse;font-size:9px}.pyc-table th{background:#f6f2ee;text-transform:uppercase;letter-spacing:.12em;font-size:7px;color:#5c5055}.pyc-table th,.pyc-table td{padding:10px 8px;border-bottom:1px solid #e7e0dc;text-align:left}.pyc-table .num{text-align:right}.pyc-totals{width:42%;margin:10mm 0 0 auto}.pyc-totals div{display:flex;justify-content:space-between;padding:7px 10px;font-size:10px}.pyc-totals .grand{background:#f3ede8;color:#6b1730;font:700 16px Georgia,serif}.pyc-amount{background:#f3ede8;padding:18px;border-left:4px solid #6b1730;margin:12mm 0}.pyc-amount strong{display:block;margin-top:8px;font:700 28px Georgia,serif;color:#6b1730}.pyc-note{border-left:2px solid #b7a08d;padding-left:12px;margin-top:12mm}.pyc-note p,.pyc-content{font-size:10px;line-height:1.65}.pyc-content{min-height:120mm}.pyc-document__footer{position:absolute;left:17mm;right:17mm;bottom:12mm;border-top:1px solid #ded6d1;padding-top:6mm;display:flex;justify-content:space-between;gap:12px;font-size:7px;color:#9b8473;letter-spacing:.08em}`;
  }

  window.PYCDocumentRenderer={render,styles,context};
})();