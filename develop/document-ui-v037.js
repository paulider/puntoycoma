(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const LANG=window.PYCDocumentLanguage;
  const STORAGE='pyc_document_demo_v1';
  const defaultDoc=()=>({id:'doc-demo-1',type:'invoice',number:'F-2026-001',language:LANG.getDefaultDocumentLanguage(),copyOverrides:{},client:'Anna Garcia',date:new Date().toISOString().slice(0,10),base:500,vat:105,total:605,lines:[{concept:'Conveni regulador',description:'Redacció i revisió del document',qty:1,price:500}]});
  const load=()=>{try{return LANG.ensureDocumentLanguage(JSON.parse(localStorage.getItem(STORAGE)||'null')||defaultDoc())}catch{return defaultDoc()}};
  const save=doc=>localStorage.setItem(STORAGE,JSON.stringify(doc));
  let doc=load();
  const text=key=>LANG.getDocumentText(doc.type,doc.language,key,doc);
  function renderPreview(){
    $('docLanguage').value=doc.language;
    $('copyLanguage').value=doc.language;
    $('manualTitle').value=doc.copyOverrides.title||'';
    $('manualNote').value=doc.copyOverrides.defaultNote||'';
    $('docPreview').innerHTML=`<div class="invoice-card"><div class="invoice-top"><div><div class="invoice-brand">PUNTO Y COMA</div><div class="invoice-sub">LEGAL OFFICE</div></div><div class="invoice-title"><h1>${text('title')}</h1><div>${doc.number}</div></div></div><div class="invoice-meta"><span>${text('issueDate')}</span><strong>${doc.date}</strong></div><div class="invoice-client"><small>CLIENT</small><strong>${doc.client}</strong></div><table><thead><tr><th>${text('concept')}</th><th>${text('description')}</th><th>${text('qty')}</th><th>${text('unitPrice')}</th><th>${text('amount')}</th></tr></thead><tbody>${doc.lines.map(l=>`<tr><td>${l.concept}</td><td>${l.description}</td><td>${l.qty}</td><td>${l.price.toFixed(2)} €</td><td>${(l.qty*l.price).toFixed(2)} €</td></tr>`).join('')}</tbody></table><div class="totals"><div><span>${text('taxBase')}</span><strong>${doc.base.toFixed(2)} €</strong></div><div><span>${text('vat')}</span><strong>${doc.vat.toFixed(2)} €</strong></div><div class="grand"><span>${text('total')}</span><strong>${doc.total.toFixed(2)} €</strong></div></div><div class="note"><small>${text('noteTitle')}</small><p>${text('defaultNote')}</p></div></div>`;
  }
  function updateLanguage(value){doc=LANG.setDocumentLanguage(doc,value);save(doc);renderPreview()}
  function updateOverride(key,value){LANG.setCopyOverride(doc,key,value);save(doc);renderPreview()}
  function generateCopy(){const copy=LANG.cloneDocumentInLanguage(doc,$('copyLanguage').value,{keepOverrides:false});const copies=JSON.parse(localStorage.getItem('pyc_document_copies_v1')||'[]');copies.push(copy);localStorage.setItem('pyc_document_copies_v1',JSON.stringify(copies));$('copyStatus').textContent=`${LANG.LANGUAGE_LABELS[copy.language]} · ${copy.number} · ${new Date(copy.generatedAt).toLocaleTimeString()}`;$('copyStatus').className='status ok'}
  $('docLanguage').addEventListener('change',e=>updateLanguage(e.target.value));
  $('manualTitle').addEventListener('input',e=>updateOverride('title',e.target.value));
  $('manualNote').addEventListener('input',e=>updateOverride('defaultNote',e.target.value));
  $('resetTitle').addEventListener('click',()=>{LANG.setCopyOverride(doc,'title','');save(doc);renderPreview()});
  $('resetNote').addEventListener('click',()=>{LANG.setCopyOverride(doc,'defaultNote','');save(doc);renderPreview()});
  $('generateCopy').addEventListener('click',generateCopy);
  window.PYCDocUI={renderPreview};
  renderPreview();
})();