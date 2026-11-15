import { useEffect, useRef } from 'react';
import { X, Edit2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Money } from './Money';
import { formatMoney } from '../services/formatMoney';
import { formatPercent, formatQuantity } from '../services/formatNumber';
import { holdingDisplay } from '../services/holdingDisplay';
import { PriceStatus } from './PriceStatus';

export function HoldingInspector({ item, currencyCode, valueCurrencyMode, history = [], transactions = [], onClose, onEdit }) {
  const closeButton = useRef(null);
  const display = holdingDisplay(item, valueCurrencyMode, currencyCode);
  const points = (history.find(series => series.symbol === item.symbol.toUpperCase())?.points || [])
    .filter(point => Number.isFinite(point.close)).slice(-90);
  const activity = transactions.filter(entry => entry.holdingId === item.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 1439px)').matches) closeButton.current?.closest('aside')?.scrollIntoView({ block: 'nearest' });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <aside className="holding-inspector" aria-labelledby="holding-inspector-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <header className="inspector-header"><div><h2 id="holding-inspector-title">{item.symbol}</h2><p className="supporting-text">{item.name || item.category}</p></div><button ref={closeButton} className="icon-button" aria-label="Close holding details" onClick={onClose}><X size={16} /></button></header>
    <p className="inspector-value"><Money amount={formatMoney(display.value, display.currency)} /></p>
    <p className={display.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}><Money amount={formatMoney(display.gain, display.currency)} /> · {formatPercent(display.percent)}</p>
    <section aria-label="Recent closing prices" className="inspector-chart"><h3>Price history</h3><p className="supporting-text">Up to 90 trading days · {item.currency || 'USD'}</p>{points.length > 1 ? <ResponsiveContainer width="100%" height={150}><AreaChart data={points}><XAxis dataKey="date" hide /><YAxis hide domain={['auto', 'auto']} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8 }} formatter={value => [formatMoney(value, item.currency || 'USD'), 'Close']} /><Area dataKey="close" stroke="var(--accent-text, var(--accent))" fill="var(--accent)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <p className="supporting-text inspector-empty">Price history isn’t available yet.</p>}</section>
    <dl className="inspector-facts">{[
      ['Shares', <Money key="shares" amount={formatQuantity(item.shares)} />],
      ['Average cost', <Money key="cost" amount={formatMoney(display.cost, display.currency)} />],
      ['Current price', <Money key="price" amount={formatMoney(display.price, display.currency)} />],
      ['Dividend yield', formatPercent(item.dividendYield || 0)],
      ['Estimated annual dividend', <Money key="dividend" amount={formatMoney(display.annualDividend || 0, display.currency)} />],
      ['Sector', item.category || 'Other']
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <PriceStatus item={item} onEdit={onEdit} />
    {item.notes && <section><h3>Notes</h3><p className="supporting-text inspector-notes">{item.notes}</p></section>}
    <section><h3>Recent transactions</h3>{activity.length ? <ul className="inspector-activity">{activity.map(entry => <li key={entry.id}><span>{entry.type.charAt(0) + entry.type.slice(1).toLowerCase()}<small>{entry.date}</small></span>{entry.type === 'SPLIT' ? <span>{entry.ratio}:1 split</span> : <Money amount={formatMoney(['BUY', 'SELL'].includes(entry.type) ? Number(entry.shares || 0) * Number(entry.price || 0) + (entry.type === 'BUY' ? 1 : -1) * Number(entry.fee || 0) : entry.total || 0, entry.currency || item.currency || 'USD')} />}</li>)}</ul> : <p className="supporting-text">No transactions recorded for this holding.</p>}</section>
    <button className="secondary-button" onClick={onEdit}><Edit2 size={14} />Edit holding</button>
  </aside>;
}
