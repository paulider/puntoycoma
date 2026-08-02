import {createClient} from './models.js';

function normalizeQuery(value) {
  return String(value || '').trim().toLocaleLowerCase('ca');
}

export function listClients(state) {
  return [...(state.clients || [])].sort((a, b) => a.name.localeCompare(b.name, 'ca'));
}

export function findClient(state, clientId) {
  return (state.clients || []).find(client => client.id === clientId) || null;
}

export function searchClients(state, query) {
  const needle = normalizeQuery(query);
  if (!needle) return listClients(state);
  return listClients(state).filter(client => {
    const haystack = [client.name, client.tax, client.email, client.phone, client.address]
      .map(normalizeQuery)
      .join(' ');
    return haystack.includes(needle);
  });
}

export function addClient(state, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('El nom del client és obligatori.');
  const client = createClient({...input, name});
  return {
    state: {...state, clients: [...(state.clients || []), client]},
    client
  };
}

export function updateClient(state, clientId, patch) {
  const current = findClient(state, clientId);
  if (!current) throw new Error('No s’ha trobat el client.');
  const name = String(patch?.name ?? current.name).trim();
  if (!name) throw new Error('El nom del client és obligatori.');
  const updated = createClient({...current, ...patch, id: current.id, name, createdAt: current.createdAt});
  return {
    state: {...state, clients: state.clients.map(client => client.id === clientId ? updated : client)},
    client: updated
  };
}

export function removeClient(state, clientId) {
  const linkedCases = (state.cases || []).filter(currentCase =>
    (currentCase.participants || []).some(participant => participant.clientId === clientId)
  );
  const linkedDocuments = (state.documents || []).filter(document => document.clientId === clientId);
  if (linkedCases.length || linkedDocuments.length) {
    throw new Error('No es pot eliminar el client perquè té expedients o documents vinculats.');
  }
  return {...state, clients: (state.clients || []).filter(client => client.id !== clientId)};
}

export function clientRelations(state, clientId) {
  return {
    cases: (state.cases || []).filter(currentCase =>
      (currentCase.participants || []).some(participant => participant.clientId === clientId)
    ),
    documents: (state.documents || []).filter(document => document.clientId === clientId),
    invoices: (state.documents || []).filter(document => document.clientId === clientId && document.type === 'factura')
  };
}
