import { browserStorage } from './storage';
import { CURRENCY_RATES } from '../data/mockData';

export const PREFERENCES_RESTORED = 'apex-preferences-restored';
const sections = ['summary', 'cash', 'charts', 'insights', 'holdings'];
const tabs = ['dashboard', 'holdings', 'history', 'watchlist', 'dividends', 'performance', 'rebalance'];
const oneOf = values => value => values.includes(value);
const specifications = {
  'apex-private-mode': [false, value => typeof value === 'boolean'],
  'apex-view-density': ['default', oneOf(['default', 'compact'])],
  'apex-value-currency': ['display', oneOf(['display', 'native'])],
  'apex-holdings-page-size': [10, oneOf([10, 20, 50, 100])],
  'apex-transactions-page-size': [10, oneOf([10, 20, 50, 100])],
  'apex-holdings-sort': ['symbol', oneOf(['symbol', 'value', 'gain'])],
  'apex-holdings-direction': ['asc', oneOf(['asc', 'desc'])],
  'apex-backup-reminder-days': [0, oneOf([0, 7, 30, 90])],
  'apex-last-transaction-holding': ['', value => typeof value === 'string'],
  'apex-last-transaction-currency': ['CAD', oneOf(Object.keys(CURRENCY_RATES))],
  'apex-desktop-controls': [false, value => typeof value === 'boolean'],
  'apex-active-section': ['dashboard', oneOf(tabs)],
  'apex-hidden-tabs': [[], value => Array.isArray(value) && value.every(key => tabs.slice(2).includes(key))],
  'apex-overview-layout': [{ order: sections, hidden: [] }, value => value && Array.isArray(value.order) && value.order.length === sections.length && new Set(value.order).size === sections.length && value.order.every(key => sections.includes(key)) && Array.isArray(value.hidden) && value.hidden.every(key => sections.includes(key))],
  'apex-last-backup': [null, value => value === null || (Number.isFinite(value?.at) && ['drive', 'download'].includes(value.kind))],
};

export function validBackupPreferences(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([key, entry]) => Object.hasOwn(specifications, key) && specifications[key][1](entry));
}

export function withBackupPreferences(payload, storage = browserStorage) {
  const preferences = {};
  for (const [key, [fallback, valid]] of Object.entries(specifications)) {
    let value = fallback;
    try {
      const saved = storage.getItem(key);
      const parsed = key === 'apex-active-section' ? saved : JSON.parse(saved);
      if (valid(parsed)) value = parsed;
    } catch { /* Export defaults for unavailable or invalid settings. */ }
    preferences[key] = value;
  }
  return { ...payload, preferences };
}

export function restoreBackupPreferences(preferences, storage = browserStorage) {
  if (preferences === undefined) return '';
  if (!validBackupPreferences(preferences)) return 'Invalid backup preferences.';
  const previous = [];
  try {
    for (const [key, value] of Object.entries(preferences)) {
      previous.push([key, storage.getItem(key)]);
      storage.setItem(key, key === 'apex-active-section' ? value : JSON.stringify(value));
    }
  } catch {
    for (const [key, value] of previous) {
      try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* Report the original storage failure. */ }
    }
    return 'Backup settings could not be saved to this browser.';
  }
  window.dispatchEvent(new window.CustomEvent(PREFERENCES_RESTORED, { detail: preferences }));
  return '';
}
