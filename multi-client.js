(() => {
  const roleLabels = {
    principal: 'Principal', conyuge_1: 'Cónyuge 1', conyuge_2: 'Cónyuge 2',
    solicitante: 'Solicitante', cosolicitante: 'Cosolicitante', heredero: 'Heredero/a',
    socio: 'Socio/a', otro: 'Otro'
  };
  const roles = Object.keys(roleLabels);
  const clientIds = c => (c.participants || []).map(p => p.clientId);
  const caseClients = c => clientIds(c).map(id => state.clients.find(x => x.id === id)).filter(Boolean);
  const primaryClientId = c => (c.participants || []).find(p => p.isPrimary)?.clientId || (c.participants || [])[0]?.clientId || '';

  state.cases = (state.cases || []).map(c => {
    if (Array.isArray(c.participants) && c.participants.length) return c;
    return {...c, participants: c.clientId ? [{clientId:c.clientId, role:'principal', isPrimary:true}] : []};
  });
  localStorage.setItem(KEY, JSON.stringify(state));

  window.openCase = function(caseId='', clientId='') {
    if (!state.clients.length) return alert('Primero crea un cliente.');
    const found = state.cases.find(x => x.id === caseId);
    const c = found ? JSON.parse(JSON.stringify(found)) : {
      id:uid(), participants:clientId?[{clientId,role:'principal',isPrimary:true}]:[], name:'',
      code:'EXP-'+new Date().getFullYear()+'-'+String(state.cases.length+1).padStart(3,'0'),
      status:'abierto', opened:today(), notes:''
    };
    window._editingParticipants = c.participants.length ? c.participants : [{clientId:state.clients[0].id,role:'principal',isPrimary:true}];
    $('modal').innerHTML = `<div class="modal"><div class="sheet"><div class="sheet-head"><h3>${caseId?'Editar':'Nuevo'} expediente</h3><button class="btn ghost" onclick="closeModal()">Cerrar</button></div><div class="sheet-body"><div class="field"><label>Clientes / participantes</label><div id="participantRows"></div><button class="btn" style="width:100%" onclick="addParticipantRow()">+ Añadir participante</button></div><div class="field"><label>Nombre del caso</label><input id="eName" value="${esc(c.name)}" placeholder="Divorcio mutuo acuerdo"></div><div class="grid"><div class="field"><label>Código</label><input id="eCode" value="${esc(c.code)}"></div><div class="field"><label>Estado</label><select id="eStatus"><option ${c.status==='abierto'?'selected':''}>abierto</option><option ${c.status==='en espera'?'selected':''}>en espera</option><option ${c.status==='cerrado'?'selected':''}>cerrado</option></select></div></div><div class="field"><label>Notas</label><textarea id="eNotes">${esc(c.notes)}</textarea></div><div class="sheet-actions"><button class="btn primary" onclick="saveCase('${c.id}')">Guardar expediente</button></div></div></div></div>`;
    renderParticipantRows();
  };

  window.renderParticipantRows = function() {
    $('participantRows').innerHTML = (window._editingParticipants || []).map((p,i) => `<div style="display:grid;grid-template-columns:1fr 130px 42px;gap:8px;margin-bottom:10px"><select onchange="updateParticipant(${i},'clientId',this.value)">${state.clients.map(c=>`<option value="${c.id}" ${c.id===p.clientId?'selected':''}>${esc(c.name)}</option>`).join('')}</select><select onchange="updateParticipant(${i},'role',this.value)">${roles.map(r=>`<option value="${r}" ${r===p.role?'selected':''}>${roleLabels[r]}</option>`).join('')}</select><button class="btn danger" onclick="removeParticipantRow(${i})">×</button></div>`).join('');
  };
  window.addParticipantRow = function() {
    const used = new Set((window._editingParticipants||[]).map(p=>p.clientId));
    window._editingParticipants.push({clientId:state.clients.find(c=>!used.has(c.id))?.id||state.clients[0].id,role:'otro',isPrimary:false});
    renderParticipantRows();
  };
  window.removeParticipantRow = function(i) { window._editingParticipants.splice(i,1); renderParticipantRows(); };
  window.updateParticipant = function(i,k,v) { window._editingParticipants[i][k]=v; };

  window.saveCase = function(id) {
    let participants=(window._editingParticipants||[]).filter(p=>p.clientId);
    participants=participants.filter((p,i,a)=>a.findIndex(x=>x.clientId===p.clientId)===i);
    if(!participants.length) return alert('Añade al menos un cliente.');
    participants.forEach((p,i)=>p.isPrimary=i===0);
    const c={id,participants,name:$('eName').value.trim(),code:$('eCode').value.trim(),status:$('eStatus').value,opened:today(),notes:$('eNotes').value.trim()};
    if(!c.name) return alert('Indica el nombre del expediente.');
    const i=state.cases.findIndex(x=>x.id===id);
    if(i<0){state.cases.push(c);log('Expediente abierto',c.name)}else{state.cases[i]={...state.cases[i],...c};log('Expediente actualizado',c.name)}
    persist(); closeModal();
  };

  const originalRender = render;
  window.render = function() {
    originalRender();
    $('clientList').innerHTML=state.clients.map(c=>`<div class="row" onclick="openClientDetail('${c.id}')"><div><strong>${esc(c.name)}</strong><small>${esc(c.tax||'Sin NIF')} · ${state.cases.filter(x=>clientIds(x).includes(c.id)).length} expedientes</small></div><span>›</span></div>`).join('')||'<div class="empty">Añade el primer cliente.</div>';
    $('caseList').innerHTML=state.cases.map(c=>`<div class="row" onclick="openCaseDetail('${c.id}')"><div><strong>${esc(c.name)}</strong><small>${esc(caseClients(c).map(x=>x.name).join(' · ')||'Sin clientes')} · ${esc(c.code||'')} · ${state.documents.filter(x=>x.caseId===c.id).length} documentos</small></div><span class="pill ${c.status==='cerrado'?'':'ok'}">${esc(c.status)}</span></div>`).join('')||'<div class="empty">No hay expedientes.</div>';
  };

  window.openCaseDetail = function(id) {
    const c=state.cases.find(x=>x.id===id), docs=state.documents.filter(x=>x.caseId===id);
    const people=(c.participants||[]).map(p=>{const cl=state.clients.find(x=>x.id===p.clientId);return `<div class="row"><div><strong>${esc(cl?.name||'')}</strong><small>${esc(roleLabels[p.role]||p.role)}</small></div></div>`}).join('');
    $('modal').innerHTML=`<div class="modal"><div class="sheet"><div class="sheet-head"><h3>${esc(c.name)}</h3><button class="btn ghost" onclick="closeModal()">Cerrar</button></div><div class="sheet-body"><div class="label">${esc(c.code)}</div><div class="panel"><div class="panel-head"><h2>Clientes</h2></div><div class="list">${people}</div></div><div class="actions" style="margin-top:14px"><button class="btn primary" onclick="openDocument('','${primaryClientId(c)}','${c.id}')">Nuevo documento</button><button class="btn" onclick="openCase('${c.id}')">Editar expediente</button></div><div class="panel"><div class="panel-head"><h2>Cronología</h2></div><div class="sheet-body timeline">${docs.slice().reverse().map(d=>`<div class="event" onclick="previewDocument('${d.id}')"><strong>${esc(d.title||d.number)}</strong><small>${fmt(d.date)} · ${labelType(d.type)}</small></div>`).join('')||'<div class="empty">Sin documentos.</div>'}</div></div></div></div></div>`;
  };

  const oldRefresh = refreshCaseOptions;
  window.refreshCaseOptions = function(selected='') {
    const cid=$('dClient').value, cases=state.cases.filter(x=>clientIds(x).includes(cid));
    $('dCase').innerHTML='<option value="">Sin expediente</option>'+cases.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`).join('');
  };

  render();
})();
