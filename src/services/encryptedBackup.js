/* global btoa, atob, TextEncoder, TextDecoder */

const FORMAT = 'apexfinance-encrypted-backup';
const ITERATIONS = 250000;

const toBase64 = bytes => { let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); return btoa(binary); };
const fromBase64 = value => Uint8Array.from(atob(value), character => character.charCodeAt(0));

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptBackup(payload, password) {
  if (!password || password.length < 8) throw new Error('Use a backup password with at least 8 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return JSON.stringify({ format: FORMAT, version: 1, kdf: 'PBKDF2-SHA-256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) }, null, 2);
}

export async function decryptBackup(serialized, password) {
  if (!password) throw new Error('A backup password is required.');
  const envelope = JSON.parse(serialized);
  if (envelope?.format !== FORMAT || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA-256') throw new Error('This is not a supported encrypted ApexFinance backup.');
  const key = await deriveKey(password, fromBase64(envelope.salt));
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Could not decrypt the backup. Check the password and try again.');
  }
}
