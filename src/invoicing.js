function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function getBillableDocuments(state, caseId) {
  return (state.documents || []).filter(document =>
    document.caseId === caseId &&
    document.type !== 'factura' &&
    document.status !== 'anul·lat' &&
    !document.invoiceId
  );
}

export function resolveInvoiceScope(state, {caseId, scope = 'full', documentIds = []}) {
  const currentCase = (state.cases || []).find(item => item.id === caseId);
  if (!currentCase) throw new Error('L’expedient no existeix.');

  const billable = getBillableDocuments(state, caseId);
  if (scope === 'full') {
    return {
      scope: 'full',
      documentIds: billable.map(document => document.id),
      documents: billable
    };
  }

  if (scope !== 'partial') throw new Error('L’abast de facturació no és vàlid.');
  const uniqueIds = [...new Set(documentIds)];
  if (!uniqueIds.length) throw new Error('Cal seleccionar almenys un document per facturar una part de l’expedient.');

  const selected = uniqueIds.map(id => billable.find(document => document.id === id));
  if (selected.some(document => !document)) {
    throw new Error('Hi ha documents seleccionats que no són facturables o no pertanyen a l’expedient.');
  }

  return {scope: 'partial', documentIds: uniqueIds, documents: selected};
}

export function calculateScopeAmount(scopeResult, fallbackAmount = 0) {
  const documentAmount = scopeResult.documents.reduce((sum, document) => {
    const amount = document.billableAmount ?? document.base ?? document.amount ?? 0;
    return sum + Number(amount || 0);
  }, 0);
  return roundMoney(documentAmount || fallbackAmount);
}

export function validateDistribution(total, allocations) {
  if (!Array.isArray(allocations) || !allocations.length) {
    throw new Error('Cal definir com es reparteix la factura.');
  }
  const normalized = allocations.map(item => ({
    clientId: item.clientId || '',
    amount: roundMoney(item.amount)
  }));
  const allocated = roundMoney(normalized.reduce((sum, item) => sum + item.amount, 0));
  if (allocated !== roundMoney(total)) {
    throw new Error(`El repartiment (${allocated.toFixed(2)} €) no coincideix amb l’import a facturar (${roundMoney(total).toFixed(2)} €).`);
  }
  return normalized;
}

export function createInvoiceBatch(state, input) {
  const scope = resolveInvoiceScope(state, input);
  const amount = calculateScopeAmount(scope, input.amount);
  if (amount <= 0) throw new Error('L’import a facturar ha de ser superior a zero.');
  const allocations = validateDistribution(amount, input.allocations);
  const prefix = state.settings?.invoicePrefix || 'F-2026-';
  let sequence = Number(state.settings?.nextInvoiceNumber || 1);
  const createdAt = new Date().toISOString();

  const invoices = allocations.map(allocation => ({
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${sequence}`,
    caseId: input.caseId,
    clientId: allocation.clientId,
    type: 'factura',
    title: input.title || 'Factura honoraris',
    number: `${prefix}${String(sequence++).padStart(3, '0')}`,
    status: 'esborrany',
    scope: scope.scope,
    sourceDocumentIds: scope.documentIds,
    base: allocation.amount,
    createdAt,
    updatedAt: createdAt
  }));

  const invoiceIds = invoices.map(invoice => invoice.id);
  const documents = (state.documents || []).map(document =>
    scope.documentIds.includes(document.id)
      ? {...document, invoiceId: invoiceIds.length === 1 ? invoiceIds[0] : invoiceIds, invoicedAt: createdAt}
      : document
  );

  return {
    state: {
      ...state,
      settings: {...state.settings, nextInvoiceNumber: sequence},
      documents: [...documents, ...invoices],
      activity: [...(state.activity || []), {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-activity`,
        caseId: input.caseId,
        title: invoices.length === 1 ? 'Factura creada' : 'Factures creades',
        body: `${invoices.length} factura/es · ${scope.scope === 'full' ? 'expedient complet' : `${scope.documentIds.length} document/s`}`,
        date: createdAt.slice(0, 10)
      }]
    },
    invoices,
    scope,
    amount
  };
}
