import { Money } from './Money';
import { formatMoney } from '../services/formatMoney';
import { entryRate } from '../services/ledger';

export function changeSinceSnapshot({ snapshots, transactions, holdings, summary, rate, historicalFx, netContributionsUSD, scope, allowLegacy = true, today = new Date().toLocaleDateString('en-CA') }) {
  const previous = [...snapshots].filter(item => (item.accountScope ? item.accountScope === scope : allowLegacy) && item.date < today && Number.isFinite(item.valueUSD) && Number.isFinite(item.netContributionsUSD)).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!previous || !(rate > 0)) return null;
  const entries = transactions.filter(entry => entry.date > previous.date);
  const total = type => entries.filter(entry => entry.type === type).reduce((sum, entry) => sum + Number(entry.total || 0) / entryRate(entry, holdings, historicalFx), 0) * rate;
  const valueChange = summary.totalValue - previous.valueUSD * rate;
  const netFlows = (netContributionsUSD - previous.netContributionsUSD) * rate;
  const movers = (previous.holdingPrices || []).flatMap(saved => {
    const current = holdings.find(item => item.id === saved.id && item.symbol === saved.symbol && item.currency === saved.currency);
    if (!current || !(saved.price > 0) || !(current.currentPrice > 0) || entries.some(entry => entry.holdingId === saved.id && entry.type === 'SPLIT')) return [];
    return [{ symbol: saved.symbol, percent: (current.currentPrice / saved.price - 1) * 100 }];
  }).sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)).slice(0, 3);
  return { date: previous.date, valueChange, deposits: total('DEPOSIT'), withdrawals: total('WITHDRAW'), netFlows, otherChange: valueChange - netFlows, movers };
}

export function WhatChanged(props) {
  const change = props.enabled ? changeSinceSnapshot(props) : null;
  return <details className="no-print"><summary className="secondary-button cursor-pointer">What changed?</summary><div className="overview-customize-panel">
    {!change ? <p className="supporting-text">{props.enabled ? 'A previous-day snapshot is needed. This summary will become available after you use the app on another day.' : 'View Combined · All lists to compare portfolio-wide snapshots consistently.'}</p> : <>
      <p className="supporting-text">Since {change.date}, using today’s display-currency exchange rate for both portfolio values.</p>
      <dl className="change-summary">{[['Portfolio value change', change.valueChange], ['Recorded deposits', change.deposits], ['Recorded withdrawals', change.withdrawals], ['Net external flows', change.netFlows], ['Change excluding external flows', change.otherChange]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><Money amount={formatMoney(value, props.currency, { signed: true })} /></dd></div>)}</dl>
      <p className="supporting-text">External flows include trades recorded outside tracked cash. Remaining change includes prices, income, currency effects, and record edits—not a pure investment return. Changes dated on or before the snapshot may revise the comparison.</p>
      {change.movers.length ? <div className="mt-3"><h3 className="font-semibold">Largest price moves</h3><ul>{change.movers.map(item => <li key={item.symbol}>{item.symbol}: {item.percent > 0 ? '+' : ''}{item.percent.toFixed(2)}%</li>)}</ul><p className="supporting-text">Native-currency price changes, not position gains. Split-affected holdings are excluded.</p></div> : <p className="supporting-text mt-3">Price-mover comparisons need per-holding prices in a previous-day snapshot. New snapshots now record them.</p>}
    </>}
  </div></details>;
}
