/* global google */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_NAME = 'ApexFinance backup.json';
let gisPromise;

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
  await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: response => response.error ? reject(new Error(response.error_description || 'Google authorization failed.')) : resolve(response.access_token)
    });
    client.requestAccessToken({ prompt: '' });
  });
}

async function driveFetch(url, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
  return response;
}

async function findBackup() {
  const query = encodeURIComponent(`name = '${escapeDriveQueryValue(BACKUP_NAME)}' and trashed = false`);
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`);
  return (await response.json()).files?.[0] || null;
}

export async function uploadGoogleDriveBackup(payload) {
  const existing = await findBackup();
  const boundary = `apexfinance_${Date.now()}`;
  const metadata = JSON.stringify({ name: BACKUP_NAME, mimeType: 'application/json' });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;
  const endpoint = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const response = await driveFetch(endpoint, {
    method: existing ? 'PATCH' : 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body
  });
  return response.json();
}

export async function downloadGoogleDriveBackup() {
  const file = await findBackup();
  if (!file) throw new Error('No ApexFinance backup was found in Google Drive.');
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  return response.json();
}
