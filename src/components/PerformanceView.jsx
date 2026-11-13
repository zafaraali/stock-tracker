import { Money } from './Money';
import { calculatePeriodReturn } from '../services/periodReturn';
import { formatMoney } from '../services/formatMoney';
import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { EmptyState } from './EmptyState';
import React, { lazy, Suspense } from 'react';

const PerformanceComparisonChart = lazy(() => import('./PerformanceComparisonChart').then(module => ({ default: module.PerformanceComparisonChart })));

const percent = value => `${Number(value || 0) >= 0 ? '+' : ''}${Number(value || 0).toFixed(2)}%`;


export function PerformanceView({ performance, transactions, netContributionsUSD, backtestHistory, summary, currencyCode = 'USD', rate, theme, historyLoading, historyError, onRetryHistory, onManageHoldings, onRecordDeposit }) {
  const points = [...performance].sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length || (points.length < 2 && !summary.items.length && !summary.totalValue)) return <section className="overview-panel"><EmptyState title={summary.items.length ? 'Start tracking performance' : 'Add holdings to track performance'} description={summary.items.length ? 'Your holdings are ready. Record an opening deposit to establish contributed capital. Returns need a starting snapshot and at least one later observation.' : 'Add your current holdings, then record a deposit to distinguish investment gains from money you contribute.'} actionLabel={summary.items.length ? 'Record deposit' : 'Add holding'} onAction={summary.items.length ? onRecordDeposit : onManageHoldings} /><p className="supporting-text text-center">Snapshots are saved automatically as the portfolio changes. Refreshing prices alone cannot create historical returns.</p></section>;
  const today = new Date();
  const oneYear = new Date(today);
  oneYear.setFullYear(oneYear.getFullYear() - 1);
  const investedCapital = Number(netContributionsUSD || 0) * rate || Number(summary?.totalCost || 0);
  const investmentGain = Number(summary?.totalValue || 0) - investedCapital;
  const currentReturnPercent = investedCapital > 0 ? investmentGain / investedCapital * 100 : 0;
  const periods = [
    { label: 'YTD', value: calculatePeriodReturn(points, `${today.getFullYear()}-01-01`) },
    { label: '1 year', value: calculatePeriodReturn(points, oneYear.toISOString().slice(0, 10)) },
    { label: 'Since tracking', value: calculatePeriodReturn(points, points[0].date) }
  ];
  const flows = transactions.filter(transaction => ['DEPOSIT', 'WITHDRAW'].includes(transaction.type)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const card = `${theme === 'light' ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800'} border rounded-2xl p-5`;
  return (
    <div className="space-y-6">
      <Suspense fallback={<section className="overview-panel" aria-label="Loading comparison chart" role="status"><p className="supporting-text">Preparing comparison chart…</p></section>}><PerformanceComparisonChart backtestHistory={backtestHistory} summary={summary} theme={theme} loading={historyLoading} refreshError={historyError} onRetry={onRetryHistory} /></Suspense>
      <header className={`${card} page-view-header flex justify-between gap-4`}>
        <div><p className="text-xs uppercase tracking-wide text-indigo-400">Performance analytics</p><h2 className="text-2xl font-bold mt-1">Portfolio performance</h2><p className="text-sm text-slate-400 mt-2">Return is based on current portfolio value compared with net external capital contributed.</p></div>
        <Activity className="w-8 h-8 text-indigo-400" />
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}><p className="text-xs text-slate-400 uppercase">Portfolio return</p><p className={`text-2xl font-bold mt-2 ${currentReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{percent(currentReturnPercent)}</p><p className="text-xs text-slate-500 mt-1">Against net contributions</p></div>
        <div className={card}><p className="text-xs text-slate-400 uppercase">Net invested capital</p><p className="text-2xl font-bold mt-2"><Money amount={formatMoney(investedCapital, currencyCode)} /></p><p className="text-xs text-slate-500 mt-1">Deposits less withdrawals</p></div>
        <div className={card}><p className="text-xs text-slate-400 uppercase">Investment gain</p><p className={`text-2xl font-bold mt-2 ${investmentGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}><Money amount={formatMoney(investmentGain, currencyCode, { signed: true })} /></p></div>
        <div className={card}><p className="text-xs text-slate-400 uppercase">Tracking snapshots</p><p className="text-2xl font-bold mt-2">{points.length}</p><p className="text-xs text-slate-500 mt-1">Daily portfolio observations</p></div>
      </section>
      <section className={`${card} overflow-hidden`}>
        <h3 className="font-semibold mb-4">Return by period</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{periods.map(period => <div key={period.label} className="rounded-xl border border-slate-800 p-4"><p className="text-xs text-slate-400">{period.label}</p><p className={`text-xl font-semibold mt-2 ${period.value === null ? 'text-slate-400' : period.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{period.value === null ? '—' : percent(period.value * 100)}</p><p className="text-xs text-slate-500 mt-1">{period.value === null ? 'Not enough history' : 'Flow-adjusted portfolio return'}</p></div>)}</div>
      </section>
      <section className={`${card} overflow-hidden`}>
        <h3 className="font-semibold mb-4">Contributions and withdrawals</h3>
        {!flows.length ? <EmptyState compact title="No external cash flows recorded" description="Record a deposit to separate contributed capital from investment return." actionLabel="Record deposit" onAction={onRecordDeposit} /> : <div className="overflow-x-auto"><table className="financial-table w-full text-sm"><thead className="text-slate-400 border-b border-slate-800"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{flows.map(transaction => <tr key={transaction.id}><td className="p-3">{transaction.date}</td><td className="p-3 flex items-center gap-2">{transaction.type === 'DEPOSIT' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}{transaction.type}</td><td className="p-3 text-right"><Money amount={formatMoney(transaction.total, transaction.currency || 'USD')} /></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
