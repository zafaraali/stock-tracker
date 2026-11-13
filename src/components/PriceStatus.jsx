export function PriceStatus({ item, onEdit }) {
  const date = item.priceUpdatedAt && new Date(item.priceUpdatedAt);
  const hasDate = date && Number.isFinite(date.getTime());
  const recent = hasDate && Date.now() - date.getTime() < 15 * 60 * 1000;
  const stale = !hasDate || Date.now() - date.getTime() >= 24 * 60 * 60 * 1000;
  const label = item.priceSource === 'manual' ? 'Manual' : item.priceSource === 'live' && recent && !item.priceRefreshFailed ? 'Market' : stale ? 'Stale saved' : 'Saved';
  const detail = hasDate ? date.toLocaleString() : 'time unknown';
  const age = hasDate ? Date.now() - date.getTime() : Infinity;
  const relative = !hasDate ? 'time unknown' : age < 60 * 1000 ? 'just now' : age < 60 * 60 * 1000 ? `${Math.floor(age / 60000)}m ago` : age < 24 * 60 * 60 * 1000 ? `${Math.floor(age / 3600000)}h ago` : `${Math.floor(age / 86400000)}d ago`;
  return <span className={`price-status-badge ${stale || item.priceRefreshFailed ? 'text-amber-500 is-stale' : 'text-slate-400'} ${hasDate && age < 15 * 60 * 1000 ? 'is-recent' : ''}`} title={`${label} price · ${detail}${item.priceRefreshFailed ? ' · Refresh unavailable; showing the saved price.' : ''}`}>
    <span aria-hidden="true" className="price-status-dot" />{label} price
    <span className="price-status-date"> · Updated {detail} <span className="price-status-relative">({relative})</span>{item.priceRefreshFailed ? ' · Refresh unavailable' : ''}</span>
    {onEdit && (stale || item.priceRefreshFailed) && <button type="button" className="secondary-button no-print" aria-label={`Review price for ${item.symbol}`} onClick={onEdit}>Update price</button>}
  </span>;
}
