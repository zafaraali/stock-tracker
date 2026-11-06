import React from 'react';
import { Sliders, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';

export function RebalanceView({ summary, symbol, onUpdateTarget }) {
  const totalTarget = summary.items.reduce((acc, item) => acc + (Number(item.targetPercent) || 0), 0);

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

      {/* Rebalance Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Asset</th>
                <th className="py-3.5 px-4 font-semibold">Current Value</th>
                <th className="py-3.5 px-4 font-semibold">Actual %</th>
                <th className="py-3.5 px-4 font-semibold">Target % (Editable)</th>
                <th className="py-3.5 px-4 font-semibold">Rebalance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary.items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No positions found. Add holdings first.</td></tr>
              ) : (
                summary.items.map(item => {
                  const isBuy = item.rebalanceAction === 'BUY';
                  const isSell = item.rebalanceAction === 'SELL';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-base">{item.symbol}</div>
                        <div className="text-xs text-slate-400">{item.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{symbol}{item.totalValue.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-semibold text-indigo-300">{item.actualPercent.toFixed(1)}%</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            value={item.targetPercent}
                            onChange={(e) => onUpdateTarget(item.id, e.target.value)}
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.rebalanceAction === 'HOLD' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Balanced (Hold)
                          </span>
                        ) : isBuy ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" /> BUY {item.rebalanceShares} shares ({symbol}{item.rebalanceDiffValue.toFixed(2)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold">
                            <ArrowDownRight className="w-3.5 h-3.5" /> SELL {item.rebalanceShares} shares ({symbol}{item.rebalanceDiffValue.toFixed(2)})
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
