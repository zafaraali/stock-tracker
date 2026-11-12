import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function DailyDismissible({ id, label, children }) {
  const storageKey = `apex-dismissed-${id}`;
  const [day, setDay] = useState(localDay);
  const [dismissedDay, setDismissedDay] = useState(() => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  });
  useEffect(() => {
    let timer;
    const refresh = () => {
      setDay(localDay());
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, midnight.getTime() - Date.now() + 50);
    };
    const sync = event => { if (event.key === storageKey) setDismissedDay(event.newValue); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', sync);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); window.removeEventListener('storage', sync); };
  }, [storageKey]);
  if (dismissedDay === day) return null;
  return <div className="daily-dismissible">
    {children}
    <button type="button" className="icon-button daily-dismiss-button" aria-label={`Dismiss ${label} for today`} title="Dismiss for today" onClick={() => {
      const today = localDay();
      setDismissedDay(today);
      try { localStorage.setItem(storageKey, today); } catch { /* Keep dismissal in memory. */ }
    }}><X size={16} aria-hidden="true" /></button>
  </div>;
}
