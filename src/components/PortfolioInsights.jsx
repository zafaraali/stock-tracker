import React from 'react';

const money = (value, symbol) => `${symbol}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PortfolioInsights({ summary, symbol }) {
  const cashPercent = Number.isFinite(summary.cashAllocation)
    ? summary.cashAllocation
    : summary.totalValue > 0 ? (summary.cashValue / summary.totalValue) * 100 : 0;
  const targetGap = Math.abs(100 - Number(summary.totalTargetPercent || 0));
  const winners = [...summary.items].sort((a, b) => b.gainLossPercent - a.gainLossPercent).slice(0, 3);
  const losers = [...summary.items].sort((a, b) => a.gainLossPercent - b.gainLossPercent).slice(0, 3);

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
        <div className="rounded-xl bg-slate-800/60 p-4"><p className="text-xs text-slate-400">Cash allocation</p><p className="text-xl font-semibold mt-1">{cashPercent.toFixed(1)}%</p><p className="text-xs text-slate-500 mt-1">{money(summary.cashValue, symbol)} available</p></div>
        <div className="rounded-xl bg-slate-800/60 p-4"><p className="text-xs text-slate-400">Holdings</p><p className="text-xl font-semibold mt-1">{summary.items.length}</p><p className="text-xs text-slate-500 mt-1">Across {summary.categoryBreakdown.length} categories</p></div>
        <div className="rounded-xl bg-slate-800/60 p-4"><p className="text-xs text-slate-400">Income yield</p><p className="text-xl font-semibold mt-1">{Number(summary.portfolioYield || 0).toFixed(2)}%</p><p className="text-xs text-slate-500 mt-1">{money(summary.annualDividend, symbol)} estimated / year</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><h3 className="text-sm font-semibold text-emerald-400 mb-2">Top performers</h3>{winners.length ? <ul className="space-y-2">{winners.map(item => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.symbol}</span><span className="text-emerald-400">+{Number(item.gainLossPercent || 0).toFixed(1)}%</span></li>)}</ul> : <p className="text-sm text-slate-500">Add holdings to see performance.</p>}</div>
        <div><h3 className="text-sm font-semibold text-rose-400 mb-2">Needs attention</h3>{losers.length ? <ul className="space-y-2">{losers.map(item => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.symbol}</span><span className={item.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{item.gainLossPercent >= 0 ? '+' : ''}{Number(item.gainLossPercent || 0).toFixed(1)}%</span></li>)}</ul> : <p className="text-sm text-slate-500">Add holdings to see performance.</p>}</div>
      </div>
    </section>
  );
}
