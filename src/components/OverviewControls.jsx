import { useState, useEffect, createContext } from 'react';

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
  return [layout, setLayout];
}

export function OverviewControls({ layout, onChange }) {
  const labels = { summary: 'Portfolio summary', cash: 'Available cash', charts: 'Allocation charts', insights: 'Portfolio insights', holdings: 'Top holdings' };
  return <details className="overview-customize no-print"><summary className="secondary-button cursor-pointer">Customize overview</summary><div className="overview-customize-panel">
    <p className="supporting-text">Choose sections and their reading order. Setup and data checks stay available.</p>
    {layout.order.map((key, index) => <div key={key} className="flex items-center gap-2 py-2"><label className="flex items-center gap-2 flex-1"><input type="checkbox" checked={!layout.hidden.includes(key)} onChange={event => onChange({ ...layout, hidden: event.target.checked ? layout.hidden.filter(value => value !== key) : [...layout.hidden, key] })} />{labels[key]}</label><button className="icon-button" disabled={index === 0} aria-label={`Move ${labels[key]} up`} onClick={() => { const order = [...layout.order]; [order[index - 1], order[index]] = [order[index], order[index - 1]]; onChange({ ...layout, order }); }}>↑</button><button className="icon-button" disabled={index === layout.order.length - 1} aria-label={`Move ${labels[key]} down`} onClick={() => { const order = [...layout.order]; [order[index], order[index + 1]] = [order[index + 1], order[index]]; onChange({ ...layout, order }); }}>↓</button></div>)}
    <button className="secondary-button" onClick={() => onChange({ order: DEFAULT_OVERVIEW, hidden: [] })}>Reset overview</button>
  </div></details>;
}
