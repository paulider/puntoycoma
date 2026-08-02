import {createEmptyState, createClient, createParticipant, createCase, createDocument, migrateLegacyState} from './models.js';
import {createBackupPayload} from './storage.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runAutomatedTests() {
  const tests = [];
  const test = (name, fn) => {
    try {
      fn();
      tests.push({name, ok: true});
    } catch (error) {
      tests.push({name, ok: false, error: error.message});
    }
  };

  test('Crea un estat buit v2', () => {
    const state = createEmptyState();
    assert(state.version === 2, 'Versió incorrecta');
    assert(Array.isArray(state.clients), 'Clients no és una llista');
  });

  test('Crea i normalitza un client', () => {
    const client = createClient({name: 'Client prova'});
    assert(client.id, 'Falta identificador');
    assert(client.name === 'Client prova', 'Nom incorrecte');
  });

  test('Crea un expedient amb participants il·limitats', () => {
    const participants = Array.from({length: 8}, (_, index) => createParticipant(`c${index + 1}`, 'client', index === 0));
    const currentCase = createCase({name: 'Herència', participants});
    assert(currentCase.participants.length === 8, 'No conserva tots els participants');
  });

  test('Migra expedients antics amb clientId', () => {
    const migrated = migrateLegacyState({clients: [{id: 'c1', name: 'Antic'}], cases: [{id: 'e1', clientId: 'c1'}]});
    assert(migrated.cases[0].participants[0].clientId === 'c1', 'Migració incorrecta');
  });

  test('Conserva expedients nous amb múltiples participants', () => {
    const migrated = migrateLegacyState({cases: [{id: 'e1', participants: [createParticipant('c1'), createParticipant('c2')]}]});
    assert(migrated.cases[0].participants.length === 2, 'Participants perduts');
  });

  test('Crea documents amb dades econòmiques numèriques', () => {
    const document = createDocument({base: '1000', vat: '21', irpf: '15', total: '1060'});
    assert(document.base === 1000, 'Base incorrecta');
    assert(document.total === 1060, 'Total incorrecte');
  });

  test('Genera una còpia de seguretat v2', () => {
    const payload = createBackupPayload(createEmptyState());
    assert(payload.schemaVersion === 2, 'Versió de còpia incorrecta');
    assert(payload.data.version === 2, 'Estat no normalitzat');
  });

  return {
    passed: tests.filter(item => item.ok).length,
    failed: tests.filter(item => !item.ok).length,
    total: tests.length,
    tests
  };
}
