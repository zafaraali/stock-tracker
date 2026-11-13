import { Money } from './Money';
import { BulkHoldingEditor } from './BulkHoldingEditor';
import { FilterPanel } from './FilterPanel';
import { DividendSource } from './DividendSource';
import { usePreference } from '../hooks/usePreference';
import { holdingDisplay } from '../services/holdingDisplay';
import { CurrencyMode } from './CurrencyMode';
import { Pagination } from './Pagination';
import { usePagination } from '../hooks/usePagination';
import { formatMoney } from '../services/formatMoney';
import { Modal, FormError } from './Modal';
import { PriceStatus } from './PriceStatus';
import React, { useState, useRef, useEffect } from 'react';
import { formatQuantity, formatPercent } from '../services/formatNumber';
import { Trash2, Plus, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Edit2, Check, FileText, X } from 'lucide-react';
import { CURRENCY_RATES, INITIAL_CATEGORIES } from '../data/mockData';
import { TickerAutocomplete } from './TickerAutocomplete';
import { fetchMarketFundamentals, isTseSymbol, searchMarketSymbols, inferSymbolMetadata } from '../services/marketApi';
import { EmptyState } from './EmptyState';
import { TickerLinks } from './TickerLinks';

export function HoldingsTable({ summary, onBulkUpdate, initialFilter = '', reviewSymbol = '', currencyCode = 'USD', customCategories = [], valueCurrencyMode = 'display', setValueCurrencyMode, onAddHolding, onUpdateHolding, onUpdateHoldingPrice, onUpdateHoldingNotes, onRemoveHolding, onExportCSV, onImportCSV }) {
  const [formError, setFormError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [savedHoldingId, setSavedHoldingId] = useState(null);
  const restoreRow = useRef(null);
  const focusPrice = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [staleOnly, setStaleOnly] = useState(false);
  const [sortBy, setSortBy] = usePreference('apex-holdings-sort', 'symbol', ['symbol', 'value', 'gain']);
  const [sortDirection, setSortDirection] = usePreference('apex-holdings-direction', 'asc', ['asc', 'desc']);
  const [pageSize, setPageSize] = usePreference('apex-holdings-page-size', 10, [10, 20, 50, 100]);

  const [notesModalId, setNotesModalId] = useState(null);
  const [notesVal, setNotesVal] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const showSaveNotice = (message, id = null) => {
    setSaveNotice(message);
    setSavedHoldingId(id);
    window.setTimeout(() => {
      setSaveNotice('');
      setSavedHoldingId(null);
    }, 2600);
  };

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
    , assetType: 'Stock', exchange: ''
  });
  const activeFilter = filter;
  const staleCount = summary.items.filter(item => !item.priceUpdatedAt || Date.now() - Date.parse(item.priceUpdatedAt) >= 24 * 60 * 60 * 1000).length;
  const visibleItems = [...summary.items]
    .filter(item => (item.symbol.toLowerCase().includes(activeFilter.toLowerCase()) ||
      (item.name || '').toLowerCase().includes(activeFilter.toLowerCase())) && (!staleOnly || !item.priceUpdatedAt || Date.now() - Date.parse(item.priceUpdatedAt) >= 24 * 60 * 60 * 1000))
    .sort((a, b) => {
      const comparison = sortBy === 'value' ? a.totalValue - b.totalValue : sortBy === 'gain' ? a.gainLoss - b.gainLoss : a.symbol.localeCompare(b.symbol);
      return (sortDirection === 'asc' ? 1 : -1) * (comparison || a.symbol.localeCompare(b.symbol));
    });
  const pagination = usePagination(visibleItems, `${filter}|${sortBy}|${sortDirection}|${pageSize}`, pageSize);
  useEffect(() => {
    if (isModalOpen && focusPrice.current) {
      const frame = window.requestAnimationFrame(() => { const input = document.querySelector('.modal-panel input[name="currentPrice"]'); if (input) { input.closest('details').open = true; input.focus(); input.scrollIntoView({ block: 'nearest' }); focusPrice.current = false; } });
      return () => window.cancelAnimationFrame(frame);
    }
    if (isModalOpen || !restoreRow.current) return undefined;
    const id = restoreRow.current;
    const index = visibleItems.findIndex(item => item.id === id);
    if (index < 0) { restoreRow.current = null; return undefined; }
    const page = Math.floor(index / pageSize) + 1;
    if (pagination.page !== page) { pagination.setPage(page); return undefined; }
    const frame = window.requestAnimationFrame(() => { const row = [...document.querySelectorAll('[data-holding-id]')].find(element => element.dataset.holdingId === id && element.getClientRects().length); if (row) { row.focus({ preventScroll: true }); row.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } restoreRow.current = null; });
    return () => window.cancelAnimationFrame(frame);
  }, [isModalOpen, visibleItems, pagination, pageSize]);


  const handleSymbolChange = (sym) => {
    const isCad = isTseSymbol(sym);
    setFormData(prev => ({
      ...prev,
      symbol: sym,
      currency: isCad ? 'CAD' : prev.currency,
      ...inferSymbolMetadata(sym)
    }));
  };

  const handleTickerSelect = (ticker) => {
    const isCad = isTseSymbol(ticker.symbol) || ticker.currency === 'CAD';
    const dividendYield = Number(ticker.dividendYield);
    setFormData(prev => ({
      ...prev,
      symbol: ticker.symbol,
      name: ticker.name,
      category: ticker.category,
      currency: isCad ? 'CAD' : (ticker.currency || 'USD'),
      assetType: ticker.assetType || (ticker.category === 'ETF' ? 'ETF' : 'Stock'),
      exchange: ticker.exchange || inferSymbolMetadata(ticker.symbol).exchange,
      ...(Number.isFinite(dividendYield) && dividendYield > 0 ? { dividendYield: Number(dividendYield.toFixed(2)) } : {})
    }));
    fetchMarketFundamentals(ticker.symbol).then(fundamentals => {
      setFormData(prev => prev.symbol.toUpperCase() === ticker.symbol.toUpperCase() ? { ...prev, dividendYield: Number(Number(fundamentals.dividendYield || 0).toFixed(2)) } : prev);
    }).catch(() => {});
  };

  React.useEffect(() => {
    const symbol = formData.symbol.trim();
    if (!symbol || symbol.length < 2) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchMarketSymbols(symbol, controller.signal).then(results => {
        const match = results.find(item => item.symbol.toUpperCase() === symbol.toUpperCase());
        if (match) handleTickerSelect(match);
      }).catch(() => {});
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [formData.symbol]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const category = formData.category === 'Custom' ? customCategory.trim() : formData.category;
    const shares = Number(formData.shares);
    const hasCurrentPrice = formData.currentPrice !== '';
    const hasAvgCost = formData.avgCost !== '' && Number(formData.avgCost) > 0;
    const hasInvalidAvgCost = formData.avgCost !== '' && (!Number.isFinite(Number(formData.avgCost)) || Number(formData.avgCost) < 0);
    const currentPrice = hasCurrentPrice ? Number(formData.currentPrice) : hasAvgCost ? Number(formData.avgCost) : 0;
    const avgCost = hasAvgCost ? Number(formData.avgCost) : currentPrice;
    const dividendYield = Number(formData.dividendYield || 0);
    const targetPercent = Number(formData.targetPercent || 0);
    const payload = { ...formData, category, dividendYield: Number(dividendYield.toFixed(2)), avgCost: editingHoldingId && !hasAvgCost ? '' : formData.avgCost };
    if (!formData.symbol.trim()) {
      setFormError('Enter a ticker symbol to continue.');
      return;
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      setFormError('Shares or quantity must be greater than zero.');
      return;
    }
    if (hasInvalidAvgCost) {
      setFormError('Average cost must be zero or greater.');
      return;
    }
    if (hasCurrentPrice && (!Number.isFinite(currentPrice) || currentPrice <= 0)) {
      setFormError('Current price must be greater than zero.');
      return;
    }
    if (!Number.isFinite(dividendYield) || dividendYield < 0 || dividendYield > 100) {
      setFormError('Dividend yield must be between 0% and 100%.');
      return;
    }
    if (!Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setFormError('Target allocation must be between 0% and 100%.');
      return;
    }
    if (!category) {
      setFormError('Choose a category or enter a custom category.');
      return;
    }
    const saved = editingHoldingId
      ? onUpdateHolding(editingHoldingId, payload)
      : (onAddHolding(payload), true);
    if (!saved) return;
    restoreRow.current = editingHoldingId;
    setFormData({ symbol: '', name: '', shares: '', avgCost: '', currentPrice: '', category: 'Tech', dividendYield: '', targetPercent: '', notes: '', currency: 'USD', assetType: 'Stock', exchange: '' });
    setCustomCategory('');
    setEditingHoldingId(null);
    setIsModalOpen(false);
    showSaveNotice(editingHoldingId ? 'Holding updated.' : 'Holding added.', editingHoldingId);
  };

  const resetNewHoldingForm = () => {
    setFormData({ symbol: '', name: '', shares: '', avgCost: '', currentPrice: '', category: 'Tech', dividendYield: '', targetPercent: '', notes: '', currency: 'USD', assetType: 'Stock', exchange: '' });
    setCustomCategory('');
    setEditingHoldingId(null);
    setFormError('');
  };

  const openEditHolding = (item, priceOnly = false) => {
    focusPrice.current = priceOnly;
    setEditingHoldingId(item.id);
    const knownCategory = INITIAL_CATEGORIES.includes(item.category) ? item.category : 'Custom';
    setCustomCategory(knownCategory === 'Custom' ? item.category || '' : '');
    setFormData({ symbol: item.symbol || '', name: item.name || '', shares: item.shares ?? '', avgCost: item.avgCost ?? '', currentPrice: item.nativeCurrentPrice ?? item.currentPrice ?? '', category: knownCategory, dividendYield: item.dividendYield ?? '', targetPercent: item.targetPercent ?? '', notes: item.notes || '', currency: item.currency || 'USD', assetType: item.assetType || 'Stock', exchange: item.exchange || '' });
    setFormError('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!reviewSymbol) return;
    const item = summary.items.find(candidate => candidate.symbol?.toUpperCase() === reviewSymbol.toUpperCase());
    if (item) openEditHolding(item);
  }, [reviewSymbol, summary.items]);

  const handleSaveInlinePrice = (id) => {
    const price = Number(editPriceVal);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Current price must be greater than zero.');
      return;
    }
    onUpdateHoldingPrice(id, price);
    setEditingId(null);
    setEditPriceVal('');
    showSaveNotice('Price updated.', id);
  };

  const handleSaveNotes = (id) => {
    onUpdateHoldingNotes(id, notesVal);
    setNotesModalId(null);
    setNotesVal('');
    showSaveNotice('Investment notes saved.', id);
  };

  return (
    <div className="holdings-panel bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl mb-16 sm:mb-8">
      
      {/* Header Bar */}
      <div className="view-toolbar p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Manage holdings</h2>
          <FormError message={formError} />
          {saveNotice && <p className="save-notice" role="status" aria-live="polite">✓ {saveNotice}</p>}
          <p className="text-xs text-slate-400">Manage holdings, allocation targets, and prices <span className="toolbar-summary">· {summary.items.length} holding{summary.items.length === 1 ? '' : 's'} · <Money amount={formatMoney(summary.totalValue || 0, currencyCode)} /></span></p>
        </div>
        <div className="view-toolbar-actions">
          <details className="holdings-tools"><summary className="secondary-button cursor-pointer">Import / export</summary><div className="holdings-tools-panel"><button className="secondary-button" onClick={onExportCSV}><FileSpreadsheet className="w-4 h-4" /> Export CSV</button>{onImportCSV && <label className="secondary-button relative cursor-pointer">Import CSV<input type="file" accept=".csv,text/csv" aria-label="Choose CSV to import" className="absolute inset-0 opacity-0 w-full" onChange={onImportCSV} /></label>}</div></details>
          <div className="no-print"><BulkHoldingEditor items={visibleItems} allItems={summary.items} onApply={onBulkUpdate} /></div>
          <button
            onClick={() => { resetNewHoldingForm(); setIsModalOpen(true); }}
            className="primary-button"
          >
            <Plus className="w-4 h-4" /> Add holding
          </button>
        </div>
      </div>

      <FilterPanel resetLabel="Reset filters & sort" resultCount={visibleItems.length} totalCount={summary.items.length} label="holdings" activeCount={Number(Boolean(filter)) + Number(staleOnly) + Number(sortBy !== 'symbol' || sortDirection !== 'asc')} onReset={() => { setFilter(''); setStaleOnly(false); setSortBy('symbol'); setSortDirection('asc'); }}>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Filter holdings"
            aria-label="Filter holdings"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          />
          <select
            value={sortBy}
            onChange={event => { setSortBy(event.target.value); setSortDirection(event.target.value === 'symbol' ? 'asc' : 'desc'); }}
            aria-label="Sort holdings"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="symbol">Sort: Symbol</option>
            <option value="value">Sort: Value</option>
            <option value="gain">Sort: Gain</option>
          </select>
          <button className="secondary-button" aria-label="Toggle sort direction" onClick={() => setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}</button>
        </div>
      <div className="holdings-display-controls"><CurrencyMode mode={valueCurrencyMode} onChange={setValueCurrencyMode} currencyCode={currencyCode} /><p className="supporting-text">One currency per holding. Manual price edits use the asset’s native currency.</p></div>
      <div className="holdings-filter-chips"><button type="button" className={`filter-chip secondary-button ${staleOnly ? 'is-active' : ''}`} aria-pressed={staleOnly} onClick={() => setStaleOnly(value => !value)}>Stale prices{staleCount > 0 ? ` (${staleCount})` : ''}</button></div>
      </FilterPanel>
      <div className="holdings-mobile-summary" aria-label="Holdings summary"><div><span>Portfolio value</span><strong><Money amount={formatMoney(summary.totalValue || 0, currencyCode)} /></strong></div><div><span>Cash</span><strong><Money amount={formatMoney(summary.cashValue || 0, currencyCode)} /></strong></div><div><span>Holdings</span><strong>{summary.items.length}</strong></div></div>
      {/* Desktop Table */}
      <div className="holdings-desktop-table overflow-x-auto hidden sm:block">
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
                <td colSpan={7}>
                  <EmptyState compact title={activeFilter || staleOnly ? 'No holdings match these filters' : 'Your portfolio is empty'} description={activeFilter || staleOnly ? `${activeFilter ? `Nothing matches “${activeFilter}”. ` : ''}${staleOnly ? 'No stale prices were found. ' : ''}Clear the filters to see more holdings.` : 'Add a holding or import a broker CSV to get started.'} actionLabel={activeFilter || staleOnly ? 'Clear filters' : 'Add holding'} onAction={activeFilter || staleOnly ? () => { setFilter(''); setStaleOnly(false); } : () => { resetNewHoldingForm(); setIsModalOpen(true); }} />
                  {!activeFilter && onImportCSV && <div className="flex justify-center -mt-4 pb-5"><label className="secondary-button mx-auto cursor-pointer">Import CSV<input aria-label="Import holdings CSV" type="file" accept=".csv,text/csv" className="absolute w-px h-px opacity-0" onChange={onImportCSV} /></label></div>}
                </td>
              </tr>
            ) : (
              pagination.pageItems.map((item) => {
                  const display = holdingDisplay(item, valueCurrencyMode, currencyCode);
                  const isPositive = display.gain >= 0;
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} data-holding-id={item.id} tabIndex={-1} className={`hover:bg-slate-800/40 transition ${savedHoldingId === item.id ? 'holding-row-saved' : ''}`}>
                    <td data-label="Asset / Sector" className="holding-asset-cell py-3.5 px-4">
                      <div className="holding-asset-info">
                      <div className="holding-asset-heading">
                        <span className="font-bold text-white text-base">{item.symbol}</span><TickerLinks symbol={item.symbol} />
                      </div>
                      <div className="holding-asset-badges">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">{item.category || 'Other'}</span>
                        {(item.currency === 'CAD' || isTseSymbol(item.symbol)) && (
                          <span className="inline-flex items-center whitespace-nowrap text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                            TSE · CAD
                          </span>
                        )}
                      </div>
                      <div className="holding-asset-name text-xs text-slate-400">{item.name}</div>
                      <PriceStatus item={item} onEdit={() => openEditHolding(item, true)} />
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-[180px]" title={item.notes}>
                          "{item.notes}"
                        </div>
                      )}
                      </div>
                    </td>
                    <td data-label="Shares" className="py-3.5 px-4 font-medium">{formatQuantity(item.shares)}</td>
                    <td data-label="Buy / Current Price" className="py-3.5 px-4">
                        <div className="text-xs text-slate-400">Buy: <Money amount={formatMoney(display.cost, display.currency)} /></div>
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
                            <span>Now: <Money amount={formatMoney(display.price, display.currency)} /></span>
                            <button onClick={() => { setEditingId(item.id); setEditPriceVal(item.nativeCurrentPrice ?? item.currentPriceUSD); }} className="text-indigo-400 hover:text-indigo-300" aria-label={`Edit current price for ${item.symbol}`} title="Edit current price">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Target & Dividend" className="py-3.5 px-4">
                      <div className="text-xs text-indigo-300">Target: {formatPercent(item.targetPercent || 0)} (Actual: {formatPercent(item.actualPercent)})</div>
                      <div className="text-[11px] text-emerald-400 mt-0.5">{formatPercent(item.dividendYield || 0)} Yield (<Money amount={formatMoney(display.annualDividend, display.currency)} />/yr)</div><DividendSource item={item} />
                    </td>
                    <td data-label="Total Value" className="py-3.5 px-4 font-bold text-white"><Money amount={formatMoney(display.value, display.currency)} /></td>
                    <td data-label="Gain / Loss" className="py-3.5 px-4">
                      <div className={`inline-flex items-center gap-1 font-semibold ${display.gain === 0 ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {display.gain !== 0 && (isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />)}
                        <Money amount={formatMoney(display.gain, display.currency, { signed: true })} /> ({formatPercent(display.percent)})
                      </div>
                    </td>
                    <td data-label="Actions" className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditHolding(item)} className="inline-flex h-8 w-8 items-center justify-center p-0 text-indigo-400 hover:text-indigo-300 rounded-lg transition" title="Edit holding" aria-label={`Edit ${item.symbol}`}><Edit2 className="w-4 h-4" /></button>
                        <button
                          onClick={() => { setNotesModalId(item.id); setNotesVal(item.notes || ''); }}
                          className={`inline-flex h-8 w-8 items-center justify-center p-0 rounded-lg transition ${item.notes ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                          aria-label={`Edit notes for ${item.symbol}`} title="Investment Notes / Journal"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveHolding(item.id)}
                          className="danger-button inline-flex h-8 w-8 items-center justify-center p-0 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          aria-label={`Delete ${item.symbol}`} title="Delete holding"
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
      <div className="holdings-mobile-cards sm:hidden divide-y divide-slate-800">
        {visibleItems.length === 0 ? (
          <>
            <EmptyState compact title={activeFilter || staleOnly ? 'No holdings match these filters' : 'Your portfolio is empty'} description={activeFilter || staleOnly ? `${activeFilter ? `Nothing matches “${activeFilter}”. ` : ''}${staleOnly ? 'No stale prices were found. ' : ''}Clear the filters to see more holdings.` : 'Add a holding or import a broker CSV to get started.'} actionLabel={activeFilter || staleOnly ? 'Clear filters' : 'Add holding'} onAction={activeFilter || staleOnly ? () => { setFilter(''); setStaleOnly(false); } : () => { resetNewHoldingForm(); setIsModalOpen(true); }} />
            {!activeFilter && onImportCSV && <div className="flex justify-center -mt-4 pb-5"><label className="secondary-button mx-auto relative cursor-pointer">Import CSV<input aria-label="Import holdings CSV" type="file" accept=".csv,text/csv" className="absolute w-px h-px opacity-0" onChange={onImportCSV} /></label></div>}
          </>
        ) : (
          pagination.pageItems.map((item) => {
            const display = holdingDisplay(item, valueCurrencyMode, currencyCode);
            const isPositive = display.gain >= 0;
            const isEditing = editingId === item.id;

            return (
              <div key={item.id} data-holding-id={item.id} tabIndex={-1} className={`p-4 space-y-3 ${savedHoldingId === item.id ? 'holding-row-saved' : ''}`}>
                <div className="holdings-mobile-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{item.symbol}</span><TickerLinks symbol={item.symbol} />
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">{item.category || 'Other'}</span>
                    {(item.currency === 'CAD' || isTseSymbol(item.symbol)) && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold">
                        TSE · CAD
                      </span>
                    )}
                  </div>

                </div>

                <div className="text-xs text-slate-400">{item.name}</div>
                <div className="holding-card-value flex flex-wrap items-center justify-between gap-2 text-sm pt-1">
                    <span className="text-slate-400">Value: <strong className="text-white"><Money amount={formatMoney(display.value, display.currency)} /></strong></span>
                  <span className={`font-semibold flex items-center gap-1 ${display.gain === 0 ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {display.gain !== 0 && (isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />)}
                    <Money amount={formatMoney(display.gain, display.currency, { signed: true })} /> ({formatPercent(display.percent)})
                  </span>
                </div>
                <details className="holding-details"><summary>Holding details & actions</summary><div className="space-y-3 pt-3"><DividendSource item={item} /><PriceStatus item={item} onEdit={() => openEditHolding(item, true)} />
                {item.notes && <div className="text-xs text-slate-500 italic bg-slate-950 p-2 rounded">"{item.notes}"</div>}

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">Shares / Buy:</span>
                    <span className="font-semibold text-white"><span className="private-quantity">{formatQuantity(item.shares)}</span> @ <Money amount={formatMoney(display.cost, display.currency)} /></span>
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
                        <span><Money amount={formatMoney(display.price, display.currency)} /></span>
                        
                        <button onClick={() => { setEditingId(item.id); setEditPriceVal(item.nativeCurrentPrice ?? item.currentPriceUSD); }} aria-label="Edit current price" className="text-indigo-400"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </div>

<div className="supporting-text">Target: {formatPercent(item.targetPercent || 0)} · Dividend yield: {formatPercent(item.dividendYield || 0)}</div>                  <div className="holding-mobile-actions flex items-center gap-1">
                    <button onClick={() => openEditHolding(item)} aria-label={`Edit ${item.symbol}`} className="p-2 text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => { setNotesModalId(item.id); setNotesVal(item.notes || ''); }} aria-label={`Edit notes for ${item.symbol}`} className="p-2 text-indigo-400"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => onRemoveHolding(item.id)} aria-label={`Delete ${item.symbol}`} className="danger-button p-2 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div></div></details>
              </div>
            );
          })
        )}
      </div>

      <Pagination {...pagination} total={visibleItems.length} onPageChange={pagination.setPage} onPageSizeChange={setPageSize} label="Holdings" />

      {/* Add holding Modal */}
      {isModalOpen && (
        <Modal title={editingHoldingId ? 'Edit holding' : 'Add holding'} onClose={() => { setIsModalOpen(false); setEditingHoldingId(null); setFormError(''); }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <form onChange={() => setFormError('')} onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">{editingHoldingId ? 'Update the holding details directly. Transaction history remains unchanged.' : 'Add an existing holding without changing cash. To buy more using tracked cash, record a BUY in Transactions.'}</p>
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
                  {!formData.symbol.trim() && <span className="field-hint">Use a ticker such as AAPL, MSFT, or SHOP.TO.</span>}
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
                  {!formData.shares && <span className="field-hint">Enter the number of shares you currently own.</span>}
                </div>
              </div>

              <details className="optional-fields"><summary>Optional prices, income & notes</summary><div className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Average cost per share ({formData.currency || 'USD'}) <span className="normal-case font-normal text-slate-500">optional</span></label>
                  <input
                    type="number"
                    step="any"
                    min={editingHoldingId ? undefined : '0.00000001'}
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
                    name="currentPrice"
                    value={formData.currentPrice}
                    onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                  {!formData.currentPrice && <span className="field-hint">Optional; saved prices can be refreshed later.</span>}
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
                    onBlur={() => setFormData(previous => ({ ...previous, dividendYield: previous.dividendYield === '' ? '' : Number(Number(previous.dividendYield).toFixed(2)) }))}
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
                  autoComplete="off"
                />
              </div>

              </div></details>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg">{editingHoldingId ? 'Save holding' : 'Save holding'}</button>
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
              autoComplete="off"
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
