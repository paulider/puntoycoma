(() => {
  'use strict';
  if (window.PYCRC1Dialogs) return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function ensureStyles(){
    if(document.getElementById('pycRcDialogStyles')) return;
    const style=document.createElement('style');
    style.id='pycRcDialogStyles';
    style.textContent=`.pyc-dialog-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(30,20,25,.38);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.pyc-dialog{width:min(440px,100%);background:#faf8f3;border:1px solid #ded6d1;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.25);overflow:hidden;color:#282125}.pyc-dialog__head{padding:20px 20px 12px}.pyc-dialog__head h3{margin:0;font:500 24px Georgia,serif}.pyc-dialog__body{padding:0 20px 20px;line-height:1.45;overflow-wrap:anywhere}.pyc-dialog__body pre{max-height:180px;overflow:auto;white-space:pre-wrap;background:#f2ece7;padding:10px;border-radius:10px;font-size:12px}.pyc-dialog__actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px 20px}.pyc-dialog__button{border:1px solid #ded6d1;background:#fff;color:#282125;border-radius:10px;min-height:44px;padding:10px 16px;font-weight:700}.pyc-dialog__button--primary{background:#6b1730;border-color:#6b1730;color:#fff}@media(max-width:520px){.pyc-dialog-backdrop{align-items:end;padding:0}.pyc-dialog{border-radius:22px 22px 0 0;width:100%}.pyc-dialog__actions{padding-bottom:calc(20px + env(safe-area-inset-bottom))}.pyc-dialog__button{flex:1}}`;
    document.head.appendChild(style);
  }
  function close(){document.getElementById('pycRcDialog')?.remove()}
  function show(message,{title='Punto y Coma',technical='',button='Entès'}={}){
    ensureStyles();close();
    const host=document.createElement('div');host.id='pycRcDialog';host.className='pyc-dialog-backdrop';host.innerHTML=`<section class="pyc-dialog" role="alertdialog" aria-modal="true"><div class="pyc-dialog__head"><h3>${esc(title)}</h3></div><div class="pyc-dialog__body"><div>${esc(message).replace(/\n/g,'<br>')}</div>${technical?`<pre>${esc(technical)}</pre>`:''}</div><div class="pyc-dialog__actions"><button class="pyc-dialog__button pyc-dialog__button--primary">${esc(button)}</button></div></section>`;
    host.querySelector('button').onclick=close;host.addEventListener('click',event=>{if(event.target===host)close()});document.body.appendChild(host);host.querySelector('button').focus();
  }
  const nativeAlert=window.alert.bind(window);
  window.alert=message=>{try{show(String(message??''))}catch{nativeAlert(message)}};
  window.addEventListener('error',event=>show('S’ha produït un error en aquest mòdul.',{title:'Error tècnic',technical:`${event.message||'Error'}\n${event.filename||''}:${event.lineno||''}:${event.colno||''}`}));
  window.addEventListener('unhandledrejection',event=>show('No s’ha pogut completar l’operació.',{title:'Error tècnic',technical:String(event.reason?.stack||event.reason||'Promise rejection')}));
  window.PYCRC1Dialogs={show,close};
})();