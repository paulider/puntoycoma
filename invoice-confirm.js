(() => {
  const previousSaveDocument = window.saveDocument;

  function readDraft(id) {
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

  function activeAllocations(pending) {
    return pending.allocations.filter(item => (Number(item.percent) || 0) > 0 || (Number(item.amount) || 0) > 0);
  }

  function allocatedBase(source, pending, allocation) {
    if (pending.mode === 'amount') return Number(allocation.amount) || 0;
    return source.base * (Number(allocation.percent) || 0) / 100;
  }

  function validate(source, pending) {
    const active = activeAllocations(pending);
    if (!active.length) return 'No hi ha cap destinatari amb import assignat.';
    if (pending.mode === 'amount') {
      const assigned = active.reduce((sum,item) => sum + (Number(item.amount) || 0), 0);
      if (Math.abs(assigned - source.base) > 0.01) {
        return `La suma dels imports (${money(assigned)}) ha de coincidir amb la base de la factura (${money(source.base)}).`;
      }
    }
    return '';
  }

  function nextInvoiceNumber(index) {
    return (state.settings.prefix || 'F-2026-') + String(state.settings.next + index).padStart(3,'0');
  }

  function confirmationRows(source, pending) {
    return activeAllocations(pending).map((allocation,index) => {
      const client = state.clients.find(item => item.id === allocation.clientId);
      const base = allocatedBase(source,pending,allocation);
      const total = base + base * source.vat / 100 - base * source.irpf / 100;
      return `<div class="row"><div><strong>${esc(nextInvoiceNumber(index))} · ${esc(client?.name || 'Client')}</strong><small>Base: ${money(base)} · Total: ${money(total)}</small></div><span class="pill ok">${pending.mode === 'amount' ? money(base) : (Number(allocation.percent)||0).toFixed(2)+'%'}</span></div>`;
    }).join('');
  }

  window.openInvoiceConfirmation = function(id) {
    const pending = window._pendingInvoiceSplit;
    if (!pending) return previousSaveDocument(id);
    const source = readDraft(id);
    const error = validate(source,pending);
    if (error) return alert(error);
    window._invoiceConfirmation = {id, source, pending};
    const currentCase = state.cases.find(item => item.id === pending.caseId);
    $('modal').innerHTML = `<div class="modal"><div class="sheet"><div class="sheet-head"><h3>Revisar factures</h3><button class="btn ghost" onclick="openDocument('','${source.clientId}','${source.caseId}')">Tornar</button></div><div class="sheet-body"><div class="label">${esc(currentCase?.name || 'Expedient')}</div><div class="panel" style="margin-top:14px"><div class="panel-head"><h2>Es generaran ${activeAllocations(pending).length} factura${activeAllocations(pending).length===1?'':'es'}</h2></div><div class="list">${confirmationRows(source,pending)}</div></div><div class="backup-status ok" style="margin-top:14px">Base total: ${money(source.base)} · Total amb impostos: ${money(source.total)}</div><div class="sheet-actions"><button class="btn" onclick="editInvoiceAllocation()">Modificar repartiment</button><button class="btn primary" onclick="confirmSplitInvoices()">Generar factures</button></div></div></div></div>`;
  };

  window.editInvoiceAllocation = function() {
    const ctx = window._invoiceConfirmation;
    if (!ctx) return;
    window._pendingInvoiceSplit = null;
    window.openDocument('', '', ctx.source.caseId);
  };

  window.confirmSplitInvoices = function() {
    const ctx = window._invoiceConfirmation;
    if (!ctx) return;
    const {source,pending} = ctx;
    const allocations = activeAllocations(pending);
    const groupId = uid();
    const invoices = allocations.map((allocation,index) => {
      const base = Number(allocatedBase(source,pending,allocation).toFixed(2));
      const total = Number((base + base * source.vat / 100 - base * source.irpf / 100).toFixed(2));
      return {
        ...source,
        id:uid(),
        clientId:allocation.clientId,
        number:nextInvoiceNumber(index),
        base,
        total,
        billingSplit:{groupId,mode:pending.mode,caseId:pending.caseId,allocation,participantCount:allocations.length}
      };
    });
    state.documents.push(...invoices);
    state.settings.next += invoices.length;
    log('Factures creades', `${invoices.length} factura${invoices.length===1?'':'es'}`);
    window._pendingInvoiceSplit = null;
    window._invoiceConfirmation = null;
    persist();
    closeModal();
    alert(`S'han creat ${invoices.length} factura${invoices.length===1?'':'es'} correctament.`);
  };

  window.saveDocument = function(id) {
    const pending = window._pendingInvoiceSplit;
    const type = $('dType')?.value;
    if (!pending || type !== 'factura') return previousSaveDocument(id);
    openInvoiceConfirmation(id);
  };
})();
