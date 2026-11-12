import { PREFERENCES_RESTORED } from '../services/backupPreferences';
import { useState, useEffect, createContext } from 'react';
import { GripVertical } from 'lucide-react';

export const PrivacyContext = createContext(false);
export const DEFAULT_OVERVIEW = ['summary', 'cash', 'charts', 'insights', 'holdings'];

export function useOverviewLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('apex-overview-layout'));
      if (saved && Array.isArray(saved.order) && saved.order.length === DEFAULT_OVERVIEW.length && new Set(saved.order).size === DEFAULT_OVERVIEW.length && saved.order.every(key => DEFAULT_OVERVIEW.includes(key))) return { order: saved.order, hidden: Array.isArray(saved.hidden) ? saved.hidden.filter(key => DEFAULT_OVERVIEW.includes(key)) : [] };
    } catch { /* Defaults remain usable without storage. */ }
    return { order: DEFAULT_OVERVIEW, hidden: [] };
  });
  useEffect(() => { try { localStorage.setItem('apex-overview-layout', JSON.stringify(layout)); } catch { /* In-memory preference. */ } }, [layout]);
  useEffect(() => {
    const restore = event => { if (event.detail['apex-overview-layout']) setLayout(event.detail['apex-overview-layout']); };
    window.addEventListener(PREFERENCES_RESTORED, restore);
    return () => window.removeEventListener(PREFERENCES_RESTORED, restore);
  }, []);
  return [layout, setLayout];
}

export function OverviewControls({ layout, onChange }) {
  const [dragged, setDragged] = useState(null);
  const [target, setTarget] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const move = (key, destination) => {
    if (!key || !destination || key === destination) return;
    const order = layout.order.filter(value => value !== key);
    order.splice(layout.order.indexOf(destination), 0, key);
    onChange({ ...layout, order });
    setAnnouncement(`Section moved to position ${order.indexOf(key) + 1} of ${order.length}.`);
  };
  const labels = { summary: 'Portfolio summary', cash: 'Available cash', charts: 'Allocation charts', insights: 'Portfolio insights', holdings: 'Top holdings' };
  return <details className="overview-customize no-print"><summary className="secondary-button cursor-pointer">Customize overview</summary><div className="overview-customize-panel">
    <p className="supporting-text">Drag cards to reorder sections, or use the arrow buttons. Uncheck a section to hide it.</p>
    <ol className="overview-order-list" aria-label="Dashboard section order">{layout.order.map((key, index) => <li key={key} data-overview-key={key} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', key); event.dataTransfer.effectAllowed = 'move'; setDragged(key); }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setTarget(key); }} onDrop={event => { event.preventDefault(); move(dragged, key); setDragged(null); setTarget(null); }} onDragEnd={() => { setDragged(null); setTarget(null); }} className={`overview-order-card ${dragged === key ? 'is-dragging' : ''} ${target === key && dragged !== key ? 'is-drop-target' : ''}`}><span className="overview-drag-handle" aria-hidden="true" onPointerDown={event => { if (event.pointerType === 'mouse') return; event.currentTarget.setPointerCapture(event.pointerId); setDragged(key); }} onPointerMove={event => { if (!dragged || event.pointerType === 'mouse') return; const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-overview-key]'); setTarget(card?.dataset.overviewKey || null); }} onPointerUp={() => { move(dragged, target); setDragged(null); setTarget(null); }} onPointerCancel={() => { setDragged(null); setTarget(null); }}><GripVertical size={18} /></span><label className="flex items-center gap-2 flex-1"><input type="checkbox" checked={!layout.hidden.includes(key)} onChange={event => onChange({ ...layout, hidden: event.target.checked ? layout.hidden.filter(value => value !== key) : [...layout.hidden, key] })} />{labels[key]}</label><button className="icon-button" disabled={index === 0} aria-label={`Move ${labels[key]} up`} onClick={() => { const order = [...layout.order]; [order[index - 1], order[index]] = [order[index], order[index - 1]]; onChange({ ...layout, order }); }}>↑</button><button className="icon-button" disabled={index === layout.order.length - 1} aria-label={`Move ${labels[key]} down`} onClick={() => { const order = [...layout.order]; [order[index], order[index + 1]] = [order[index + 1], order[index]]; onChange({ ...layout, order }); }}>↓</button></li>)}</ol><p className="sr-only" role="status">{announcement}</p>
    <button className="secondary-button" onClick={() => onChange({ order: DEFAULT_OVERVIEW, hidden: [] })}>Reset overview</button>
  </div></details>;
}
