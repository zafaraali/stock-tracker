export function PriceStatus({ item }) {
  const date = item.priceUpdatedAt && new Date(item.priceUpdatedAt);
  const hasDate = date && Number.isFinite(date.getTime());
  const recent = hasDate && Date.now() - date.getTime() < 15 * 60 * 1000;
  const stale = !hasDate || Date.now() - date.getTime() >= 24 * 60 * 60 * 1000;
  const label = item.priceSource === 'manual' ? 'Manual' : item.priceSource === 'live' && recent && !item.priceRefreshFailed ? 'Market' : stale ? 'Stale saved' : 'Saved';
  const detail = hasDate ? date.toLocaleString() : 'time unknown';
  return <span className={`price-status-badge ${stale || item.priceRefreshFailed ? 'text-amber-500' : 'text-slate-400'}`} title={`${label} price · ${detail}${item.priceRefreshFailed ? ' · Refresh unavailable; showing the saved price.' : ''}`}>
    <span aria-hidden="true" className="price-status-dot" />{label} price
    <span className="sr-only"> · {detail}{item.priceRefreshFailed ? ' · Refresh unavailable' : ''}</span>
  </span>;
}
