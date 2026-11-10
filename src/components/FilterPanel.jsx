import { useEffect, useState } from 'react';

export function FilterPanel({ children }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setOpen(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return <details className="filter-panel no-print" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Filter &amp; display</summary><div className="filter-panel-content">{children}</div>
  </details>;
}
