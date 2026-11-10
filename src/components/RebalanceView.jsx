import { Money } from './Money';
import { formatQuantity, formatPercent } from '../services/formatNumber';
import { RebalancePreview } from './RebalancePreview';
import { formatMoney } from '../services/formatMoney';
import React, { useEffect, useMemo, useState } from 'react';
import { Sliders, ArrowUpRight, ArrowDownRight, CheckCircle2, Target } from 'lucide-react';
import { isTseSymbol } from '../services/marketApi';
import { EmptyState } from './EmptyState';

export function RebalanceView({ summary, currencyCode = 'USD', onUpdateTarget, onAddHoldings }) {
  const [targetDrafts, setTargetDrafts] = useState({});
  const targetSignature = summary.items.map(item => `${item.id}:${item.targetPercent ?? 0}`).join('|');
  const targetDraftValues = useMemo(
    () => Object.fromEntries(summary.items.map(item => [item.id, String(item.targetPercent ?? 0)])),
    // Intentionally key this memo by target values, not the summary array identity,
    // so live price refreshes do not overwrite an in-progress edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetSignature]
  );

  useEffect(() => {
    setTargetDrafts(targetDraftValues);
  }, [targetDraftValues]);

  const totalTarget = summary.items.reduce((acc, item) => acc + (Number(item.targetPercent) || 0), 0);
  const required = summary.items.reduce((balances, item) => {
    const change = item.rebalanceAction === 'BUY' ? item.rebalanceDiffValue : item.rebalanceAction === 'SELL' ? -item.rebalanceDiffValue : 0;
    const native = item.currentPrice > 0 ? change / item.currentPrice * item.nativeCurrentPrice : 0;
    balances[item.currency] = (balances[item.currency] || 0) + native;
    return balances;
  }, {});
  const actionItems = summary.items.filter(item => item.rebalanceAction !== 'HOLD');
  const largestDrift = summary.items.reduce((largest, item) => {
    const drift = Math.abs(item.actualPercent - item.targetPercent);
    return drift > largest.drift ? { symbol: item.symbol, drift } : largest;
  }, { symbol: '—', drift: 0 });

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" /> Target Allocation & Rebalancing
          </h2>
          <p className="text-xs text-slate-400 mt-1">Define your target percentage for each asset. The tool will calculate precisely what to BUY or SELL.</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-right">
          <span className="text-[10px] text-slate-400 uppercase block">Total Target Allocation</span>
          <span className={`text-base font-bold ${Math.abs(totalTarget - 100) < 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {totalTarget.toFixed(1)}% {Math.abs(totalTarget - 100) >= 0.1 && '(Target should equal 100%)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Holdings needing action</span>
          <p className="text-2xl font-bold text-white mt-1">{actionItems.length}</p>
          <p className="text-xs text-slate-500 mt-1">Outside the ±0.5% rebalance tolerance</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Largest allocation drift</span>
          <p className="text-2xl font-bold text-indigo-300 mt-1">{largestDrift.drift.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">{largestDrift.symbol === '—' ? 'No holdings yet' : largestDrift.symbol}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">How to read this</span>
          <p className="text-xs text-slate-300 mt-2 flex items-start gap-2"><Target className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            Buy underweight assets and sell overweight assets to move toward target percentages.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm space-y-2">
        <p>Targets include holdings and available cash. Sales can fund buys in the same currency; these estimates exclude fees.</p>
        {Object.entries(required).map(([code, amount]) => <p key={code}>{code}: cash available <Money amount={formatMoney(summary.cashBalances[code] || 0, code)} /> · net cash required <Money amount={formatMoney(Math.max(0, amount), code)} /> · <strong className={amount > (summary.cashBalances[code] || 0) + 0.01 ? 'text-amber-400' : 'text-emerald-400'}>{amount > (summary.cashBalances[code] || 0) + 0.01 ? <>shortfall <Money amount={formatMoney(amount - (summary.cashBalances[code] || 0), code)} />; deposit or convert funds first</> : 'covered by cash and proposed sales'}</strong></p>)}
        {Math.abs(totalTarget - 100) >= 0.1 && <p className="text-amber-400">Complete your targets to 100% before using these provisional trade amounts.</p>}
      </div>
      <RebalancePreview summary={summary} currencyCode={currencyCode} />
      {/* Rebalance Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="financial-table responsive-table w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th data-label="Asset" className="py-3.5 px-4 font-semibold">Asset</th>
                <th data-label="Current Value" className="py-3.5 px-4 font-semibold">Current Value</th>
                <th data-label="Actual %" className="py-3.5 px-4 font-semibold">Actual %</th>
                <th data-label="Target % (Editable)" className="py-3.5 px-4 font-semibold">Target % (Editable)</th>
                <th data-label="Drift" className="py-3.5 px-4 font-semibold">Drift</th>
                <th data-label="Rebalance Action" className="py-3.5 px-4 font-semibold">Rebalance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary.items.length === 0 ? (
                <tr><td colSpan={6}><EmptyState compact title="Nothing to rebalance" description="Add holdings first, then set a target percentage for each holding here." actionLabel="Add holdings" onAction={onAddHoldings} /></td></tr>
              ) : (
                summary.items.map(item => {
                  const isBuy = item.rebalanceAction === 'BUY';
                  const isSell = item.rebalanceAction === 'SELL';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td data-label="Asset" className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{item.symbol}</span>
                          {(item.currency === 'CAD' || isTseSymbol(item.symbol)) && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold">
                              TSE · CAD
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{item.name}</div>
                      </td>
                      <td data-label="Current Value" className="py-3.5 px-4 font-bold text-white"><Money amount={formatMoney(item.totalValue, currencyCode)} /></td>
                      <td data-label="Actual %" className="py-3.5 px-4 font-semibold text-indigo-300">{formatPercent(item.actualPercent)}</td>
                      <td data-label="Target %" className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            aria-label={`Target allocation for ${item.symbol}`}
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            value={targetDrafts[item.id] ?? String(item.targetPercent ?? 0)}
                            onChange={(e) => setTargetDrafts(previous => ({ ...previous, [item.id]: e.target.value }))}
                            onBlur={() => {
                              const draft = targetDrafts[item.id];
                              onUpdateTarget(item.id, draft === '' ? 0 : draft);
                            }}
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </td>
                      <td data-label="Drift" className="py-3.5 px-4">
                        <div className={item.actualPercent - item.targetPercent > 0.5 ? 'text-rose-400' : item.actualPercent - item.targetPercent < -0.5 ? 'text-emerald-400' : 'text-slate-300'}>
                          {item.actualPercent - item.targetPercent > 0 ? '+' : ''}{(item.actualPercent - item.targetPercent).toFixed(1)} pp
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{item.rebalanceAction === 'HOLD' ? 'On target' : <><Money amount={formatMoney(item.rebalanceDiffValue, currencyCode)} /> {item.rebalanceAction === 'BUY' ? 'under' : 'over'}</>}</div>
                      </td>
                      <td data-label="Rebalance Action" className="py-3.5 px-4">
                        {item.rebalanceAction === 'HOLD' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Balanced (Hold)
                          </span>
                        ) : isBuy ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" /> BUY <span className="private-quantity">{formatQuantity(item.rebalanceShares)}</span> shares (<Money amount={formatMoney(item.rebalanceDiffValue, currencyCode)} />)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold">
                            <ArrowDownRight className="w-3.5 h-3.5" /> SELL <span className="private-quantity">{formatQuantity(item.rebalanceShares)}</span> shares (<Money amount={formatMoney(item.rebalanceDiffValue, currencyCode)} />)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
