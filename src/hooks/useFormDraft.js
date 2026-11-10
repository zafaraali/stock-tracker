import { useEffect, useState } from 'react';

export function useFormDraft(key) {
  const read = () => { try { const value = JSON.parse(window.sessionStorage.getItem(key)); return value && typeof value === 'object' && typeof value.type === 'string' && typeof value.date === 'string' && !value.id ? value : null; } catch { return null; } };
  const [draft, setDraft] = useState(read);
  useEffect(() => { setDraft(read()); /* Each holdings-list scope has its own draft. */ }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = value => { if (value.id) return; setDraft(value); try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep current form usable. */ } };
  const clear = () => { setDraft(null); try { window.sessionStorage.removeItem(key); } catch { /* In-memory reset. */ } };
  return { draft, save, clear };
}
