import React, { useState } from 'react';
import { Eye, Plus, Trash2, Edit2, Check, ArrowRight, ExternalLink } from 'lucide-react';
import { INITIAL_CATEGORIES } from '../data/mockData';

export function WatchlistView({ watchlist, symbol, rate, onAddWatchlistItem, onUpdateWatchlistPrice, onRemoveWatchlistItem, onAddHolding }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  const [convertToHoldingItem, setConvertToHoldingItem] = useState(null);
  const [convertShares, setConvertShares] = useState('10');
  const [convertBuyPrice, setConvertBuyPrice] = useState('');

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    currentPrice: '',
    targetBuyPrice: '',
    category: 'Tech',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentPrice = Number(formData.currentPrice);
    const targetBuyPrice = formData.targetBuyPrice === '' ? currentPrice : Number(formData.targetBuyPrice);
    if (!formData.symbol.trim() || !Number.isFinite(currentPrice) || currentPrice <= 0 ||
      !Number.isFinite(targetBuyPrice) || targetBuyPrice <= 0) {
      alert('Enter a ticker and current/target prices greater than zero.');
      return;
    }
    onAddWatchlistItem(formData);
    setFormData({ symbol: '', name: '', currentPrice: '', targetBuyPrice: '', category: 'Tech', notes: '' });
    setIsModalOpen(false);
  };

  const handleSaveInlinePrice = (id) => {
    const price = Number(editPriceVal);
    if (!Number.isFinite(price) || price <= 0) {
      alert('Current price must be greater than zero.');
      return;
    }
    onUpdateWatchlistPrice(id, price);
    setEditingId(null);
    setEditPriceVal('');
  };

  const handleOpenConvert = (item) => {
    setConvertToHoldingItem(item);
    setConvertBuyPrice(item.currentPrice);
    setConvertShares('10');
  };

  const handleConfirmConvert = (e) => {
    e.preventDefault();
    if (!convertToHoldingItem) return;
    const shares = Number(convertShares);
    const buyPrice = Number(convertBuyPrice);
    if (!Number.isFinite(shares) || shares <= 0 || !Number.isFinite(buyPrice) || buyPrice <= 0) {
      alert('Enter shares and a buy price greater than zero.');
      return;
    }
    onAddHolding({
      symbol: convertToHoldingItem.symbol,
      name: convertToHoldingItem.name,
      shares,
      avgCost: buyPrice,
      currentPrice: convertToHoldingItem.currentPrice,
      category: convertToHoldingItem.category,
      dividendYield: 0,
      targetPercent: 10,
      notes: convertToHoldingItem.notes || 'Converted from Watchlist'
    });
    onRemoveWatchlistItem(convertToHoldingItem.id);
    setConvertToHoldingItem(null);
  };

  return (
    <div className="space-y-6 mb-16 sm:mb-8">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" /> Asset Watchlist & Investment Ideas
          </h2>
          <p className="text-xs text-slate-400 mt-1">Monitor stocks, cryptos, and ETFs before adding them to your portfolio.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition"
        >
          <Plus className="w-4 h-4" /> Add Watchlist Item
        </button>
      </div>

      {/* Watchlist Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Asset / Sector</th>
                <th className="py-3.5 px-4 font-semibold">Current Price</th>
                <th className="py-3.5 px-4 font-semibold">Target Buy Price</th>
                <th className="py-3.5 px-4 font-semibold">Notes / Thesis</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {watchlist.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No watchlist items found. Click "Add Watchlist Item" to begin tracking.</td></tr>
              ) : (
                watchlist.map(item => {
                  const isEditing = editingId === item.id;
                  const curPriceNum = item.currentPrice * rate;
                  const targetNum = item.targetBuyPrice * rate;
                  const isNearTarget = item.currentPrice <= item.targetBuyPrice;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{item.symbol}</span>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">{item.category}</span>
                        </div>
                        <div className="text-xs text-slate-400">{item.name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0.00000001"
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(e.target.value)}
                              placeholder={item.currentPrice}
                              className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                              autoFocus
                            />
                            <button onClick={() => handleSaveInlinePrice(item.id)} className="p-1 bg-emerald-600 text-white rounded">
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span>{symbol}{curPriceNum.toFixed(2)}</span>
                            <button onClick={() => { setEditingId(item.id); setEditPriceVal(item.currentPrice); }} className="text-indigo-400 hover:text-indigo-300" title="Edit price">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-300 font-medium">{symbol}{targetNum.toFixed(2)}</div>
                        {isNearTarget && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 mt-0.5 inline-block">
                            🎯 Reached Target!
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate" title={item.notes}>
                        {item.notes || 'No notes'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenConvert(item)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                            title="Convert to Portfolio Position"
                          >
                            Buy <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onRemoveWatchlistItem(item.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Watchlist Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Watchlist Asset</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ticker Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. GOOGL"
                    value={formData.symbol}
                    onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Asset Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alphabet Inc."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Category / Sector</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    {INITIAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Current Price ($)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="e.g. 150.00"
                    value={formData.currentPrice}
                    onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Buy Price ($)</label>
                <input
                  type="number"
                  step="any"
                  min="0.00000001"
                  placeholder="e.g. 140.00"
                  value={formData.targetBuyPrice}
                  onChange={e => setFormData({ ...formData, targetBuyPrice: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Investment Notes / Thesis</label>
                <textarea
                  placeholder="Why are you watching this asset?"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">Save Watchlist Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Holding Modal */}
      {convertToHoldingItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Convert Watchlist to Holding</h3>
            <p className="text-xs text-slate-400 mb-4">Add <strong className="text-white">{convertToHoldingItem.symbol}</strong> to your active portfolio positions.</p>
            <form onSubmit={handleConfirmConvert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Number of Shares</label>
                <input
                  type="number"
                  step="any"
                  min="0.00000001"
                  value={convertShares}
                  onChange={e => setConvertShares(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Average Buy Price ($)</label>
                <input
                  type="number"
                  step="any"
                  min="0.00000001"
                  value={convertBuyPrice}
                  onChange={e => setConvertBuyPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setConvertToHoldingItem(null)} className="px-4 py-2 text-slate-400 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">Confirm Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
