import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../services/formatMoney';

const money = formatMoney;
const returnColor = value => value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-400';
const returnLabel = value => `${value > 0 ? '+' : ''}${Number(value || 0).toFixed(1)}%`;

export function PortfolioInsights({ summary, currencyCode = 'USD' }) {
  const cashPercent = Number.isFinite(summary.cashAllocation)
    ? summary.cashAllocation
    : summary.totalValue > 0 ? (summary.cashValue / summary.totalValue) * 100 : 0;
  const targetGap = Math.abs(100 - Number(summary.totalTargetPercent || 0));
  const winners = [...summary.items].sort((a, b) => b.gainLossPercent - a.gainLossPercent).slice(0, 3);
  const losers = [...summary.items].sort((a, b) => a.gainLossPercent - b.gainLossPercent).slice(0, 3);
  const alerts = summary.items.flatMap(item => {
    const messages = [];
    const drift = Number(item.actualPercent || 0) - Number(item.targetPercent || 0);
    if (Math.abs(drift) > 5) messages.push(`${item.symbol} is ${Math.abs(drift).toFixed(1)} percentage points ${drift > 0 ? 'over' : 'under'} its target.`);
    if (!Number(item.targetPercent || 0)) messages.push(`${item.symbol} has no target allocation.`);
    const updatedAt = item.priceUpdatedAt ? new Date(item.priceUpdatedAt).getTime() : 0;
    if (updatedAt && Date.now() - updatedAt > 24 * 60 * 60 * 1000) messages.push(`${item.symbol} price is more than a day old.`);
    return messages;
  });

  return (
    <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 mb-6" aria-labelledby="insights-title">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 id="insights-title" className="text-lg font-bold text-white">Portfolio insights</h2>
          <p className="text-sm text-slate-400 mt-1">Quick checks for concentration, cash, and allocation quality.</p>
        </div>
        {targetGap < 0.01 ? <span className="text-xs rounded-full px-3 py-1 bg-emerald-500/10 text-emerald-400">Targets total 100%</span> : <span className="text-xs rounded-full px-3 py-1 bg-amber-500/10 text-amber-400">Targets off by {targetGap.toFixed(1)}%</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-slate-800/60 p-4"><p className="text-xs text-slate-400">Cash allocation</p><p className="text-xl font-semibold mt-1">{cashPercent.toFixed(1)}%</p><p className="text-xs text-slate-500 mt-1">{money(summary.cashValue, currencyCode)} available</p></div>
        <div className="rounded-xl bg-slate-800/60 p-4"><p className="text-xs text-slate-400">Holdings</p><p className="text-xl font-semibold mt-1">{summary.items.length}</p><p className="text-xs text-slate-500 mt-1">Across {summary.categoryBreakdown.length} categories</p></div>
        <div className="rounded-xl bg-slate-800/60 p-4"><p className="text-xs text-slate-400">Income yield</p><p className="text-xl font-semibold mt-1">{Number(summary.portfolioYield || 0).toFixed(2)}%</p><p className="text-xs text-slate-500 mt-1">{money(summary.annualDividend, currencyCode)} estimated / year</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><h3 className="text-sm font-semibold text-slate-300 mb-2">Top performers</h3>{winners.length ? <ul className="space-y-2">{winners.map(item => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.symbol}</span><span className={returnColor(item.gainLossPercent)}>{returnLabel(item.gainLossPercent)}</span></li>)}</ul> : <p className="text-sm text-slate-500">Add holdings to see performance.</p>}</div>
        <div><h3 className="text-sm font-semibold text-slate-300 mb-2">Lowest returns</h3>{losers.length ? <ul className="space-y-2">{losers.map(item => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.symbol}</span><span className={returnColor(item.gainLossPercent)}>{returnLabel(item.gainLossPercent)}</span></li>)}</ul> : <p className="text-sm text-slate-500">Add holdings to see performance.</p>}</div>
      </div>
      <details className="mt-5 pt-5 border-t border-slate-800" aria-labelledby="alerts-title">
        <summary className="cursor-pointer flex items-center justify-between gap-3">
          <h3 id="alerts-title" className="text-sm font-semibold text-white">Portfolio alerts</h3>
          <span className={`text-xs rounded-full px-3 py-1 ${alerts.length ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {alerts.length ? `${alerts.length} to review` : 'No alerts'}
          </span>
        </summary>
        <div className="pt-3">
        {alerts.length ? <ul className="space-y-2">{alerts.slice(0, 5).map((message, index) => <li key={`${message}-${index}`} className="flex items-start gap-2 text-sm text-slate-300"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />{message}</li>)}</ul> : <p className="flex items-center gap-2 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-emerald-400" />Your current targets and saved prices look healthy.</p>}
        {alerts.length > 5 && <p className="text-xs text-slate-500 mt-2">Showing the first 5 alerts.</p>}
        </div>
      </details>
    </section>
  );
}
