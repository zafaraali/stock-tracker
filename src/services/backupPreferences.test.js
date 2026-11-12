import { afterEach, expect, it, vi } from 'vitest';
import { withBackupPreferences, restoreBackupPreferences, validBackupPreferences } from './backupPreferences';
import { validateBackup } from './portfolioValidation';
import { encryptBackup, decryptBackup } from './encryptedBackup';

const memory = initial => {
  const values = new Map(Object.entries(initial || {}));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const portfolio = { schemaVersion: 5, holdings: [], transactions: [], watchlist: [], snapshots: [], trash: [{ id: 'deleted-1', label: 'Deleted holding', holdings: [], transactions: [], watchlist: [] }] };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it('includes saved UI settings and defaults, excluding unrelated browser data', () => {
  const storage = memory({ 'apex-view-density': '"compact"', 'apex-hidden-tabs': '["watchlist"]', 'apex-holdings-page-size': '50', 'google-access-token': 'secret' });
  const payload = withBackupPreferences(portfolio, storage);
  expect(payload.preferences).toMatchObject({ 'apex-view-density': 'compact', 'apex-hidden-tabs': ['watchlist'], 'apex-holdings-page-size': 50, 'apex-transactions-page-size': 10 });
  expect(payload.preferences).not.toHaveProperty('google-access-token');
  expect(payload.trash).toEqual(portfolio.trash);
  expect(validateBackup(payload)).toBe('');
});

it('validates preference values before allowing a portfolio restore', () => {
  expect(validBackupPreferences({ 'apex-hidden-tabs': ['dashboard'] })).toBe(false);
  expect(validateBackup({ ...portfolio, preferences: { 'apex-holdings-page-size': 0 } })).toBe('Invalid backup preferences.');
  expect(validateBackup(portfolio)).toBe('');
});

it('restores every saved preference and notifies mounted controls', () => {
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { dispatchEvent, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
  const source = memory({ 'apex-view-density': '"compact"', 'apex-active-section': 'holdings' });
  const payload = withBackupPreferences(portfolio, source);
  const target = memory();
  expect(restoreBackupPreferences(payload.preferences, target)).toBe('');
  expect(withBackupPreferences(portfolio, target)).toEqual(payload);
  expect(dispatchEvent).toHaveBeenCalledOnce();
});

it('rolls back partial preference writes if storage fails', () => {
  const target = memory({ 'apex-view-density': '"default"' });
  const original = target.setItem;
  target.setItem = (key, value) => { if (key === 'apex-hidden-tabs') throw new Error('Full'); original(key, value); };
  expect(restoreBackupPreferences({ 'apex-view-density': 'compact', 'apex-hidden-tabs': [] }, target)).toContain('could not be saved');
  expect(target.getItem('apex-view-density')).toBe('"default"');
});

it('encrypted backups preserve the complete payload without dropping settings or trash', async () => {
  const payload = withBackupPreferences(portfolio, memory({ 'apex-view-density': '"compact"' }));
  const envelope = await encryptBackup(payload, 'backup-test-password');
  expect(await decryptBackup(envelope, 'backup-test-password')).toEqual(payload);
});

it('Google Drive sends the same full JSON payload as file backup', async () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
  vi.stubGlobal('window', { google: { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken: () => options.callback({ access_token: 'test-token', expires_in: 3600 }) }) } } } });
  let sent;
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.includes('/upload/')) { sent = options.body; return { ok: true, json: async () => ({ id: 'backup-file' }) }; }
    return { ok: true, json: async () => ({ files: [] }) };
  }));
  const { uploadGoogleDriveBackup } = await import('./googleDrive');
  const payload = withBackupPreferences(portfolio, memory());
  await uploadGoogleDriveBackup(payload);
  expect(sent).toContain(JSON.stringify(payload));
});
