/* global google */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_NAME = 'ApexFinance backup.json';
const ENCRYPTED_BACKUP_NAME = 'ApexFinance encrypted backup.json';
const ENCRYPTED_BACKUP_PREFIX = 'ApexFinance encrypted backup';
let gisPromise;
let accessTokenRequest;
let accessTokenCache;

const escapeDriveQueryValue = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export function isGoogleDriveConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in could not load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google sign-in could not load.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

async function getAccessToken() {
  if (!isGoogleDriveConfigured()) throw new Error('Google Drive is not configured. Add VITE_GOOGLE_CLIENT_ID and restart the app.');
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) return accessTokenCache.token;
  if (accessTokenRequest) return accessTokenRequest;
  await loadGoogleIdentityServices();
  accessTokenRequest = new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: response => {
        if (response.error) {
          reject(new Error(response.error_description || 'Google authorization failed.'));
          return;
        }
        accessTokenCache = {
          token: response.access_token,
          expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000
        };
        resolve(response.access_token);
      }
    });
    client.requestAccessToken({ prompt: '' });
  }).finally(() => { accessTokenRequest = null; });
  return accessTokenRequest;
}

async function driveFetch(url, options = {}, token) {
  const accessToken = token || await getAccessToken();
  const response = await fetch(url, { ...options, headers: { authorization: `Bearer ${accessToken}`, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
  return response;
}

async function findBackup(token, name = BACKUP_NAME) {
  const query = encodeURIComponent(`name = '${escapeDriveQueryValue(name)}' and trashed = false`);
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {}, token);
  return (await response.json()).files?.[0] || null;
}

export async function uploadGoogleDriveBackup(payload, name = BACKUP_NAME) {
  const token = await getAccessToken();
  const existing = await findBackup(token, name);
  const boundary = `apexfinance_${Date.now()}`;
  const metadata = JSON.stringify({ name, mimeType: 'application/json' });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;
  const endpoint = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const response = await driveFetch(endpoint, {
    method: existing ? 'PATCH' : 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body
  }, token);
  return response.json();
}

export async function downloadGoogleDriveBackup(name = BACKUP_NAME) {
  const token = await getAccessToken();
  const file = await findBackup(token, name);
  if (!file) throw new Error('No ApexFinance backup was found in Google Drive.');
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {}, token);
  return response.json();
}

export const ENCRYPTED_DRIVE_BACKUP_NAME = ENCRYPTED_BACKUP_NAME;
export const ENCRYPTED_DRIVE_BACKUP_PREFIX = ENCRYPTED_BACKUP_PREFIX;

export async function downloadLatestGoogleDriveBackup(prefix = ENCRYPTED_BACKUP_PREFIX) {
  const token = await getAccessToken();
  const query = encodeURIComponent(`name contains '${escapeDriveQueryValue(prefix)}' and trashed = false`);
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {}, token);
  const file = (await response.json()).files?.[0];
  if (!file) throw new Error('No encrypted ApexFinance backup was found in Google Drive.');
  const backup = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {}, token);
  return backup.json();
}
