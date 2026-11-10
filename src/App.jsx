import { Onboarding, CashPanel, RecentlyDeleted } from './components/PortfolioTools';
import { Modal, FormError } from './components/Modal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { Toast } from './components/Toast';
import { DashboardSetup } from './components/DashboardSetup';
import { StatusBar } from './components/StatusBar';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { Navbar } from './components/Navbar';
const PortfolioCharts = lazy(() => import('./components/PortfolioCharts').then(module => ({ default: module.PortfolioCharts })));
import { HoldingsTable } from './components/HoldingsTable';
const RebalanceView = lazy(() => import('./components/RebalanceView').then(module => ({ default: module.RebalanceView })));
const HistoryView = lazy(() => import('./components/HistoryView').then(module => ({ default: module.HistoryView })));
const WatchlistView = lazy(() => import('./components/WatchlistView').then(module => ({ default: module.WatchlistView })));
const PortfolioInsights = lazy(() => import('./components/PortfolioInsights').then(module => ({ default: module.PortfolioInsights })));
import { DollarSign, Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, ChevronDown } from 'lucide-react';

export default function App() {
  const [transactionIntent, setTransactionIntent] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalQuery, setGlobalQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const scrollFrameRef = React.useRef(null);
  useEffect(() => {
    const handleShortcut = event => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (event.key === 'Escape' && document.activeElement?.id === 'global-search') setGlobalQuery('');
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);
  const {
    mode, startPortfolio, trash, restoreDeleted, clearRecentlyDeleted, performance,
    holdings,
    watchlist,
    transactions,
    snapshots,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    accent,
    setAccent,
    symbol,
    rate,
    portfolioSummary,
    addHolding,
    updateHolding,
    updateHoldingPrice,
    updateHoldingNotes,
    updateHoldingTarget,
    removeHolding,
    saveTransaction,
    deleteTransaction,
    deleteAllData,
    addWatchlistItem,
    updateWatchlistPrice,
    removeWatchlistItem,
    exportJSON,
    exportCSV, exportAllCSV,
    importJSON, importCSV, pendingCsvImport, confirmCsvImport, cancelCsvImport, accounts, selectedAccountId, setSelectedAccountId, addAccount, renameAccount, deleteAccount,
    refreshMarketData,
    marketStatus, uiMessage, dismissMessage, storageError, storageBlocked, resumeSaving, pendingImport, confirmImport, cancelImport, fxRates, fxData, fxError, historicalFx, historicalEstimated
  } = usePortfolio();

  const isLight = theme === 'light';
  const isTotalPositive = portfolioSummary.totalGainLoss >= 0;
  useEffect(() => {
    if (!uiMessage) return undefined;
    const timeout = window.setTimeout(() => dismissMessage(), 4500);
    return () => window.clearTimeout(timeout);
  }, [uiMessage, dismissMessage]);
  const changeTab = tab => {
    setActiveTab(tab);
    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current.first);
      window.cancelAnimationFrame(scrollFrameRef.current.second);
    }
    const first = window.requestAnimationFrame(() => {
      const second = window.requestAnimationFrame(() => document.getElementById(tab === 'dashboard' ? 'portfolio-summary' : 'tab-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      scrollFrameRef.current = { first, second };
    });
    scrollFrameRef.current = { first, second: null };
  };
  const askToConfirm = (title, message, action, confirmLabel = 'Delete') => setConfirmAction({ title, message, action, confirmLabel });
  const runConfirmedAction = () => { confirmAction?.action(); setConfirmAction(null); };
  const previewGroups = pendingCsvImport?.kind === 'holdings'
    ? Object.entries(pendingCsvImport.rows.slice(0, 50).reduce((groups, row) => {
      const name = row.accountName || 'Selected list';
      (groups[name] ||= []).push(row);
      return groups;
    }, {})).map(([name, rows]) => ({ name, rows }))
    : [];

  return (
    <div className={`app-shell accent-${accent} min-h-screen ${isLight ? 'theme-light bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans transition-colors duration-200`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={changeTab}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        toggleTheme={toggleTheme}
        accent={accent}
        setAccent={setAccent}
        exportJSON={exportJSON}
        exportCSV={exportCSV}
        exportAllCSV={exportAllCSV}
        importJSON={importJSON}
        importCSV={importCSV}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
        addAccount={addAccount}
        renameAccount={renameAccount}
        deleteAccount={deleteAccount}
        onDeleteAllData={() => askToConfirm('Delete all saved data?', 'This clears the current portfolio, transactions, watchlist, snapshots, and preferences. You can still use Recently deleted to undo the clear.', deleteAllData, 'Delete everything')}
        refreshMarketData={refreshMarketData}
        marketStatus={marketStatus}
        globalQuery={globalQuery}
        setGlobalQuery={setGlobalQuery}
      />

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {mode === 'pending' && <Onboarding onStart={startPortfolio} />}
        {storageError && <div role="alert" className="mb-4 rounded-xl border border-amber-500 p-4 text-sm text-amber-500">{storageError} {storageBlocked && <button className="underline" onClick={resumeSaving}>Replace saved data with recovered portfolio</button>}</div>}
        <Toast message={uiMessage} onDismiss={dismissMessage} />
        {confirmAction && <ConfirmDialog {...confirmAction} danger onConfirm={runConfirmedAction} onCancel={() => setConfirmAction(null)} />}
        {pendingImport && <Modal title="Review backup restore" onClose={cancelImport}>
          <p className="mb-5">This backup contains {pendingImport.holdings.length} holdings, {pendingImport.transactions.length} transactions, {pendingImport.watchlist.length} watchlist items, and {pendingImport.snapshots.length} snapshots. Restoring replaces your current portfolio and preferences.</p>
          <div className="flex justify-end gap-3"><button className="secondary-button" onClick={cancelImport}>Cancel</button><button className="primary-button" onClick={confirmImport}>Replace portfolio</button></div>
        </Modal>}
        {pendingCsvImport && <Modal title="Review CSV import" onClose={cancelCsvImport}>
          <p className="mb-4">Detected <strong>{pendingCsvImport.broker}</strong> format in <strong>{pendingCsvImport.fileName}</strong>. The import will add {pendingCsvImport.rows.length} {pendingCsvImport.kind === 'transactions' ? 'transactions' : 'holdings'} to the selected account.</p>
          {pendingCsvImport.duplicates > 0 && <p role="alert" className="form-error mb-4">{pendingCsvImport.duplicates} row{pendingCsvImport.duplicates === 1 ? '' : 's'} appear to already exist in this account. Review carefully before importing.</p>}
          <div className="max-h-64 overflow-auto rounded-xl border border-slate-800 mb-5">
            {pendingCsvImport.kind === 'transactions' ? <table className="w-full text-sm"><thead className="text-left text-slate-400 border-b border-slate-800"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Symbol</th><th className="p-3">Shares</th><th className="p-3">Price</th></tr></thead><tbody>{pendingCsvImport.rows.slice(0, 50).map((row, index) => <tr key={`${row.symbol}-${row.date}-${index}`} className="border-b border-slate-800/60"><td className="p-3">{row.date}</td><td className="p-3 font-semibold">{row.type}</td><td className="p-3">{row.symbol || 'Cash'}</td><td className="p-3">{row.shares || '—'}</td><td className="p-3">{row.price || '—'}</td></tr>)}</tbody></table> : <table className="w-full text-sm"><thead className="text-left text-slate-400 border-b border-slate-800"><tr><th className="p-3">Holdings list</th><th className="p-3">Symbol</th><th className="p-3">Shares</th><th className="p-3">Avg cost</th><th className="p-3">Current</th></tr></thead><tbody>{previewGroups.flatMap(group => [<tr key={`group-${group.name}`} className="bg-slate-800/70"><td colSpan={5} className="p-3 font-semibold text-indigo-200">{group.name}</td></tr>, ...group.rows.map((row, index) => <tr key={`${group.name}-${row.symbol}-${index}`} className="border-b border-slate-800/60"><td className="p-3 text-slate-500">{group.name}</td><td className="p-3 font-semibold">{row.symbol}</td><td className="p-3">{row.shares}</td><td className="p-3">{row.avgCost.toFixed(2)}</td><td className="p-3">{row.currentPrice.toFixed(2)}</td></tr>)])}</tbody></table>}
          </div>
          {pendingCsvImport.rows.length > 50 && <p className="text-xs text-slate-400 mb-4">Showing the first 50 rows. All {pendingCsvImport.rows.length} valid holdings will be imported.</p>}
          <p className="text-sm text-slate-400 mb-4">Rows with zero cost or current prices will still be imported; use Refresh live market prices to fill current values.</p>
          <div className="flex justify-end gap-3"><button className="secondary-button" onClick={cancelCsvImport}>Cancel</button><button className="primary-button" onClick={confirmCsvImport}>Import holdings</button></div>
        </Modal>}
        {mode !== 'pending' && <>
        {mode === 'demo' && <div className="form-error mb-5 flex flex-wrap justify-between gap-3 items-center"><span><strong>Demo portfolio</strong> · Sample holdings and prices. Changes stay in this demo.</span><button className="secondary-button" onClick={() => askToConfirm('Clear all saved data?', 'This removes the demo portfolio, transactions, watchlist, snapshots, and saved preferences. Recently deleted can undo this action.', () => { deleteAllData(); changeTab('dashboard'); }, 'Clear all data')}>Clear all data</button></div>}
        <RecentlyDeleted entries={trash} onRestore={restoreDeleted} onClear={clearRecentlyDeleted} />
        <StatusBar marketStatus={marketStatus} fxData={fxData} fxError={fxError} historicalEstimated={historicalEstimated} />

        {/* Printable Executive Header (Only visible when printing/exporting PDF) */}
        <div className="hidden print:block mb-8 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">ApexFinance Pro - Executive Portfolio Report</h1>
          <p className="text-xs text-slate-600 mt-1">Generated on {new Date().toLocaleDateString()} | Base Currency: {currency}</p>
        </div>

        {/* KPI Summary Cards */}
        {activeTab === 'dashboard' && <>
        <section id="portfolio-summary" className="summary-section tab-scroll-target mb-6" aria-labelledby="summary-title">
        <button type="button" className={`summary-toggle w-full ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border rounded-2xl px-5 py-3 flex items-center justify-between text-left`} onClick={() => setSummaryOpen(previous => !previous)} aria-expanded={summaryOpen}>
          <span><span id="summary-title" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Portfolio summary</span><span className={`block text-lg font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{symbol}{portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">total value</span></span></span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
        </button>
        {summaryOpen && <div className="summary-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          
          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} kpi-card border p-5 rounded-2xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Value</p>
              <h2 className={`text-2xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {symbol}{portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Realized P/L</p>
              <h2 className={`text-2xl font-bold mt-1 ${portfolioSummary.realizedGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {portfolioSummary.realizedGainLoss >= 0 ? '+' : ''}{symbol}{portfolioSummary.realizedGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Invested Cost</p>
              <h2 className={`text-2xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {symbol}{portfolioSummary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'}`}>
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Unrealized P/L</p>
              <h2 className={`text-xl font-bold mt-1 flex items-center gap-1 ${isTotalPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {isTotalPositive ? '+' : ''}{symbol}{portfolioSummary.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                  {portfolioSummary.totalGainLossPercent.toFixed(1)}%
                </span>
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${isTotalPositive ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
              {isTotalPositive ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Est. Annual Dividends</p>
              <h2 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mt-1 flex items-center gap-1">
                {symbol}{portfolioSummary.annualDividend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-[10px] text-slate-400 font-normal">({portfolioSummary.portfolioYield.toFixed(2)}%)</span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Received: {symbol}{portfolioSummary.dividendsReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>}
        </section>

        <CashPanel summary={portfolioSummary} symbol={symbol} onRecord={type => { setTransactionIntent({ type, id: Date.now() }); changeTab('history'); }} />
        </>}
        {/* Tab Switcher Content */}
        <div id="tab-content" className="tab-scroll-target">
        <Suspense fallback={<LoadingSkeleton />}>
        {activeTab === 'dashboard' && (
          <>
            {holdings.length === 0 && <DashboardSetup onNavigate={changeTab} onExploreDemo={() => startPortfolio('demo')} />}
            <PortfolioCharts performance={performance} summary={portfolioSummary} snapshots={snapshots} symbol={symbol} currencyCode={currency} rate={rate} theme={theme} />
            <PortfolioInsights summary={portfolioSummary} symbol={symbol} />
            <HoldingsTable
              summary={portfolioSummary}
              symbol={symbol}
              currencyCode={currency}
              theme={theme}
              onAddHolding={addHolding}
              onUpdateHoldingPrice={updateHoldingPrice}
              onUpdateHolding={updateHolding}
              onUpdateHoldingNotes={updateHoldingNotes}
              onRemoveHolding={id => askToConfirm('Delete this holding?', 'The holding and its linked transactions will move to Recently deleted.', () => removeHolding(id))}
              onExportCSV={exportCSV}
              onImportCSV={importCSV}
              globalFilter={globalQuery}
            />
          </>
        )}

        {activeTab === 'holdings' && (
          <HoldingsTable
            summary={portfolioSummary}
            symbol={symbol}
            currencyCode={currency}
            theme={theme}
            onAddHolding={addHolding}
            onUpdateHoldingPrice={updateHoldingPrice}
            onUpdateHolding={updateHolding}
            onUpdateHoldingNotes={updateHoldingNotes}
            onRemoveHolding={id => askToConfirm('Delete this holding?', 'The holding and its linked transactions will move to Recently deleted.', () => removeHolding(id))}
            onExportCSV={exportCSV}
            onImportCSV={importCSV}
            globalFilter={globalQuery}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            fxRates={fxRates}
            symbol={symbol}
            currencyCode={currency}
            rate={rate}
            theme={theme}
            onAddWatchlistItem={addWatchlistItem}
            onUpdateWatchlistPrice={updateWatchlistPrice}
            onRemoveWatchlistItem={id => askToConfirm('Remove from watchlist?', 'This idea will move to Recently deleted and can be restored later.', () => removeWatchlistItem(id))}
            onAddHolding={addHolding}
            globalFilter={globalQuery}
          />
        )}

        {activeTab === 'rebalance' && (
          <RebalanceView
            summary={portfolioSummary}
            symbol={symbol}
            currencyCode={currency}
            theme={theme}
            onUpdateTarget={updateHoldingTarget}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            intent={transactionIntent}
            transactions={transactions}
            historicalFx={historicalFx}
            fxRates={fxRates}
            holdings={holdings}
            summary={portfolioSummary}
            onSaveTransaction={saveTransaction}
            onDeleteTransaction={id => askToConfirm('Delete this transaction?', 'The transaction will move to Recently deleted. Earlier portfolio balances may change.', () => deleteTransaction(id))}
            symbol={symbol}
            rate={rate}
            theme={theme}
          />
        )}

        </Suspense>
        </div>
        </>}
      </main>

      {/* Footer */}
      <footer className={`no-print border-t ${isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-900 bg-slate-950 text-slate-500'} py-4 text-center text-xs mb-12 sm:mb-0 transition-colors`}>
        ApexFinance Pro Manual Portfolio Suite - Built with React, Vite & TailwindCSS
      </footer>
    </div>
  );
}
