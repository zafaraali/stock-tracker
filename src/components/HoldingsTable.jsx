import { Modal, FormError } from './Modal';
import { PriceStatus } from './PriceStatus';
import React, { useState } from 'react';
import { Trash2, Plus, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Edit2, Check, FileText, X } from 'lucide-react';
import { INITIAL_CATEGORIES } from '../data/mockData';
import { TickerAutocomplete } from './TickerAutocomplete';
import { isTseSymbol } from '../services/marketApi';
import { EmptyState } from './EmptyState';

export function HoldingsTable({ summary, symbol, onAddHolding, onUpdateHoldingPrice, onUpdateHoldingNotes, onRemoveHolding, onExportCSV, globalFilter = '' }) {
  const [formError, setFormError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('symbol');

  const [notesModalId, setNotesModalId] = useState(null);
  const [notesVal, setNotesVal] = useState('');

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    shares: '',
    avgCost: '',
    currentPrice: '',
    category: 'Tech',
    dividendYield: '',
    targetPercent: '',
    notes: '',
    currency: 'USD'
  });
  const activeFilter = globalFilter || filter;
  const visibleItems = [...summary.items]
    .filter(item => item.symbol.toLowerCase().includes(activeFilter.toLowerCase()) ||
      (item.name || '').toLowerCase().includes(activeFilter.toLowerCase()))
    .sort((a, b) => sortBy === 'value'
      ? b.totalValue - a.totalValue
      : sortBy === 'gain'
        ? b.gainLoss - a.gainLoss
        : a.symbol.localeCompare(b.symbol));

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
    const shares = Number(formData.shares);
    const hasCurrentPrice = formData.currentPrice !== '';
    const hasAvgCost = formData.avgCost !== '';
    const currentPrice = hasCurrentPrice ? Number(formData.currentPrice) : hasAvgCost ? Number(formData.avgCost) : 0;
    const avgCost = hasAvgCost ? Number(formData.avgCost) : currentPrice;
    const dividendYield = Number(formData.dividendYield || 0);
    const targetPercent = Number(formData.targetPercent || 0);
    if (!formData.symbol.trim() || !Number.isFinite(shares) || shares <= 0 ||
      (hasAvgCost && (!Number.isFinite(avgCost) || avgCost <= 0)) ||
      (hasCurrentPrice && (!Number.isFinite(currentPrice) || currentPrice <= 0)) ||
      !Number.isFinite(dividendYield) || dividendYield < 0 || dividendYield > 100 ||
      !Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setFormError('Enter a ticker and positive shares. Prices are optional and can be filled from live market data.');
      return;
    }
    onAddHolding(formData);
    setFormData({ symbol: '', name: '', shares: '', avgCost: '', currentPrice: '', category: 'Tech', dividendYield: '', targetPercent: '', notes: '', currency: 'USD' });
    setIsModalOpen(false);
  };

  const handleSaveInlinePrice = (id) => {
    const price = Number(editPriceVal);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Current price must be greater than zero.');
      return;
    }
    onUpdateHoldingPrice(id, price);
    setEditingId(null);
    setEditPriceVal('');
  };

  const handleSaveNotes = (id) => {
    onUpdateHoldingNotes(id, notesVal);
    setNotesModalId(null);
    setNotesVal('');
  };

  return (
    <div className="holdings-panel bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl mb-16 sm:mb-8">
      
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Portfolio Holdings & Dividend Tracker</h2>
          <FormError message={formError} />
          <p className="text-xs text-slate-400">Track asset sectors, passive dividend income, targets, and manual market prices</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Filter holdings"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          />
          <select
            value={sortBy}
            onChange={event => setSortBy(event.target.value)}
            aria-label="Sort holdings"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="symbol">Sort: Symbol</option>
            <option value="value">Sort: Value</option>
            <option value="gain">Sort: Gain</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" /> Add Position
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="financial-table w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
            <tr>
              <th data-label="Asset / Sector" className="py-3.5 px-4 font-semibold">Asset / Sector</th>
              <th data-label="Shares" className="py-3.5 px-4 font-semibold">Shares</th>
              <th data-label="Buy / Current Price" className="py-3.5 px-4 font-semibold">Buy / Current Price</th>
              <th data-label="Target & Dividend" className="py-3.5 px-4 font-semibold">Target & Dividend</th>
              <th data-label="Total Value" className="py-3.5 px-4 font-semibold">Total Value</th>
              <th data-label="Gain / Loss" className="py-3.5 px-4 font-semibold">Gain / Loss</th>
              <th data-label="Actions" className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={7}><EmptyState compact title={activeFilter ? 'No matching holdings' : 'Your portfolio is empty'} description={activeFilter ? 'Try a different search term.' : 'Add a position or import a broker CSV to get started.'} actionLabel={!activeFilter ? 'Add position' : undefined} onAction={!activeFilter ? () => setIsModalOpen(true) : undefined} /></td>
              </tr>
            ) : (
              visibleItems.map((item) => {
                const isPositive = item.gainLoss >= 0;
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td data-label="Asset / Sector" className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{item.symbol}</span>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">{item.category || 'Other'}</span>
                        {(item.currency === 'CAD' || isTseSymbol(item.symbol)) && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold">
                            TSE · CAD
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[160px]">{item.name}</div>
                      <PriceStatus item={item} />
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-[180px]" title={item.notes}>
                          "{item.notes}"
                        </div>
                      )}
                    </td>
                    <td data-label="Shares" className="py-3.5 px-4 font-medium">{item.shares}</td>
                    <td data-label="Buy / Current Price" className="py-3.5 px-4">
                      <div className="text-xs text-slate-400">Buy: {symbol}{item.avgCost.toFixed(2)}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0.00000001"
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(e.target.value)}
                              placeholder={item.nativeCurrentPrice ?? item.currentPriceUSD}
                              className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <span className="text-[10px] text-slate-400 font-bold">{item.currency || 'USD'}</span>
                            <button onClick={() => handleSaveInlinePrice(item.id)} aria-label="Save current price" className="p-1 bg-emerald-600 text-white rounded">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setEditingId(null); setEditPriceVal(''); }} aria-label="Cancel price edit" className="p-1 bg-slate-700 text-slate-200 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <span>Now: {symbol}{item.currentPrice.toFixed(2)}</span>
                            {item.currency === 'CAD' && Number.isFinite(item.nativeCurrentPrice) && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                (CA${item.nativeCurrentPrice.toFixed(2)})
                              </span>
                            )}
                            <button onClick={() => { setEditingId(item.id); setEditPriceVal(item.nativeCurrentPrice ?? item.currentPriceUSD); }} className="text-indigo-400 hover:text-indigo-300" title="Edit current price">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Target & Dividend" className="py-3.5 px-4">
                      <div className="text-xs text-indigo-300">Target: {item.targetPercent || 0}% (Actual: {item.actualPercent.toFixed(1)}%)</div>
                      <div className="text-[11px] text-emerald-400 mt-0.5">{item.dividendYield || 0}% Yield (+{symbol}{item.annualDividend.toFixed(2)}/yr)</div>
                    </td>
                    <td data-label="Total Value" className="py-3.5 px-4 font-bold text-white">{symbol}{item.totalValue.toFixed(2)}</td>
                    <td data-label="Gain / Loss" className="py-3.5 px-4">
                      <div className={`inline-flex items-center gap-1 font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {symbol}{Math.abs(item.gainLoss).toFixed(2)} ({item.gainLossPercent.toFixed(2)}%)
                      </div>
                    </td>
                    <td data-label="Actions" className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setNotesModalId(item.id); setNotesVal(item.notes || ''); }}
                          className={`p-1.5 rounded-lg transition ${item.notes ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                          title="Investment Notes / Journal"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveHolding(item.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          title="Delete Position"
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

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-slate-800">
        {visibleItems.length === 0 ? (
          <EmptyState compact title={activeFilter ? 'No matching holdings' : 'Your portfolio is empty'} description={activeFilter ? 'Try a different search term.' : 'Add a position or import a broker CSV to get started.'} actionLabel={!activeFilter ? 'Add position' : undefined} onAction={!activeFilter ? () => setIsModalOpen(true) : undefined} />
        ) : (
          visibleItems.map((item) => {
            const isPositive = item.gainLoss >= 0;
            const isEditing = editingId === item.id;

            return (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{item.symbol}</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">{item.category || 'Other'}</span>
                    {(item.currency === 'CAD' || isTseSymbol(item.symbol)) && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold">
                        TSE · CAD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setNotesModalId(item.id); setNotesVal(item.notes || ''); }} aria-label="Edit holding notes" className="p-2 text-indigo-400"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => onRemoveHolding(item.id)} aria-label="Delete holding" className="p-2 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="text-xs text-slate-400">{item.name}</div>
                      <PriceStatus item={item} />
                {item.notes && <div className="text-xs text-slate-500 italic bg-slate-950 p-2 rounded">"{item.notes}"</div>}

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">Shares / Buy:</span>
                    <span className="font-semibold text-white">{item.shares} @ {symbol}{item.avgCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Current Price:</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="any"
                          min="0.00000001"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          placeholder={item.nativeCurrentPrice ?? item.currentPriceUSD}
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-white"
                          autoFocus
                        />
                        <button onClick={() => handleSaveInlinePrice(item.id)} aria-label="Save current price" className="p-1 bg-emerald-600 text-white rounded"><Check className="w-3 h-3" /></button>
                        <button onClick={() => { setEditingId(null); setEditPriceVal(''); }} aria-label="Cancel price edit" className="p-1 bg-slate-700 text-slate-200 rounded"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-bold text-white">
                        <span>{symbol}{item.currentPrice.toFixed(2)}</span>
                        {item.currency === 'CAD' && Number.isFinite(item.nativeCurrentPrice) && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            (CA${item.nativeCurrentPrice.toFixed(2)})
                          </span>
                        )}
                        <button onClick={() => { setEditingId(item.id); setEditPriceVal(item.nativeCurrentPrice ?? item.currentPriceUSD); }} aria-label="Edit current price" className="text-indigo-400"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Total Value: <strong className="text-white">{symbol}{item.totalValue.toFixed(2)}</strong></span>
                  <span className={`font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {symbol}{Math.abs(item.gainLoss).toFixed(2)} ({item.gainLossPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Position Modal */}
      {isModalOpen && (
        <Modal title="Add asset position" onClose={() => { setIsModalOpen(false); setFormError(''); }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <form onChange={() => setFormError('')} onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">Add an existing position without changing cash. To buy more using tracked cash, record a BUY in Transactions.</p>
              <FormError message={formError} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ticker Symbol</label>
                  <TickerAutocomplete
                    value={formData.symbol}
                    onChange={handleSymbolChange}
                    onSelect={handleTickerSelect}
                    placeholder="Search AAPL, SHOP.TO, or TSE:RY"
                  />
                  {isTseSymbol(formData.symbol) && (
                    <span className="text-[10px] text-red-400 font-semibold mt-1 block">TSE/TSX stock detected (CAD)</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Asset Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple Inc."
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

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Shares / Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="e.g. 10"
                    value={formData.shares}
                    onChange={e => setFormData({ ...formData, shares: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Average Buy Price ({formData.currency || 'USD'}) <span className="normal-case font-normal text-slate-500">optional</span></label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="Defaults to current price"
                    value={formData.avgCost}
                    onChange={e => setFormData({ ...formData, avgCost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Current Price ({formData.currency || 'USD'}) <span className="normal-case font-normal text-slate-500">optional</span></label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="e.g. 150.25"
                    value={formData.currentPrice}
                    onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Dividend Yield (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder="e.g. 2.5"
                    value={formData.dividendYield}
                    onChange={e => setFormData({ ...formData, dividendYield: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Allocation (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder="e.g. 20"
                    value={formData.targetPercent}
                    onChange={e => setFormData({ ...formData, targetPercent: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Investment Notes / Thesis</label>
                <textarea
                  placeholder="Why did you buy this asset? Target price or strategy..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">Save Position</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Notes Modal */}
      {notesModalId && (
        <Modal title="Investment notes" onClose={() => setNotesModalId(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <p className="text-xs text-slate-400 mb-4">Record your thesis, strategy, or target milestones for this asset.</p>
            <textarea
              value={notesVal}
              onChange={e => setNotesVal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 resize-none"
              placeholder="Enter notes here..."
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setNotesModalId(null)} className="px-4 py-2 text-slate-400 text-xs font-semibold">Cancel</button>
              <button onClick={() => handleSaveNotes(notesModalId)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">Save Notes</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
