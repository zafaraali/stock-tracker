import { PREFERENCES_RESTORED } from '../services/backupPreferences';
import { useEffect, useState } from 'react';

export function usePreference(key, fallback, allowed) {
  const [value, setValue] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key)); return allowed.includes(saved) ? saved : fallback; } catch { return fallback; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Preference remains usable in memory. */ } }, [key, value]);
  useEffect(() => {
    const restore = event => { if (Object.hasOwn(event.detail, key) && allowed.includes(event.detail[key])) setValue(event.detail[key]); };
    window.addEventListener(PREFERENCES_RESTORED, restore);
    return () => window.removeEventListener(PREFERENCES_RESTORED, restore);
  }, [key, allowed]);
  return [value, setValue];
}
