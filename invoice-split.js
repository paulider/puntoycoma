(() => {
  const originalOpenDocument = window.openDocument;

  function participantsForCase(caseId) {
    const currentCase = state.cases.find(item => item.id === caseId);
    if (!currentCase) return [];
    const participants = currentCase.participants || (currentCase.clientId ? [{clientId: currentCase.clientId, role:'principal', isPrimary:true}] : []);
    return participants.map(item => ({
      ...item,
      client: state.clients.find(client => client.id === item.clientId)
    })).filter(item => item.client);
  }

  function openSplitDialog(caseId) {
    const currentCase = state.cases.find(item => item.id === caseId);
    const participants = participantsForCase(caseId);
    if (!currentCase || !participants.length) return originalOpenDocument('', '', caseId);

    window._invoiceSplitContext = { caseId, participants };
    $('modal').innerHTML = `<div class="modal"><div class="sheet"><div class="sheet-head"><h3>Com facturarem aquest expedient?</h3><button class="btn ghost" onclick="closeModal()">Tancar</button></div><div class="sheet-body"><div class="label">${esc(currentCase.name)}</div><p style="color:var(--muted);line-height:1.55">Per defecte, els honoraris es reparteixen entre tots els participants, però pots escollir una altra opció abans de crear la factura.</p><div class="field"><label>Opció de facturació</label><select id="splitMode" onchange="renderSplitEditor()"><option value="equal">Repartiment igualitari entre tots</option><option value="single">Un únic pagador</option><option value="percent">Percentatges personalitzats</option><option value="amount">Imports manuals</option></select></div><div id="splitEditor"></div><div class="sheet-actions"><button class="btn primary" onclick="continueInvoiceSplit()">Continuar</button><button class="btn" onclick="closeModal()">Cancel·lar</button></div></div></div></div>`;
    renderSplitEditor();
  }

  window.renderSplitEditor = function() {
    const ctx = window._invoiceSplitContext;
    if (!ctx) return;
    const mode = $('splitMode').value;
    let html = '';
    if (mode === 'equal') {
      html = `<div class="backup-status ok">Es crearà una factura separada per a cada participant amb el mateix percentatge: ${(100 / ctx.participants.length).toFixed(2)}% cadascun.</div>`;
    } else if (mode === 'single') {
      html = `<div class="field"><label>Pagador</label><select id="singlePayer">${ctx.participants.map(p => `<option value="${p.clientId}">${esc(p.client.name)}</option>`).join('')}</select></div>`;
    } else if (mode === 'percent') {
      html = ctx.participants.map((p,index) => `<div class="grid"><div class="field"><label>${esc(p.client.name)}</label><input value="${index === ctx.participants.length - 1 ? 100 - Math.floor(100 / ctx.participants.length) * (ctx.participants.length - 1) : Math.floor(100 / ctx.participants.length)}" type="number" min="0" max="100" step="0.01" class="split-percent"></div><div class="field"><label>Percentatge</label><input value="%" disabled></div></div>`).join('');
    } else {
      html = `<div class="backup-status warn">Indicarem l'import de cada participant després d'introduir la base total de la factura.</div>` + ctx.participants.map(p => `<div class="field"><label>${esc(p.client.name)}</label><input type="number" min="0" step="0.01" value="0" class="split-amount"></div>`).join('');
    }
    $('splitEditor').innerHTML = html;
  };

  window.continueInvoiceSplit = function() {
    const ctx = window._invoiceSplitContext;
    const mode = $('splitMode').value;
    let allocations = [];

    if (mode === 'equal') {
      const share = 100 / ctx.participants.length;
      allocations = ctx.participants.map(p => ({clientId:p.clientId, percent:share}));
    }
    if (mode === 'single') {
      const payer = $('singlePayer').value;
      allocations = ctx.participants.map(p => ({clientId:p.clientId, percent:p.clientId === payer ? 100 : 0}));
    }
    if (mode === 'percent') {
      const values = [...document.querySelectorAll('.split-percent')].map(input => Number(input.value) || 0);
      const total = values.reduce((sum,value) => sum + value, 0);
      if (Math.abs(total - 100) > 0.01) return alert('Els percentatges han de sumar 100%.');
      allocations = ctx.participants.map((p,index) => ({clientId:p.clientId, percent:values[index]}));
    }
    if (mode === 'amount') {
      const values = [...document.querySelectorAll('.split-amount')].map(input => Number(input.value) || 0);
      allocations = ctx.participants.map((p,index) => ({clientId:p.clientId, amount:values[index]}));
    }

    window._pendingInvoiceSplit = {mode, caseId:ctx.caseId, allocations};
    const firstPayer = allocations.find(item => (item.percent || 0) > 0 || (item.amount || 0) > 0) || allocations[0];
    originalOpenDocument('', firstPayer?.clientId || ctx.participants[0].clientId, ctx.caseId);

    setTimeout(() => {
      const typeSelect = $('dType');
      if (typeSelect) {
        typeSelect.value = 'factura';
        toggleMoney();
      }
      const note = $('dBody');
      if (note && !note.value) note.value = 'Factura vinculada a un expedient amb diversos participants.';
    }, 0);
  };

  window.openDocument = function(docId='', clientId='', caseId='') {
    if (!docId && caseId) {
      const participants = participantsForCase(caseId);
      if (participants.length > 1) return openSplitDialog(caseId);
    }
    return originalOpenDocument(docId, clientId, caseId);
  };

  const originalSaveDocument = window.saveDocument;
  window.saveDocument = function(id) {
    const pending = window._pendingInvoiceSplit;
    originalSaveDocument(id);
    if (!pending) return;
    const saved = state.documents.find(item => item.id === id);
    if (!saved) return;
    saved.billingSplit = pending;
    saved.caseId = pending.caseId;
    localStorage.setItem(KEY, JSON.stringify(state));
    window._pendingInvoiceSplit = null;
    render();
  };
})();
