import { useEffect, useState } from 'react';

export function usePreference(key, fallback, allowed) {
  const [value, setValue] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key)); return allowed.includes(saved) ? saved : fallback; } catch { return fallback; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Preference remains usable in memory. */ } }, [key, value]);
  return [value, setValue];
}
