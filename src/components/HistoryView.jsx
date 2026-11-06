import React from 'react';
import { History, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function HistoryView({ transactions, symbol }) {
  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" /> Transaction Audit Trail
        </h2>
        <p className="text-xs text-slate-400 mt-1">Chronological ledger of your recorded buy and position additions.</p>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold">Symbol</th>
                <th className="py-3.5 px-4 font-semibold">Shares</th>
                <th className="py-3.5 px-4 font-semibold">Execution Price</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">No transactions recorded yet.</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-slate-400 text-xs">{tx.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{tx.symbol}</td>
                    <td className="py-3.5 px-4">{tx.shares}</td>
                    <td className="py-3.5 px-4">{symbol}{tx.price.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-bold text-white text-right">{symbol}{tx.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
