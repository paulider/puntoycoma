import {createCase, createParticipant} from './models.js';

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('ca');
}

export function listCases(state) {
  return [...(state.cases || [])].sort((a, b) => (b.openedAt || '').localeCompare(a.openedAt || ''));
}

export function findCase(state, caseId) {
  return (state.cases || []).find(item => item.id === caseId) || null;
}

export function searchCases(state, query) {
  const needle = normalize(query);
  if (!needle) return listCases(state);
  return listCases(state).filter(item => {
    const participantNames = (item.participants || [])
      .map(participant => state.clients.find(client => client.id === participant.clientId)?.name || '')
      .join(' ');
    return [item.name, item.code, item.type, item.status, participantNames]
      .map(normalize)
      .join(' ')
      .includes(needle);
  });
}

export function validateParticipants(state, participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error('L’expedient ha de tenir almenys un participant.');
  }
  const unique = new Set();
  participants.forEach(participant => {
    if (!state.clients.some(client => client.id === participant.clientId)) {
      throw new Error('Hi ha un participant que no existeix.');
    }
    if (unique.has(participant.clientId)) {
      throw new Error('Un mateix client no pot aparèixer dues vegades al mateix expedient.');
    }
    unique.add(participant.clientId);
  });
}

export function addCase(state, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('El nom de l’expedient és obligatori.');
  validateParticipants(state, input.participants);
  const participants = input.participants.map((participant, index) =>
    createParticipant(participant.clientId, participant.role || 'principal', index === 0)
  );
  const currentCase = createCase({...input, name, participants});
  return {
    state: {...state, cases: [...(state.cases || []), currentCase]},
    case: currentCase
  };
}

export function updateCase(state, caseId, patch) {
  const current = findCase(state, caseId);
  if (!current) throw new Error('No s’ha trobat l’expedient.');
  const name = String(patch?.name ?? current.name).trim();
  if (!name) throw new Error('El nom de l’expedient és obligatori.');
  const participants = patch.participants || current.participants;
  validateParticipants(state, participants);
  const normalizedParticipants = participants.map((participant, index) =>
    createParticipant(participant.clientId, participant.role || 'principal', index === 0)
  );
  const updated = createCase({
    ...current,
    ...patch,
    id: current.id,
    name,
    participants: normalizedParticipants,
    createdAt: current.createdAt,
    openedAt: current.openedAt
  });
  return {
    state: {...state, cases: state.cases.map(item => item.id === caseId ? updated : item)},
    case: updated
  };
}

export function removeCase(state, caseId) {
  const linkedDocuments = (state.documents || []).filter(document => document.caseId === caseId);
  if (linkedDocuments.length) {
    throw new Error('No es pot eliminar l’expedient perquè té documents vinculats.');
  }
  return {...state, cases: (state.cases || []).filter(item => item.id !== caseId)};
}

export function caseRelations(state, caseId) {
  const current = findCase(state, caseId);
  if (!current) return {participants: [], documents: [], invoices: []};
  return {
    participants: (current.participants || []).map(participant => ({
      ...participant,
      client: state.clients.find(client => client.id === participant.clientId) || null
    })),
    documents: (state.documents || []).filter(document => document.caseId === caseId),
    invoices: (state.documents || []).filter(document => document.caseId === caseId && document.type === 'factura')
  };
}
