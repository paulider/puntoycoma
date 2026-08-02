export const DEFAULT_SETTINGS = {
  name: 'Julia María Rico López',
  signature: 'Julia Rico',
  tax: '74011732D',
  address: 'c/ Camí Can Dori 32, 08811 Canyelles, Barcelona',
  email: 'info@pyc.legal',
  iban: 'ES73 1465 0120 37 1773656323',
  vat: 21,
  irpf: 15,
  invoicePrefix: 'F-2026-',
  nextInvoiceNumber: 1
};

export function createEmptyState() {
  return {
    version: 2,
    settings: {...DEFAULT_SETTINGS},
    clients: [],
    cases: [],
    documents: [],
    activity: []
  };
}

export function createClient(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    name: input.name || '',
    tax: input.tax || '',
    address: input.address || '',
    email: input.email || '',
    phone: input.phone || '',
    notes: input.notes || '',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createParticipant(clientId, role = 'principal', isPrimary = false) {
  return {clientId, role, isPrimary};
}

export function createCase(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    code: input.code || '',
    name: input.name || '',
    type: input.type || 'altres',
    status: input.status || 'obert',
    participants: Array.isArray(input.participants) ? input.participants : [],
    notes: input.notes || '',
    openedAt: input.openedAt || new Date().toISOString(),
    closedAt: input.closedAt || null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createDocument(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    type: input.type || 'lliure',
    caseId: input.caseId || '',
    clientId: input.clientId || '',
    number: input.number || '',
    title: input.title || '',
    body: input.body || '',
    date: input.date || new Date().toISOString().slice(0, 10),
    status: input.status || 'esborrany',
    base: Number(input.base) || 0,
    vat: Number(input.vat) || 0,
    irpf: Number(input.irpf) || 0,
    total: Number(input.total) || 0,
    billingSplit: input.billingSplit || null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function migrateLegacyState(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyState();
  const state = {...createEmptyState(), ...raw};
  state.settings = {...DEFAULT_SETTINGS, ...(raw.settings || {})};
  state.cases = (raw.cases || []).map(item => {
    const participants = Array.isArray(item.participants)
      ? item.participants
      : item.clientId
        ? [createParticipant(item.clientId, 'principal', true)]
        : [];
    return createCase({...item, participants});
  });
  state.clients = (raw.clients || []).map(createClient);
  state.documents = (raw.documents || []).map(createDocument);
  state.activity = Array.isArray(raw.activity) ? raw.activity : [];
  state.version = 2;
  return state;
}
