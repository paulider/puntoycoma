function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function createProvision(state, input) {
  const currentCase = (state.cases || []).find(item => item.id === input.caseId);
  if (!currentCase) throw new Error('L’expedient no existeix.');
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error('L’import de la provisió ha de ser superior a zero.');
  if (input.clientId && !(state.clients || []).some(client => client.id === input.clientId)) {
    throw new Error('El client indicat no existeix.');
  }

  const now = new Date().toISOString();
  const provision = {
    id: uid(),
    caseId: input.caseId,
    clientId: input.clientId || '',
    title: String(input.title || 'Provisió de fons').trim(),
    requestedAmount: amount,
    paidAmount: 0,
    appliedAmount: 0,
    availableAmount: 0,
    status: 'pendent',
    payments: [],
    applications: [],
    createdAt: now,
    updatedAt: now
  };

  return {
    state: {...state, provisions: [...(state.provisions || []), provision]},
    provision
  };
}

export function registerProvisionPayment(state, provisionId, input) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error('L’import del pagament ha de ser superior a zero.');
  const provision = (state.provisions || []).find(item => item.id === provisionId);
  if (!provision) throw new Error('No s’ha trobat la provisió.');
  const payment = {
    id: uid(),
    amount,
    date: input.date || new Date().toISOString().slice(0, 10),
    method: input.method || '',
    reference: input.reference || ''
  };
  const paidAmount = roundMoney(provision.paidAmount + amount);
  const availableAmount = roundMoney(paidAmount - provision.appliedAmount);
  const status = paidAmount >= provision.requestedAmount ? 'pagada' : 'parcial';
  const updated = {
    ...provision,
    paidAmount,
    availableAmount,
    status,
    payments: [...(provision.payments || []), payment],
    updatedAt: new Date().toISOString()
  };
  return {
    state: {...state, provisions: state.provisions.map(item => item.id === provisionId ? updated : item)},
    provision: updated,
    payment
  };
}

export function availableProvisionBalance(state, caseId, clientId = '') {
  return roundMoney((state.provisions || [])
    .filter(item => item.caseId === caseId && (!clientId || !item.clientId || item.clientId === clientId))
    .reduce((sum, item) => sum + Math.max(0, item.availableAmount || 0), 0));
}

export function applyProvisionsToInvoice(state, invoiceId, requestedAmount = null) {
  const invoice = (state.documents || []).find(item => item.id === invoiceId && item.type === 'factura');
  if (!invoice) throw new Error('No s’ha trobat la factura.');
  const invoiceOutstanding = roundMoney(invoice.total - (invoice.provisionApplied || 0) - (invoice.paidAmount || 0));
  let remaining = roundMoney(requestedAmount == null ? invoiceOutstanding : Math.min(requestedAmount, invoiceOutstanding));
  if (remaining <= 0) throw new Error('No hi ha cap import pendent per compensar.');

  const applications = [];
  const provisions = (state.provisions || []).map(provision => {
    const eligible = provision.caseId === invoice.caseId &&
      (!invoice.clientId || !provision.clientId || provision.clientId === invoice.clientId) &&
      provision.availableAmount > 0 && remaining > 0;
    if (!eligible) return provision;

    const amount = roundMoney(Math.min(provision.availableAmount, remaining));
    remaining = roundMoney(remaining - amount);
    const application = {
      id: uid(),
      invoiceId,
      amount,
      date: new Date().toISOString().slice(0, 10)
    };
    applications.push({...application, provisionId: provision.id});
    const appliedAmount = roundMoney(provision.appliedAmount + amount);
    return {
      ...provision,
      appliedAmount,
      availableAmount: roundMoney(provision.paidAmount - appliedAmount),
      status: provision.paidAmount - appliedAmount <= 0 ? 'aplicada' : provision.status,
      applications: [...(provision.applications || []), application],
      updatedAt: new Date().toISOString()
    };
  });

  const applied = roundMoney(applications.reduce((sum, item) => sum + item.amount, 0));
  if (applied <= 0) throw new Error('No hi ha saldo de provisió disponible per aquesta factura.');
  const updatedInvoice = {
    ...invoice,
    provisionApplied: roundMoney((invoice.provisionApplied || 0) + applied),
    amountDue: roundMoney(invoice.total - (invoice.paidAmount || 0) - (invoice.provisionApplied || 0) - applied),
    provisionApplications: [...(invoice.provisionApplications || []), ...applications],
    updatedAt: new Date().toISOString()
  };

  return {
    state: {
      ...state,
      provisions,
      documents: state.documents.map(item => item.id === invoiceId ? updatedInvoice : item)
    },
    invoice: updatedInvoice,
    applications,
    applied
  };
}
