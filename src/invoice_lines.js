function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function createServiceCatalogItem(state, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('El nom del servei és obligatori.');
  const unitPrice = roundMoney(input?.unitPrice);
  if (unitPrice < 0) throw new Error('El preu del servei no pot ser negatiu.');
  const item = {
    id: uid(),
    name,
    description: String(input?.description || '').trim(),
    unitPrice,
    vatRate: Number(input?.vatRate ?? 21),
    irpfRate: Number(input?.irpfRate ?? 0),
    active: input?.active !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return {
    state: {...state, serviceCatalog: [...(state.serviceCatalog || []), item]},
    item
  };
}

export function listServiceCatalog(state, {activeOnly = true} = {}) {
  return (state.serviceCatalog || []).filter(item => !activeOnly || item.active !== false);
}

export function buildDocumentLine(document, overrides = {}) {
  if (!document?.id) throw new Error('El document no és vàlid.');
  const quantity = Number(overrides.quantity ?? 1);
  const unitPrice = roundMoney(overrides.unitPrice ?? document.billableAmount ?? document.base ?? document.amount ?? 0);
  return {
    id: uid(),
    kind: 'document',
    sourceDocumentId: document.id,
    catalogItemId: '',
    description: String(overrides.description || document.title || document.type || 'Document').trim(),
    quantity,
    unitPrice,
    subtotal: roundMoney(quantity * unitPrice),
    vatRate: Number(overrides.vatRate ?? document.vatRate ?? 21),
    irpfRate: Number(overrides.irpfRate ?? document.irpfRate ?? 0)
  };
}

export function buildServiceLine(service, overrides = {}) {
  const description = String(overrides.description || service?.name || '').trim();
  if (!description) throw new Error('La descripció del servei és obligatòria.');
  const quantity = Number(overrides.quantity ?? 1);
  const unitPrice = roundMoney(overrides.unitPrice ?? service?.unitPrice ?? 0);
  return {
    id: uid(),
    kind: 'service',
    sourceDocumentId: '',
    catalogItemId: service?.id || '',
    description,
    quantity,
    unitPrice,
    subtotal: roundMoney(quantity * unitPrice),
    vatRate: Number(overrides.vatRate ?? service?.vatRate ?? 21),
    irpfRate: Number(overrides.irpfRate ?? service?.irpfRate ?? 0)
  };
}

export function calculateInvoiceLines(lines) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('La factura ha de tenir almenys una línia.');
  const normalized = lines.map(line => ({
    ...line,
    quantity: Number(line.quantity || 0),
    unitPrice: roundMoney(line.unitPrice),
    subtotal: roundMoney(Number(line.quantity || 0) * roundMoney(line.unitPrice)),
    vatRate: Number(line.vatRate || 0),
    irpfRate: Number(line.irpfRate || 0)
  }));
  const base = roundMoney(normalized.reduce((sum, line) => sum + line.subtotal, 0));
  const vat = roundMoney(normalized.reduce((sum, line) => sum + line.subtotal * line.vatRate / 100, 0));
  const irpf = roundMoney(normalized.reduce((sum, line) => sum + line.subtotal * line.irpfRate / 100, 0));
  return {lines: normalized, base, vat, irpf, total: roundMoney(base + vat - irpf)};
}

export function validateInvoiceLineSources(state, caseId, lines) {
  const documents = state.documents || [];
  lines.forEach(line => {
    if (line.kind === 'document') {
      const document = documents.find(item => item.id === line.sourceDocumentId);
      if (!document || document.caseId !== caseId) {
        throw new Error('Hi ha una línia vinculada a un document que no pertany a l’expedient.');
      }
    }
  });
}

export function markSourceDocumentsInvoiced(state, invoiceId, lines) {
  const sourceIds = new Set(lines.filter(line => line.kind === 'document').map(line => line.sourceDocumentId));
  return {
    ...state,
    documents: (state.documents || []).map(document =>
      sourceIds.has(document.id)
        ? {...document, invoiceId, invoicedAt: new Date().toISOString()}
        : document
    )
  };
}
