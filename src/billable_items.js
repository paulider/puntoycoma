function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export const BILLABLE_ITEM_TYPES = Object.freeze({
  servei: 'Servei professional',
  document: 'Document',
  tasca: 'Tasca',
  despesa: 'Despesa',
  desplacament: 'Desplaçament',
  suplert: 'Suplert',
  altre: 'Altres'
});

export function createBillableItem(state, input) {
  if (!(state.cases || []).some(item => item.id === input.caseId)) {
    throw new Error('L’expedient no existeix.');
  }
  const description = String(input.description || '').trim();
  if (!description) throw new Error('La descripció és obligatòria.');
  const amount = roundMoney(input.amount);
  if (amount < 0) throw new Error('L’import no pot ser negatiu.');
  const now = new Date().toISOString();
  const item = {
    id: uid(),
    caseId: input.caseId,
    sourceDocumentId: input.sourceDocumentId || '',
    type: input.type || 'servei',
    description,
    amount,
    status: 'pendent',
    invoicedAmount: 0,
    invoiceIds: [],
    createdAt: now,
    updatedAt: now
  };
  return {
    state: {...state, billableItems: [...(state.billableItems || []), item]},
    item
  };
}

export function listBillableItems(state, caseId, {includeInvoiced = false} = {}) {
  return (state.billableItems || []).filter(item =>
    item.caseId === caseId && (includeInvoiced || item.status !== 'facturat')
  );
}

export function markItemsInvoiced(state, itemIds, invoiceIds, allocationsByItem = {}) {
  const uniqueIds = [...new Set(itemIds || [])];
  if (!uniqueIds.length) throw new Error('No hi ha elements facturables seleccionats.');
  const now = new Date().toISOString();
  const billableItems = (state.billableItems || []).map(item => {
    if (!uniqueIds.includes(item.id)) return item;
    const added = roundMoney(allocationsByItem[item.id] ?? item.amount - item.invoicedAmount);
    const invoicedAmount = roundMoney(item.invoicedAmount + added);
    const status = invoicedAmount >= item.amount ? 'facturat' : 'parcial';
    return {
      ...item,
      invoicedAmount,
      status,
      invoiceIds: [...new Set([...(item.invoiceIds || []), ...invoiceIds])],
      updatedAt: now
    };
  });
  return {...state, billableItems};
}

export function calculatePendingAmount(state, caseId, itemIds = null) {
  const allowed = itemIds ? new Set(itemIds) : null;
  return roundMoney((state.billableItems || [])
    .filter(item => item.caseId === caseId && item.status !== 'facturat' && (!allowed || allowed.has(item.id)))
    .reduce((sum, item) => sum + Math.max(0, item.amount - item.invoicedAmount), 0));
}
