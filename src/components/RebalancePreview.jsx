import { useState } from 'react';
import { buildRebalancePreview } from '../services/rebalancePreview';
import { formatMoney } from '../services/formatMoney';
import { Money } from './Money';
import { formatQuantity, formatPercent } from '../services/formatNumber';

export function RebalancePreview({ summary, currencyCode }) {
  const [fractional, setFractional] = useState(false);
  const [fee, setFee] = useState('0');
  const plan = buildRebalancePreview(summary, { fractional, fee: Number(fee) });
  const targets = summary.items.reduce((sum, item) => sum + Number(item.targetPercent || 0), 0);
  return <details className="overview-panel no-print"><summary className="cursor-pointer font-semibold">Preview proposed trades</summary><div className="space-y-4 pt-4"><p className="supporting-text">Planning only. This does not execute trades or create transactions. Quotes can change; review broker prices before trading.</p><div className="flex flex-wrap gap-4"><label className="flex gap-2 items-center"><input type="checkbox" checked={fractional} onChange={event => setFractional(event.target.checked)} />Allow fractional shares (6 decimals)</label><label>Estimated fee per trade, in each asset’s currency<input className="field" type="number" min="0" step="any" value={fee} onChange={event => setFee(event.target.value)} /></label></div>
    {Math.abs(targets - 100) > .1 && <p className="form-error">Provisional: targets total {targets.toFixed(2)}%, not 100%.</p>}
    {!plan.trades.length && <p className="supporting-text">No rounded trades to propose. Check targets, prices, and trade-size settings.</p>}
    <ul className="space-y-3">{plan.trades.map(trade => <li key={trade.id} className="rounded-xl border border-slate-800 p-3"><strong>{trade.action} <span className="private-quantity">{formatQuantity(trade.shares)}</span> {trade.symbol}</strong><p>Estimated trade value: <Money amount={formatMoney(trade.nativeValue, trade.currency)} /> · fee <Money amount={formatMoney(trade.fee, trade.currency)} /></p><p className="supporting-text">Target difference left by rounding: <Money amount={formatMoney(trade.roundingResidual, currencyCode)} /></p></li>)}</ul>
    {Object.entries(plan.required).map(([code, amount]) => { const available = summary.cashBalances[code] || 0; return <p key={code}>{code}: net cash needed including estimated fees <Money amount={formatMoney(Math.max(0, amount), code)} /> · available <Money amount={formatMoney(available, code)} /> · {amount > available ? <>shortfall <Money amount={formatMoney(amount - available, code)} /></> : <>cash after proposed trades <Money amount={formatMoney(available - amount, code)} /></>}</p>; })}
    {plan.unavailable.length > 0 && <p className="supporting-text">Not included: {plan.unavailable.join('; ')}.</p>}<p className="supporting-text">Sales fund buys only in the same currency. Estimates exclude taxes, bid–ask spreads, and FX conversions. Actual broker fees may differ.</p>
  </div></details>;
}
