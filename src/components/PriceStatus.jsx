export function PriceStatus({ item }) {
  const date = item.priceUpdatedAt && new Date(item.priceUpdatedAt);
  const recent = date && Date.now() - date.getTime() < 15 * 60 * 1000;
  const label = item.priceSource === 'manual' ? 'Manual' : item.priceSource === 'live' && recent && !item.priceRefreshFailed ? 'Market' : 'Saved';
  return <div className="text-[10px] text-slate-400 mt-1">{label} price · {date && Number.isFinite(date.getTime()) ? date.toLocaleString() : 'time unknown'}{item.priceRefreshFailed ? ' · refresh unavailable' : ''}</div>;
}
