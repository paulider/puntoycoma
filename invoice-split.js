(() => {
  const originalOpenDocument = window.openDocument;
  const originalSaveDocument = window.saveDocument;

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

    window._invoiceSplitContext = {caseId, participants};
    $('modal').innerHTML = `<div class="modal"><div class="sheet"><div class="sheet-head"><h3>Com facturarem aquest expedient?</h3><button class="btn ghost" onclick="closeModal()">Tancar</button></div><div class="sheet-body"><div class="label">${esc(currentCase.name)}</div><p style="color:var(--muted);line-height:1.55">Cada vegada que generis una factura podràs decidir com es reparteix. Aquesta elecció només afectarà aquesta factura.</p><div class="field"><label>Opció de facturació</label><select id="splitMode" onchange="renderSplitEditor()"><option value="equal">Repartiment igualitari entre tots</option><option value="single">Un únic pagador</option><option value="percent">Percentatges personalitzats</option><option value="amount">Imports manuals</option></select></div><div id="splitEditor"></div><div class="sheet-actions"><button class="btn primary" onclick="continueInvoiceSplit()">Continuar</button><button class="btn" onclick="closeModal()">Cancel·lar</button></div></div></div></div>`;
    renderSplitEditor();
  }

  window.renderSplitEditor = function() {
    const ctx = window._invoiceSplitContext;
    if (!ctx) return;
    const mode = $('splitMode').value;
    let html = '';
    if (mode === 'equal') {
      html = `<div class="backup-status ok">Es generarà una factura separada per a cada participant amb el mateix percentatge: ${(100 / ctx.participants.length).toFixed(2)}% cadascun.</div>`;
    } else if (mode === 'single') {
      html = `<div class="field"><label>Pagador</label><select id="singlePayer">${ctx.participants.map(p => `<option value="${p.clientId}">${esc(p.client.name)}</option>`).join('')}</select></div>`;
    } else if (mode === 'percent') {
      const base = Math.floor((100 / ctx.participants.length) * 100) / 100;
      html = ctx.participants.map((p,index) => {
        const value = index === ctx.participants.length - 1 ? (100 - base * (ctx.participants.length - 1)).toFixed(2) : base.toFixed(2);
        return `<div class="field"><label>${esc(p.client.name)} (%)</label><input value="${value}" type="number" min="0" max="100" step="0.01" class="split-percent"></div>`;
      }).join('');
    } else {
      html = `<div class="backup-status warn">Introdueix l'import total que assumirà cada participant. La suma haurà de coincidir amb la base de la factura.</div>` + ctx.participants.map(p => `<div class="field"><label>${esc(p.client.name)} (€)</label><input type="number" min="0" step="0.01" value="0" class="split-amount"></div>`).join('');
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
    } else if (mode === 'single') {
      const payer = $('singlePayer').value;
      allocations = ctx.participants.map(p => ({clientId:p.clientId, percent:p.clientId === payer ? 100 : 0}));
    } else if (mode === 'percent') {
      const values = [...document.querySelectorAll('.split-percent')].map(input => Number(input.value) || 0);
      const total = values.reduce((sum,value) => sum + value, 0);
      if (Math.abs(total - 100) > 0.01) return alert('Els percentatges han de sumar 100%.');
      allocations = ctx.participants.map((p,index) => ({clientId:p.clientId, percent:values[index]}));
    } else {
      const values = [...document.querySelectorAll('.split-amount')].map(input => Number(input.value) || 0);
      if (!values.some(value => value > 0)) return alert('Indica almenys un import superior a 0.');
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

  function currentInvoiceDraft(id) {
    const base = Number($('dBase')?.value) || 0;
    const vat = Number($('dVat')?.value) || 0;
    const irpf = Number($('dIrpf')?.value) || 0;
    return {
      id,
      type:'factura',
      clientId:$('dClient').value,
      caseId:$('dCase').value,
      date:$('dDate').value,
      number:$('dNumber').value.trim(),
      title:$('dTitle').value.trim(),
      body:$('dBody').value.trim(),
      status:'borrador',
      base,
      vat,
      irpf,
      total:base + base * vat / 100 - base * irpf / 100
    };
  }

  function invoiceNumber(index) {
    return (state.settings.prefix || 'F-2026-') + String(state.settings.next + index).padStart(3,'0');
  }

  function createSplitInvoices(id, pending) {
    const source = currentInvoiceDraft(id);
    const activeAllocations = pending.allocations.filter(item => (item.percent || 0) > 0 || (item.amount || 0) > 0);
    if (!activeAllocations.length) return alert('No hi ha cap destinatari amb import assignat.');

    if (pending.mode === 'amount') {
      const assigned = activeAllocations.reduce((sum,item) => sum + (Number(item.amount) || 0), 0);
      if (Math.abs(assigned - source.base) > 0.01) {
        return alert(`La suma dels imports (${money(assigned)}) ha de coincidir amb la base de la factura (${money(source.base)}).`);
      }
    }

    const groupId = uid();
    const invoices = activeAllocations.map((allocation,index) => {
      const allocatedBase = pending.mode === 'amount'
        ? Number(allocation.amount) || 0
        : source.base * (Number(allocation.percent) || 0) / 100;
      const allocatedTotal = allocatedBase + allocatedBase * source.vat / 100 - allocatedBase * source.irpf / 100;
      return {
        ...source,
        id:uid(),
        clientId:allocation.clientId,
        number:invoiceNumber(index),
        base:Number(allocatedBase.toFixed(2)),
        total:Number(allocatedTotal.toFixed(2)),
        billingSplit:{
          groupId,
          mode:pending.mode,
          caseId:pending.caseId,
          allocation,
          participantCount:activeAllocations.length
        }
      };
    });

    state.documents.push(...invoices);
    state.settings.next += invoices.length;
    log('Factures creades', `${invoices.length} factures · ${labelType('factura')}`);
    window._pendingInvoiceSplit = null;
    persist();
    closeModal();
    alert(`S'han creat ${invoices.length} factura${invoices.length === 1 ? '' : 'es'} correctament.`);
  }

  window.saveDocument = function(id) {
    const pending = window._pendingInvoiceSplit;
    const type = $('dType')?.value;
    if (!pending || type !== 'factura') return originalSaveDocument(id);
    createSplitInvoices(id, pending);
  };
})();
