export const STATE_VERSION = 3;

export function createEmptyState() {
  return {
    version: STATE_VERSION,
    settings: {
      name: 'Julia María Rico López',
      email: 'info@pyc.legal',
      invoicePrefix: `F-${new Date().getFullYear()}-`,
      nextInvoiceNumber: 1
    },
    clients: [],
    cases: [],
    documents: [],
    activity: [],
    events: [],
    tasks: [],
    serviceCatalog: [],
    billableItems: [],
    provisions: [],
    payments: [],
    migrations: []
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function migrateCaseParticipants(item) {
  if (Array.isArray(item.participants)) return item;
  if (item.clientId) {
    return {
      ...item,
      participants: [{clientId: item.clientId, role: 'principal', isPrimary: true}]
    };
  }
  return {...item, participants: []};
}

function migrateDocument(item) {
  const migrated = {...item};
  if (!migrated.status) migrated.status = migrated.type === 'factura' ? 'esborrany' : 'actiu';
  if (!Array.isArray(migrated.lines) && migrated.type === 'factura') migrated.lines = [];
  if (!Array.isArray(migrated.payments)) migrated.payments = [];
  if (!Array.isArray(migrated.provisionApplications)) migrated.provisionApplications = [];
  return migrated;
}

function recordMigration(state, fromVersion, toVersion, notes) {
  return {
    ...state,
    migrations: [
      ...asArray(state.migrations),
      {
        id: `migration-${fromVersion}-${toVersion}-${Date.now()}`,
        fromVersion,
        toVersion,
        notes,
        appliedAt: new Date().toISOString()
      }
    ]
  };
}

export function migrateState(raw) {
  let state = raw && typeof raw === 'object' ? {...raw} : createEmptyState();
  let version = Number(state.version || 1);

  if (version < 2) {
    state = {
      ...createEmptyState(),
      ...state,
      clients: asArray(state.clients),
      cases: asArray(state.cases).map(migrateCaseParticipants),
      documents: asArray(state.documents),
      activity: asArray(state.activity)
    };
    state = recordMigration(state, version, 2, 'Normalització de clients, expedients, documents i participants múltiples.');
    version = 2;
  }

  if (version < 3) {
    const defaults = createEmptyState();
    state = {
      ...defaults,
      ...state,
      settings: {...defaults.settings, ...(state.settings || {})},
      clients: asArray(state.clients),
      cases: asArray(state.cases).map(migrateCaseParticipants),
      documents: asArray(state.documents).map(migrateDocument),
      activity: asArray(state.activity),
      events: asArray(state.events),
      tasks: asArray(state.tasks),
      serviceCatalog: asArray(state.serviceCatalog),
      billableItems: asArray(state.billableItems),
      provisions: asArray(state.provisions),
      payments: asArray(state.payments),
      migrations: asArray(state.migrations)
    };
    state = recordMigration(state, version, 3, 'Incorporació de facturació avançada, provisions, serveis, cobraments i tasques.');
    version = 3;
  }

  state.version = STATE_VERSION;
  return state;
}

export function validateState(state) {
  const errors = [];
  if (!state || typeof state !== 'object') errors.push('L’estat no és un objecte.');
  if (Number(state?.version) !== STATE_VERSION) errors.push(`Versió d’estat no compatible: ${state?.version}.`);
  const arrays = ['clients','cases','documents','activity','events','tasks','serviceCatalog','billableItems','provisions','payments','migrations'];
  arrays.forEach(key => {
    if (!Array.isArray(state?.[key])) errors.push(`${key} no és una col·lecció vàlida.`);
  });
  const clientIds = new Set((state.clients || []).map(item => item.id));
  const caseIds = new Set((state.cases || []).map(item => item.id));
  (state.cases || []).forEach(item => {
    (item.participants || []).forEach(participant => {
      if (!clientIds.has(participant.clientId)) errors.push(`L’expedient ${item.id} referencia un client inexistent.`);
    });
  });
  (state.documents || []).forEach(item => {
    if (item.caseId && !caseIds.has(item.caseId)) errors.push(`El document ${item.id} referencia un expedient inexistent.`);
  });
  return {valid: errors.length === 0, errors};
}

export function safeParseAndMigrate(serialized) {
  let raw;
  try {
    raw = serialized ? JSON.parse(serialized) : createEmptyState();
  } catch (error) {
    return {state: createEmptyState(), recovered: true, errors: ['JSON corrupte o il·legible.']};
  }
  const state = migrateState(raw);
  const validation = validateState(state);
  return {state, recovered: false, errors: validation.errors};
}
