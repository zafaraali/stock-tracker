import React, { useState } from 'react';
import { History, Pencil, Plus, Trash2 } from 'lucide-react';

const createEmptyForm = () => ({
  id: '',
  holdingId: '',
  type: 'BUY',
  date: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })(),
  shares: '',
  price: '',
  total: ''
});

export function HistoryView({ transactions, holdings, summary, symbol, onSaveTransaction, onDeleteTransaction }) {
  const [form, setForm] = useState(createEmptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const openNewTransaction = () => {
    setForm({ ...createEmptyForm(), holdingId: holdings[0]?.id || '' });
    setIsFormOpen(true);
  };

  const editTransaction = transaction => {
    setForm({
      id: transaction.id,
      holdingId: transaction.holdingId || '',
      type: transaction.type,
      date: transaction.date,
      shares: transaction.shares || '',
      price: transaction.price || '',
      total: transaction.type === 'DIVIDEND' ? transaction.total : ''
    });
    setIsFormOpen(true);
  };

  const submitTransaction = event => {
    event.preventDefault();
    const holding = holdings.find(item => item.id === form.holdingId);
    if (!holding || !form.date) {
      alert('Select a holding and transaction date.');
      return;
    }

    if (form.type === 'DIVIDEND') {
      const amount = Number(form.total);
      if (!Number.isFinite(amount) || amount <= 0) {
        alert('Dividend payment must be greater than zero.');
        return;
      }
      onSaveTransaction({ ...form, total: amount, shares: 0, price: 0 });
    } else {
      const shares = Number(form.shares);
      const price = Number(form.price);
      if (!Number.isFinite(shares) || shares <= 0 || !Number.isFinite(price) || price <= 0) {
        alert('Shares and execution price must be greater than zero.');
        return;
      }
      if (form.type === 'SELL') {
          const candidate = { ...form, shares, price };
          const updatedTrades = [
            ...transactions.filter(transaction => transaction.id !== form.id),
            candidate
          ].filter(transaction => transaction.holdingId === holding.id && ['BUY', 'SELL'].includes(transaction.type))
            .sort((a, b) => a.date.localeCompare(b.date) ||
              (a.type === b.type ? String(a.id).localeCompare(String(b.id)) : a.type === 'BUY' ? -1 : 1));
          let availableShares = 0;
          const oversold = updatedTrades.some(trade => {
            if (trade.type === 'BUY') {
              availableShares += Number(trade.shares);
              return false;
            }
            if (Number(trade.shares) > availableShares + 1e-8) return true;
            availableShares -= Number(trade.shares);
            return false;
          });
          if (oversold) {
            alert(`This sell would exceed the shares available for ${holding.symbol} on its transaction date.`);
            return;
          }
      }
      onSaveTransaction({ ...form, shares, price });
    }
    setIsFormOpen(false);
    setForm(createEmptyForm());
  };

  const orderedTransactions = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" /> Transaction Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">Record buys, sells, and dividend payments. Buy and sell history recalculates shares and average cost.</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <span>Realized P/L: <strong className={summary.realizedGainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{symbol}{summary.realizedGainLoss.toFixed(2)}</strong></span>
          <span>Dividends received: <strong className="text-emerald-400">{symbol}{summary.dividendsReceived.toFixed(2)}</strong></span>
          <button onClick={openNewTransaction} className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold">
            <Plus className="w-4 h-4" /> Add transaction
          </button>
        </div>
      </div>

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
                <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orderedTransactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No transactions recorded yet.</td></tr>
              ) : orderedTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 text-slate-400 text-xs">{transaction.date}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      {transaction.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">{transaction.symbol}</td>
                  <td className="py-3.5 px-4">{transaction.type === 'DIVIDEND' ? '—' : transaction.shares}</td>
                  <td className="py-3.5 px-4">{transaction.type === 'DIVIDEND' ? '—' : `${symbol}${Number(transaction.price).toFixed(2)}`}</td>
                  <td className="py-3.5 px-4 font-bold text-white text-right">{symbol}{Number(transaction.total).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button onClick={() => editTransaction(transaction)} aria-label="Edit transaction" className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDeleteTransaction(transaction.id)} aria-label="Delete transaction" className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={submitTransaction} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">{form.id ? 'Edit transaction' : 'Add transaction'}</h3>
            <label className="block text-xs text-slate-400">
              Holding
              <select required value={form.holdingId} onChange={event => setForm({ ...form, holdingId: event.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Select a holding</option>
                {holdings.map(holding => <option key={holding.id} value={holding.id}>{holding.symbol}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-400">
                Type
                <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="DIVIDEND">Dividend</option>
                </select>
              </label>
              <label className="block text-xs text-slate-400">
                Date
                <input type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              </label>
            </div>
            {form.type === 'DIVIDEND' ? (
              <label className="block text-xs text-slate-400">
                Payment amount ({symbol})
                <input type="number" min="0.01" step="any" required value={form.total} onChange={event => setForm({ ...form, total: event.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-400">
                  Shares
                  <input type="number" min="0.00000001" step="any" required value={form.shares} onChange={event => setForm({ ...form, shares: event.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="block text-xs text-slate-400">
                  Price ({symbol})
                  <input type="number" min="0.00000001" step="any" required value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-400 text-xs font-semibold">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold">Save transaction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
