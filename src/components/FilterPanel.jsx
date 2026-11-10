import { useEffect, useState } from 'react';

export function FilterPanel({ children, activeCount = 0, onReset, resetLabel = 'Reset filters', resultCount, totalCount, label = 'items' }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setOpen(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return <details className="filter-panel no-print" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Filter &amp; display{activeCount > 0 && <span className="filter-count"> · {activeCount} active</span>}{resultCount !== undefined && <span className="filter-results"> · {resultCount} of {totalCount} {label}</span>}</summary><div className="filter-panel-content">{children}{activeCount > 0 && onReset && <button type="button" className="secondary-button" onClick={onReset}>{resetLabel}</button>}</div>
  </details>;
}
