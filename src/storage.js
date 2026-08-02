import {createEmptyState, migrateLegacyState} from './models.js';

const STORAGE_KEY = 'pyc_office_v2';
const LEGACY_KEY = 'pyc_office_v01';

export function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return migrateLegacyState(JSON.parse(current));

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacyState(JSON.parse(legacy));
      saveState(migrated);
      return migrated;
    }
  } catch (error) {
    console.error('[storage] load failed', error);
  }
  return createEmptyState();
}

export function saveState(state) {
  const normalized = migrateLegacyState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createBackupPayload(state) {
  return {
    app: 'Punto y Coma Office',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data: migrateLegacyState(state)
  };
}

export function backupFilename(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `PYC_Backup_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}

export function downloadBackup(state) {
  const blob = new Blob([JSON.stringify(createBackupPayload(state), null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importBackupFile(file) {
  if (!file) throw new Error('No s\'ha seleccionat cap fitxer.');
  const text = await file.text();
  const parsed = JSON.parse(text);
  const data = parsed?.data || parsed;
  const migrated = migrateLegacyState(data);

  if (!Array.isArray(migrated.clients) || !Array.isArray(migrated.cases) || !Array.isArray(migrated.documents)) {
    throw new Error('La còpia no té un format vàlid.');
  }

  return saveState(migrated);
}

export function storageDiagnostics() {
  const current = localStorage.getItem(STORAGE_KEY);
  return {
    key: STORAGE_KEY,
    hasData: Boolean(current),
    bytes: current ? new Blob([current]).size : 0,
    legacyDataPresent: Boolean(localStorage.getItem(LEGACY_KEY))
  };
}
