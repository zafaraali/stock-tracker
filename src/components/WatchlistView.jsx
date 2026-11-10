import { Money } from './Money';
import { FilterPanel } from './FilterPanel';
import { formatMoney } from '../services/formatMoney';
import { Modal, FormError } from './Modal';
import { PriceStatus } from './PriceStatus';
import React, { useState } from 'react';
import { Eye, Plus, Trash2, Edit2, Check, ArrowRight, ExternalLink } from 'lucide-react';
import { INITIAL_CATEGORIES, CURRENCY_RATES } from '../data/mockData';
import { TickerAutocomplete } from './TickerAutocomplete';
import { isTseSymbol, detectSymbolCurrency } from '../services/marketApi';
import { toUSD } from '../hooks/usePortfolio';
import { EmptyState } from './EmptyState';
import { TickerLinks } from './TickerLinks';

export function WatchlistView({ watchlist, symbol, currencyCode = 'USD', customCategories = [], rate, fxRates, onAddWatchlistItem, onUpdateWatchlistPrice, onRemoveWatchlistItem, onAddHolding }) {
  const [formError, setFormError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [filter, setFilter] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const [convertToHoldingItem, setConvertToHoldingItem] = useState(null);
  const [convertShares, setConvertShares] = useState('10');
  const [convertBuyPrice, setConvertBuyPrice] = useState('');

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    currentPrice: '',
    targetBuyPrice: '',
    category: 'Tech',
    notes: '',
    currency: 'USD'
  });
  const visibleItems = watchlist.filter(item => {
    const query = filter.toLowerCase();
    return !query || item.symbol.toLowerCase().includes(query) || (item.name || '').toLowerCase().includes(query) || (item.notes || '').toLowerCase().includes(query);
  });

  const handleSymbolChange = (sym) => {
    const isCad = isTseSymbol(sym);
    setFormData(prev => ({
      ...prev,
      symbol: sym,
      currency: isCad ? 'CAD' : prev.currency
    }));
  };

  const handleTickerSelect = (ticker) => {
    const isCad = isTseSymbol(ticker.symbol) || ticker.currency === 'CAD';
    setFormData(prev => ({
      ...prev,
      symbol: ticker.symbol,
      name: ticker.name,
      category: ticker.category,
      currency: isCad ? 'CAD' : (ticker.currency || 'USD')
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const category = formData.category === 'Custom' ? customCategory.trim() : formData.category;
    const currentPrice = formData.currentPrice === '' ? 0 : Number(formData.currentPrice);
    const hasTargetBuyPrice = formData.targetBuyPrice !== '';
    const targetBuyPrice = hasTargetBuyPrice ? Number(formData.targetBuyPrice) : 0;
    if (!formData.symbol.trim() || !category || !Number.isFinite(currentPrice) || currentPrice < 0 ||
      (hasTargetBuyPrice && (!Number.isFinite(targetBuyPrice) || targetBuyPrice <= 0))) {
      setFormError('Enter a ticker. Current and target prices are optional.');
      return;
    }
    onAddWatchlistItem({ ...formData, category });
    setFormData({ symbol: '', name: '', currentPrice: '', targetBuyPrice: '', category: 'Tech', notes: '', currency: 'USD' });
    setCustomCategory('');
    setIsModalOpen(false);
  };

  const handleSaveInlinePrice = (id) => {
    const price = Number(editPriceVal);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Current price must be greater than zero.');
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
      setFormError('Enter shares and a buy price greater than zero.');
      return;
    }
    const itemCurrency = convertToHoldingItem.currency || detectSymbolCurrency(convertToHoldingItem.symbol);
    onAddHolding({
      symbol: convertToHoldingItem.symbol,
      name: convertToHoldingItem.name,
      shares,
      avgCost: buyPrice,
      currentPrice: convertToHoldingItem.currentPrice,
      category: convertToHoldingItem.category,
      dividendYield: 0,
      targetPercent: 10,
      currency: itemCurrency,
      notes: convertToHoldingItem.notes || ''
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
          <FormError message={formError} />
          <p className="text-xs text-slate-400 mt-1">Monitor stocks, cryptos, and ETFs before adding them to your portfolio.</p>
        </div>
        <div className="watchlist-banner-actions flex items-center gap-2"><button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition"
        >
          <Plus className="w-4 h-4" /> Add watchlist item
        </button></div>
      </div>

      <FilterPanel resultCount={visibleItems.length} totalCount={watchlist.length} label="ideas" activeCount={Number(Boolean(filter))} onReset={() => setFilter('')}><div className="watchlist-filter-controls"><input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter watchlist" aria-label="Filter watchlist" className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" /></div></FilterPanel>

      {/* Watchlist Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="financial-table responsive-table w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th data-label="Asset / Sector" className="py-3.5 px-4 font-semibold">Asset / Sector</th>
                <th data-label="Current Price" className="py-3.5 px-4 font-semibold">Current Price</th>
                <th data-label="Target Buy Price" className="py-3.5 px-4 font-semibold">Target Buy Price</th>
                <th data-label="Notes / Thesis" className="py-3.5 px-4 font-semibold">Notes / Thesis</th>
                <th data-label="Actions" className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleItems.length === 0 ? (
                <tr><td colSpan={5}><EmptyState compact title={filter ? 'No matching ideas' : 'Your watchlist is empty'} description={filter ? 'Try a different search term.' : 'Save an asset here before adding it to your portfolio.'} actionLabel={!filter ? 'Add watchlist item' : undefined} onAction={!filter ? () => setIsModalOpen(true) : undefined} /></td></tr>
              ) : (
                visibleItems.map(item => {
                  const isEditing = editingId === item.id;
                  const itemCurrency = item.currency || detectSymbolCurrency(item.symbol);
                  const curPriceUSD = toUSD(item.currentPrice, itemCurrency, fxRates);
                  const targetBuyPriceUSD = item.targetBuyPrice > 0 ? toUSD(item.targetBuyPrice, itemCurrency, fxRates) : 0;
                  const curPriceNum = curPriceUSD * rate;
                  const targetNum = targetBuyPriceUSD * rate;
                  const isNearTarget = item.targetBuyPrice > 0 && item.currentPrice <= item.targetBuyPrice;
                  const isCad = itemCurrency === 'CAD' || isTseSymbol(item.symbol);
                  const nativeSymbol = CURRENCY_RATES[itemCurrency]?.symbol || itemCurrency;
                  const displayCurrencyDiffers = nativeSymbol !== symbol;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td data-label="Asset / Sector" className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{item.symbol}</span><TickerLinks symbol={item.symbol} />
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">{item.category}</span>
                          {isCad && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold">
                              TSE · CAD
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{item.name}</div>
                        <PriceStatus item={item} />
                      </td>
                      <td data-label="Current Price" className="py-3.5 px-4">
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
                            <span className="text-[10px] text-slate-400 font-bold">{itemCurrency}</span>
                            <button onClick={() => handleSaveInlinePrice(item.id)} aria-label="Save current price" className="p-1 bg-emerald-600 text-white rounded">
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span><Money amount={formatMoney(item.currentPrice, itemCurrency)} /></span>
                            {displayCurrencyDiffers && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                (<Money amount={formatMoney(curPriceNum, currencyCode)} />)
                              </span>
                            )}
                            <button onClick={() => { setEditingId(item.id); setEditPriceVal(item.currentPrice); }} className="text-indigo-400 hover:text-indigo-300" aria-label={`Edit current price for ${item.symbol}`} title="Edit price">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td data-label="Target Buy Price" className="py-3.5 px-4">
                        <div className="text-xs text-slate-300 font-medium">
                          {item.targetBuyPrice > 0 ? formatMoney(item.targetBuyPrice, itemCurrency) : 'Not set'}
                          {isCad && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              (<Money amount={formatMoney(targetNum, currencyCode)} />)
                            </span>
                          )}
                        </div>
                        {isNearTarget && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 mt-0.5 inline-block">
                            Target reached
                          </span>
                        )}
                      </td>
                      <td data-label="Notes / Thesis" className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate" title={item.notes}>
                        {item.notes || 'No notes'}
                      </td>
                      <td data-label="Actions" className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenConvert(item)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                            title="Add to holdings"
                          >
                            Add to holdings <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onRemoveWatchlistItem(item.id)}
                            className="danger-button p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            aria-label={`Delete ${item.symbol} from watchlist`} title="Delete"
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

      {/* Add watchlist item Modal */}
      {isModalOpen && (
        <Modal title="Add watchlist item" onClose={() => { setIsModalOpen(false); setFormError(''); }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <form onChange={() => setFormError('')} onSubmit={handleSubmit} className="space-y-4">
              <FormError message={formError} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ticker Symbol</label>
                  <TickerAutocomplete
                    value={formData.symbol}
                    onChange={handleSymbolChange}
                    onSelect={handleTickerSelect}
                    placeholder="Search GOOGL, SHOP.TO, or TSE:RY"
                  />
                  {isTseSymbol(formData.symbol) && (
                    <span className="text-[10px] text-red-400 font-semibold mt-1 block">TSE/TSX stock detected (CAD)</span>
                  )}
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
                    {[...new Set([...INITIAL_CATEGORIES, ...customCategories])].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="Custom">Custom…</option>
                  </select>
                  {formData.category === 'Custom' && <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Custom sector/category" className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" required />}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Asset Currency</label>
                  <select
                    value={formData.currency || 'USD'}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="USD">USD ($) - US Markets</option>
                    <option value="CAD">CAD (CA$) - TSE / TSX</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <details className="optional-fields"><summary>Optional prices, income & notes</summary><div className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Current Price ({formData.currency || 'USD'}) <span className="normal-case font-normal">(optional)</span></label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="e.g. 150.00"
                    value={formData.currentPrice}
                    onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Buy Price ({formData.currency || 'USD'})</label>
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

              </div></details>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">Save watchlist item</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Convert to Holding Modal */}
      {convertToHoldingItem && (
        <Modal title="Add holding" onClose={() => { setConvertToHoldingItem(null); setFormError(''); }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <p className="text-xs text-slate-400 mb-4">Add <strong className="text-white">{convertToHoldingItem.symbol}</strong> to your active holdings list.</p>
            <form onChange={() => setFormError('')} onSubmit={handleConfirmConvert} className="space-y-4">
              <FormError message={formError} />
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
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Average Buy Price ({convertToHoldingItem.currency || detectSymbolCurrency(convertToHoldingItem.symbol)})
                </label>
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
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">Add holding</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

    </div>
  );
}
