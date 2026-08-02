const DOCUMENT_TYPES = Object.freeze({
  factura: {label: 'Factura', requiresAmount: true, numbered: true},
  provisio: {label: 'Provisió de fons', requiresAmount: true, numbered: false},
  pressupost: {label: 'Pressupost', requiresAmount: true, numbered: false},
  full_encarrec: {label: "Full d'encàrrec", requiresAmount: false, numbered: false},
  informatiu: {label: 'Document informatiu', requiresAmount: false, numbered: false},
  lliure: {label: 'Document lliure', requiresAmount: false, numbered: false}
});

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((asNumber(value) + Number.EPSILON) * 100) / 100;
}

export function listDocumentTypes() {
  return Object.entries(DOCUMENT_TYPES).map(([id, config]) => ({id, ...config}));
}

export function calculateTotals({base = 0, vatRate = 21, irpfRate = 0} = {}) {
  const normalizedBase = roundMoney(base);
  const vat = roundMoney(normalizedBase * asNumber(vatRate) / 100);
  const irpf = roundMoney(normalizedBase * asNumber(irpfRate) / 100);
  return {
    base: normalizedBase,
    vatRate: asNumber(vatRate),
    irpfRate: asNumber(irpfRate),
    vat,
    irpf,
    total: roundMoney(normalizedBase + vat - irpf)
  };
}

export function formatDocumentNumber(prefix = 'F-2026-', sequence = 1) {
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export function validateDocumentInput(state, input) {
  const type = String(input?.type || '').trim();
  if (!DOCUMENT_TYPES[type]) throw new Error('Tipus de document no vàlid.');
  if (!String(input?.title || '').trim()) throw new Error('El títol és obligatori.');
  if (!String(input?.caseId || '').trim()) throw new Error('L’expedient és obligatori.');
  if (!(state.cases || []).some(item => item.id === input.caseId)) {
    throw new Error('L’expedient indicat no existeix.');
  }
  if (input.clientId && !(state.clients || []).some(client => client.id === input.clientId)) {
    throw new Error('El client indicat no existeix.');
  }
  if (DOCUMENT_TYPES[type].requiresAmount && asNumber(input.base) < 0) {
    throw new Error('La base econòmica no pot ser negativa.');
  }
}

export function createDocument(state, input) {
  validateDocumentInput(state, input);
  const config = DOCUMENT_TYPES[input.type];
  const now = new Date().toISOString();
  const totals = config.requiresAmount ? calculateTotals(input) : calculateTotals({base: 0, vatRate: 0, irpfRate: 0});
  const sequence = Number(state.settings?.nextInvoiceNumber || 1);
  const number = config.numbered
    ? formatDocumentNumber(state.settings?.invoicePrefix || 'F-2026-', sequence)
    : String(input.number || '').trim();

  const document = {
    id: uid(),
    caseId: input.caseId,
    clientId: input.clientId || '',
    type: input.type,
    title: String(input.title).trim(),
    number,
    status: input.status || 'esborrany',
    content: input.content || '',
    ...totals,
    createdAt: now,
    updatedAt: now
  };

  const nextSettings = config.numbered
    ? {...state.settings, nextInvoiceNumber: sequence + 1}
    : state.settings;

  return {
    state: {
      ...state,
      settings: nextSettings,
      documents: [...(state.documents || []), document],
      activity: [...(state.activity || []), {
        id: uid(),
        caseId: document.caseId,
        title: 'Document creat',
        body: document.title,
        date: now.slice(0, 10)
      }]
    },
    document
  };
}

export function updateDocument(state, documentId, patch) {
  const current = (state.documents || []).find(document => document.id === documentId);
  if (!current) throw new Error('No s’ha trobat el document.');
  const merged = {...current, ...patch, id: current.id, createdAt: current.createdAt};
  validateDocumentInput(state, merged);
  const totals = DOCUMENT_TYPES[merged.type].requiresAmount ? calculateTotals(merged) : calculateTotals({base: 0, vatRate: 0, irpfRate: 0});
  const updated = {...merged, ...totals, updatedAt: new Date().toISOString()};
  return {
    state: {...state, documents: state.documents.map(document => document.id === documentId ? updated : document)},
    document: updated
  };
}

export function removeDocument(state, documentId) {
  const current = (state.documents || []).find(document => document.id === documentId);
  if (!current) return state;
  if (current.status === 'emesa' || current.status === 'pagada') {
    throw new Error('Un document emès o pagat no es pot eliminar; cal anul·lar-lo.');
  }
  return {...state, documents: state.documents.filter(document => document.id !== documentId)};
}

export function documentsForCase(state, caseId) {
  return (state.documents || []).filter(document => document.caseId === caseId);
}
