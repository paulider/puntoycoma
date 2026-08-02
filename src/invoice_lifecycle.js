function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export const INVOICE_STATES = Object.freeze({
  DRAFT: 'esborrany',
  REVIEWED: 'revisada',
  ISSUED: 'emesa',
  PARTIALLY_PAID: 'parcialment_cobrada',
  PAID: 'cobrada',
  OVERDUE: 'vencuda',
  CANCELLED: 'anul·lada',
  RECTIFIED: 'rectificada'
});

export function buildInvoiceNumber(settings, sequence = null) {
  const current = Number(sequence ?? settings?.nextInvoiceNumber ?? 1);
  const prefix = settings?.invoicePrefix || `F-${new Date().getFullYear()}-`;
  return `${prefix}${String(current).padStart(3, '0')}`;
}

export function reviewInvoice(state, invoiceId) {
  const invoice = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  if (invoice.status !== INVOICE_STATES.DRAFT) throw new Error('Només es poden revisar factures en esborrany.');
  if (!Array.isArray(invoice.lines) || !invoice.lines.length) throw new Error('La factura no té línies.');
  const reviewed = {...invoice, status: INVOICE_STATES.REVIEWED, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString()};
  return {...state, documents: state.documents.map(item => item.id === invoiceId ? reviewed : item)};
}

export function issueInvoice(state, invoiceId, {issueDate = null, dueDate = null} = {}) {
  const invoice = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  if (![INVOICE_STATES.DRAFT, INVOICE_STATES.REVIEWED].includes(invoice.status)) {
    throw new Error('La factura no es pot emetre des del seu estat actual.');
  }
  const sequence = Number(state.settings?.nextInvoiceNumber || 1);
  const number = invoice.number || buildInvoiceNumber(state.settings, sequence);
  if ((state.documents || []).some(item => item.id !== invoiceId && item.number === number)) {
    throw new Error('La numeració de factura està duplicada.');
  }
  const now = new Date().toISOString();
  const issued = {
    ...invoice,
    number,
    status: INVOICE_STATES.ISSUED,
    issueDate: issueDate || now.slice(0, 10),
    dueDate: dueDate || '',
    issuedAt: now,
    lockedAt: now,
    amountDue: roundMoney(invoice.total - (invoice.provisionApplied || 0) - (invoice.paidAmount || 0)),
    updatedAt: now
  };
  return {
    state: {
      ...state,
      settings: {...state.settings, nextInvoiceNumber: invoice.number ? sequence : sequence + 1},
      documents: state.documents.map(item => item.id === invoiceId ? issued : item),
      activity: [...(state.activity || []), {id: uid(), caseId: invoice.caseId, title: 'Factura emesa', body: number, date: issued.issueDate}]
    },
    invoice: issued
  };
}

export function assertInvoiceEditable(invoice) {
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  if (![INVOICE_STATES.DRAFT, INVOICE_STATES.REVIEWED].includes(invoice.status)) {
    throw new Error('Una factura emesa no es pot editar lliurement.');
  }
  return true;
}

export function registerInvoicePayment(state, invoiceId, input) {
  const invoice = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  if (![INVOICE_STATES.ISSUED, INVOICE_STATES.PARTIALLY_PAID, INVOICE_STATES.OVERDUE].includes(invoice.status)) {
    throw new Error('Només es poden cobrar factures emeses.');
  }
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error('L’import del cobrament ha de ser superior a zero.');
  const outstanding = roundMoney(invoice.total - (invoice.provisionApplied || 0) - (invoice.paidAmount || 0));
  if (amount > outstanding) throw new Error('El cobrament supera l’import pendent.');
  const payment = {id: uid(), amount, date: input.date || new Date().toISOString().slice(0, 10), method: input.method || '', reference: input.reference || ''};
  const paidAmount = roundMoney((invoice.paidAmount || 0) + amount);
  const amountDue = roundMoney(invoice.total - (invoice.provisionApplied || 0) - paidAmount);
  const status = amountDue === 0 ? INVOICE_STATES.PAID : INVOICE_STATES.PARTIALLY_PAID;
  const updated = {...invoice, paidAmount, amountDue, status, payments: [...(invoice.payments || []), payment], updatedAt: new Date().toISOString()};
  return {
    state: {...state, documents: state.documents.map(item => item.id === invoiceId ? updated : item)},
    invoice: updated,
    payment
  };
}

export function markInvoiceOverdue(state, invoiceId, today = new Date().toISOString().slice(0, 10)) {
  const invoice = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  if (!invoice.dueDate || invoice.dueDate >= today || (invoice.amountDue || 0) <= 0) return state;
  const updated = {...invoice, status: INVOICE_STATES.OVERDUE, updatedAt: new Date().toISOString()};
  return {...state, documents: state.documents.map(item => item.id === invoiceId ? updated : item)};
}

export function cancelDraftInvoice(state, invoiceId) {
  const invoice = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  if (![INVOICE_STATES.DRAFT, INVOICE_STATES.REVIEWED].includes(invoice.status)) {
    throw new Error('Una factura emesa no es pot eliminar; cal crear una rectificativa.');
  }
  return {...state, documents: state.documents.filter(item => item.id !== invoiceId)};
}

export function createRectifyingInvoice(state, invoiceId, input = {}) {
  const original = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!original) throw new Error('No s’ha trobat la factura original.');
  if (![INVOICE_STATES.ISSUED, INVOICE_STATES.PARTIALLY_PAID, INVOICE_STATES.PAID, INVOICE_STATES.OVERDUE].includes(original.status)) {
    throw new Error('Només es poden rectificar factures emeses.');
  }
  const amount = roundMoney(input.amount ?? original.total);
  if (amount <= 0 || amount > original.total) throw new Error('L’import de rectificació no és vàlid.');
  const now = new Date().toISOString();
  const rectification = {
    id: uid(),
    caseId: original.caseId,
    clientId: original.clientId,
    type: 'factura_rectificativa',
    title: input.title || `Rectificativa de ${original.number}`,
    rectifiesInvoiceId: original.id,
    status: INVOICE_STATES.DRAFT,
    lines: [{id: uid(), kind: 'rectification', description: input.description || `Rectificació de ${original.number}`, quantity: 1, unitPrice: -amount, subtotal: -amount, vatRate: 0, irpfRate: 0}],
    base: -amount,
    vat: 0,
    irpf: 0,
    total: -amount,
    createdAt: now,
    updatedAt: now
  };
  const originalUpdated = {...original, status: INVOICE_STATES.RECTIFIED, rectifyingInvoiceId: rectification.id, updatedAt: now};
  return {
    state: {...state, documents: [...state.documents.map(item => item.id === original.id ? originalUpdated : item), rectification]},
    invoice: rectification
  };
}
