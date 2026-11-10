import { useState } from 'react';
import { Modal } from './Modal';

export function BulkHoldingEditor({ items, allItems, onApply }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [category, setCategory] = useState('');
  const [target, setTarget] = useState('');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const active = selected.filter(id => items.some(item => item.id === id));
  const valid = active.length > 0 && (category.trim() || target !== '') && (target === '' || Number.isFinite(Number(target)) && Number(target) >= 0 && Number(target) <= 100);
  const total = allItems.reduce((sum, item) => sum + (target !== '' && active.includes(item.id) ? Number(target) : Number(item.targetPercent || 0)), 0);
  return <><button className="secondary-button" disabled={!items.length} onClick={() => { setOpen(true); setReview(false); setError(''); }}>Bulk edit holdings</button>{open && <Modal title="Bulk edit holdings" onClose={() => setOpen(false)}><p className="supporting-text mb-3">Select from the current filtered view. Only category and target allocation can change; shares, costs, and transactions stay untouched.</p>
    <div className="flex flex-wrap items-center gap-2 my-3"><span role="status">{active.length} selected</span><button className="secondary-button" disabled={review} onClick={() => setSelected(items.map(item => item.id))}>Select visible</button><button className="secondary-button" disabled={review || !active.length} onClick={() => setSelected([])}>Clear selection</button></div>
    <div className="max-h-48 overflow-auto">{items.map(item => <label key={item.id} className="flex gap-2 items-center py-2"><input type="checkbox" disabled={review} checked={active.includes(item.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.symbol} · {item.name}</label>)}</div>
    <label className="block mt-3">Category (leave blank to keep)<input className="field" value={category} disabled={review} onChange={event => setCategory(event.target.value)} /></label><label className="block mt-3">Target percentage for EACH selected holding (leave blank to keep)<input className="field" type="number" min="0" max="100" step="any" value={target} disabled={review} onChange={event => setTarget(event.target.value)} /></label>
    {review && <p className="form-error my-3">Apply to {active.length} holdings: {category.trim() ? `category → ${category.trim()}. ` : ''}{target !== '' ? `Each target → ${target}%. Portfolio targets after edit: ${total.toFixed(2)}%.` : 'Targets unchanged.'}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="flex justify-end gap-2 mt-4"><button className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>{review ? <><button className="secondary-button" onClick={() => setReview(false)}>Back</button><button className="primary-button" onClick={() => { const result = onApply(active, { ...(category.trim() ? { category: category.trim() } : {}), ...(target !== '' ? { targetPercent: Number(target) } : {}) }); if (result === true) { setOpen(false); setSelected([]); } else setError(result || 'Could not apply changes.'); }}>Apply changes</button></> : <button className="primary-button" disabled={!valid} onClick={() => { if (target !== '' && total > 100.000001) setError('These targets would exceed 100%. Lower the per-holding target.'); else { setReview(true); setError(''); } }}>Review changes</button>}</div>
  </Modal>}</>;
}
