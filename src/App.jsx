import { BackToTop } from './components/BackToTop';
import { PREFERENCES_RESTORED } from './services/backupPreferences';
import { DashboardCard, DashboardCardsProvider } from './components/DashboardCard';
import { Money } from './components/Money';
import { formatPercent } from './services/formatNumber';
import { CsvMapping } from './components/CsvMapping';
import { CsvImportReview } from './components/CsvImportReview';
import { RestoreReview } from './components/RestoreComparison';
import { PrivacyContext, OverviewControls, useOverviewLayout } from './components/OverviewControls';
import { DataQuality } from './components/DataQuality';
import { WhatChanged } from './components/WhatChanged';
import { usePreference } from './hooks/usePreference';
import { holdingDisplay } from './services/holdingDisplay';
import { CurrencyMode } from './components/CurrencyMode';
import { SECTIONS, sectionFromHash } from './services/sectionNavigation';
import { MetricLabel } from './components/MetricLabel';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { formatMoney } from './services/formatMoney';
import { Onboarding, CashPanel, RecentlyDeleted } from './components/PortfolioTools';
import { Modal, FormError } from './components/Modal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';
import { DashboardSetup } from './components/DashboardSetup';
import { StatusBar } from './components/StatusBar';
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ACCENT_THEMES, usePortfolio } from './hooks/usePortfolio';
import { Navbar } from './components/Navbar';
import { PortfolioCharts } from './components/PortfolioCharts';
import { HoldingsTable } from './components/HoldingsTable';
import { PortfolioInsights } from './components/PortfolioInsights';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, ChevronDown } from 'lucide-react';

const RebalanceView = lazy(() => import('./components/RebalanceView').then(module => ({ default: module.RebalanceView })));
const HistoryView = lazy(() => import('./components/HistoryView').then(module => ({ default: module.HistoryView })));
const DividendView = lazy(() => import('./components/DividendView').then(module => ({ default: module.DividendView })));
const PerformanceView = lazy(() => import('./components/PerformanceView').then(module => ({ default: module.PerformanceView })));
const WatchlistView = lazy(() => import('./components/WatchlistView').then(module => ({ default: module.WatchlistView })));

export default function App() {
  const [privateMode, setPrivateMode] = usePreference('apex-private-mode', false, [true, false]);
  const [overviewLayout, setOverviewLayout] = useOverviewLayout();
  const [reviewSymbol, setReviewSymbol] = useState('');
  const [transactionIntent, setTransactionIntent] = useState(null);
  const consumeTransactionIntent = React.useCallback(() => setTransactionIntent(null), []);
  const [viewDensity, setViewDensity] = usePreference('apex-view-density', 'default', ['default', 'compact']);
  const [valueCurrencyMode, setValueCurrencyMode] = usePreference('apex-value-currency', 'display', ['display', 'native']);
  const focusHeadingRef = React.useRef(false);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const linked = typeof window !== 'undefined' ? sectionFromHash(window.location.hash) : null;
      if (linked) return linked;
      const saved = localStorage.getItem('apex-active-section');
      return SECTIONS.includes(saved) ? saved : 'dashboard';
    } catch { return 'dashboard'; }
  });
  useEffect(() => {
    try { localStorage.setItem('apex-active-section', activeTab); } catch { /* Navigation works without browser storage. */ }
  }, [activeTab]);
  useEffect(() => {
    if (!sectionFromHash(window.location.hash)) window.history.replaceState(null, '', `#/${activeTab}`);
    const navigateHistory = () => {
      const section = sectionFromHash(window.location.hash);
      if (section) { focusHeadingRef.current = true; setActiveTab(section); window.scrollTo({ top: 0, behavior: 'instant' }); }
    };
    window.addEventListener('popstate', navigateHistory);
    window.addEventListener('hashchange', navigateHistory);
    return () => { window.removeEventListener('popstate', navigateHistory); window.removeEventListener('hashchange', navigateHistory); };
    // Initialize the URL once; user navigation pushes its own history entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const restore = event => {
      const section = event.detail['apex-active-section'];
      if (SECTIONS.includes(section)) { setActiveTab(section); window.history.replaceState(null, '', `#/${section}`); }
    };
    window.addEventListener(PREFERENCES_RESTORED, restore);
    return () => window.removeEventListener(PREFERENCES_RESTORED, restore);
  }, []);
  const [confirmAction, setConfirmAction] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const scrollFrameRef = React.useRef(null);
  const {
    mode, startPortfolio, trash, undoNotificationId, restoreDeleted, clearRecentlyDeleted, performance, netContributionsUSD,
    holdings,
    watchlist,
    transactions,
    snapshots, historyLoading, historyError, refreshHistoricalData,
    backtestHistory,
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
    updateHoldingsBulk, csvSource, previewCsvImport, cancelCsvMapping,
    removeHolding,
    saveTransaction,
    deleteTransaction,
    deleteAllData,
    addWatchlistItem,
    updateWatchlistPrice,
    removeWatchlistItem,
    backupPayload, exportJSON, exportEncryptedJSON,
    restoreJSONBackup,
    exportCSV, exportAllCSV,
    importJSON, importEncryptedJSON, importCSV, pendingCsvImport, confirmCsvImport, cancelCsvImport, accounts, selectedAccountId, setSelectedAccountId, addAccount, renameAccount, deleteAccount,
    refreshMarketData, customCategories,
    marketStatus, uiMessage, dismissMessage, storageError, storageBlocked, lastSavedAt, resumeSaving, pendingImport, confirmImport, cancelImport, fxRates, fxData, fxError, historicalFx, historicalEstimated
  } = usePortfolio();

  useEffect(() => {
    const color = ACCENT_THEMES[accent]?.color || ACCENT_THEMES.green.color;
    document.documentElement.style.setProperty('--selection-bg', color);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><path d="M8 20L13 15L17 19L24 12M19 12H24V17" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [accent]);
  const isLight = theme === 'light';
  const isTotalPositive = portfolioSummary.totalGainLoss >= 0;
  useEffect(() => {
    if (!uiMessage) return undefined;
    let timeout;
    const dismissWhenIdle = () => {
      const toast = document.querySelector('.toast');
      if (toast?.contains(document.activeElement) || toast?.matches(':hover')) timeout = window.setTimeout(dismissWhenIdle, 1000);
      else dismissMessage();
    };
    timeout = window.setTimeout(dismissWhenIdle, undoNotificationId ? 10000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [uiMessage, undoNotificationId, dismissMessage]);
  const changeTab = tab => {
    if (!SECTIONS.includes(tab)) return;
    focusHeadingRef.current = true;
    if (sectionFromHash(window.location.hash) !== tab) window.history.pushState(null, '', `#/${tab}`);
    setActiveTab(tab);
    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current.first);
      window.cancelAnimationFrame(scrollFrameRef.current.second);
    }
    const first = window.requestAnimationFrame(() => {
      const second = window.requestAnimationFrame(() => {
        if (!document.querySelector('[role="dialog"]')) document.getElementById('page-title')?.focus({ preventScroll: true });
        window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      });
      scrollFrameRef.current = { first, second };
    });
    scrollFrameRef.current = { first, second: null };
  };
  useEffect(() => {
    if (!focusHeadingRef.current || mode === 'pending') return;
    const frame = window.requestAnimationFrame(() => {
      if (!document.querySelector('[role="dialog"]')) document.getElementById('page-title')?.focus({ preventScroll: true });
    });
    focusHeadingRef.current = false;
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, mode]);
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
    <PrivacyContext.Provider value={privateMode}><DashboardCardsProvider><div className={`app-shell density-${viewDensity} accent-${accent} ${privateMode ? 'privacy-mode' : ''} min-h-screen ${isLight ? 'theme-light bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans transition-colors duration-200`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      
      {/* Navigation */}
      <Navbar
        privateMode={privateMode}
        onTogglePrivacy={() => setPrivateMode(value => !value)}
        activeTab={activeTab}
        setActiveTab={changeTab}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        toggleTheme={toggleTheme}
        viewDensity={viewDensity}
        setViewDensity={setViewDensity}
        accent={accent}
        setAccent={setAccent}
        exportJSON={exportJSON}
        exportEncryptedJSON={exportEncryptedJSON}
        backupPayload={backupPayload}
        restoreJSONBackup={restoreJSONBackup}
        exportCSV={exportCSV}
        exportAllCSV={exportAllCSV}
        importJSON={importJSON}
        importEncryptedJSON={importEncryptedJSON}
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
      />

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {mode === 'pending' && <Onboarding onStart={startPortfolio} />}
        {storageError && <div role="alert" className="mb-4 rounded-xl border border-amber-500 p-4 text-sm text-amber-500">{storageError} {storageBlocked && <button className="underline" onClick={resumeSaving}>Replace saved data with recovered portfolio</button>}</div>}
        <Toast message={uiMessage} onDismiss={dismissMessage} onUndo={undoNotificationId ? () => restoreDeleted(undoNotificationId) : undefined} />
        {confirmAction && <ConfirmDialog {...confirmAction} danger onConfirm={runConfirmedAction} onCancel={() => setConfirmAction(null)} />}
        {pendingImport && <RestoreReview current={backupPayload} incoming={pendingImport} onCancel={cancelImport} onConfirm={confirmImport} />}
        {csvSource && <CsvMapping source={csvSource} onPreview={previewCsvImport} onCancel={cancelCsvMapping} />}
        {pendingCsvImport && <CsvImportReview data={pendingCsvImport} onConfirm={confirmCsvImport} onCancel={cancelCsvImport} />}
        {mode !== 'pending' && <>
        {mode === 'demo' && <div className="form-error mb-5 flex flex-wrap justify-between gap-3 items-center"><span><strong>Demo portfolio</strong> · Sample holdings and prices. Changes stay in this demo.</span><button className="secondary-button" onClick={() => askToConfirm('Clear all saved data?', 'This removes the demo portfolio, transactions, watchlist, snapshots, and saved preferences. Recently deleted can undo this action.', () => { deleteAllData(); changeTab('dashboard'); }, 'Clear all data')}>Clear all data</button></div>}
        <StatusBar onRetry={refreshMarketData} marketStatus={marketStatus} priceDates={holdings.map(item => item.priceUpdatedAt)} fxData={fxData} fxError={fxError} lastSavedAt={lastSavedAt} historicalEstimated={historicalEstimated}>
          <RecentlyDeleted entries={trash} onRestore={restoreDeleted} onClear={clearRecentlyDeleted} />
        </StatusBar>

        {/* Printable Executive Header (Only visible when printing/exporting PDF) */}
        <div className="hidden print:block mb-8 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">ApexFinance - Executive Portfolio Report</h1>
          <p className="text-xs text-slate-600 mt-1">Generated on {new Date().toLocaleDateString()} | Base Currency: {currency}</p>
        </div>

        <header className="page-heading mb-6"><p className="account-context">Holdings list: <strong>{selectedAccountId === '__combined__' ? 'Combined · All lists' : accounts.find(account => account.id === selectedAccountId)?.name || 'Default list'}</strong><span>Display currency: {currency}</span></p><h1 id="page-title" tabIndex={-1}>{({ dashboard: 'Portfolio overview', holdings: 'Holdings', history: 'Transactions', watchlist: 'Watchlist', dividends: 'Dividends', performance: 'Performance', rebalance: 'Rebalance' })[activeTab]}</h1><p className="supporting-text">{({ dashboard: 'Your portfolio at a glance, from allocation to your largest positions.', holdings: 'Manage your holdings, prices, and investment notes.', history: 'Record trades, dividends, and cash movements.', watchlist: 'Track investment ideas before adding a holding.', dividends: 'Review income received and upcoming dividend estimates.', performance: 'Explore portfolio returns and compare with the market.', rebalance: 'Compare your current allocation with your targets.' })[activeTab]}</p></header>
        {/* Tab Switcher Content */}
        <div id="tab-content" className="tab-scroll-target">
        <Suspense fallback={<LoadingSkeleton />}>
        {activeTab === 'dashboard' && <>
          <div className="overview-tools no-print">
            <OverviewControls layout={overviewLayout} onChange={setOverviewLayout} />
            <DataQuality holdings={holdings} onReview={symbol => { setReviewSymbol(symbol); changeTab('holdings'); }} />
            <WhatChanged snapshots={snapshots} transactions={transactions} holdings={holdings} summary={portfolioSummary} rate={rate} currency={currency} historicalFx={historicalFx} netContributionsUSD={netContributionsUSD} scope={selectedAccountId} allowLegacy={accounts.length === 1} enabled={selectedAccountId === '__combined__' || accounts.length === 1} />
          </div>
          {holdings.length === 0 && <DashboardSetup onNavigate={changeTab} onExploreDemo={() => startPortfolio('demo')} />}
          {overviewLayout.order.filter(key => !overviewLayout.hidden.includes(key)).map(key => <React.Fragment key={key}>{({
            summary: (<section id="portfolio-summary" className="summary-section tab-scroll-target mb-6" aria-labelledby="summary-title">
        <div className={`summary-balance w-full ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border rounded-2xl px-5 py-3 flex items-center justify-between text-left`}>
          <span><span id="summary-title" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Portfolio summary</span><span className={`summary-value block font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}><Money amount={formatMoney(portfolioSummary.totalValue, currency)} /></span></span>
          <button type="button" className="secondary-button no-print shrink-0" onClick={() => setSummaryOpen(previous => !previous)} aria-expanded={summaryOpen} aria-controls="summary-metrics">{summaryOpen ? 'Hide details' : 'Show details'}<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${summaryOpen ? 'rotate-180' : ''}`} /></button>
        </div>
        <div id="summary-metrics" hidden={!summaryOpen} className="summary-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors order-3`}>
            <div>
              <MetricLabel label="Realized P/L" explanation="Profit or loss from positions you have sold, after recorded fees." />
              <h2 className={`text-2xl font-bold mt-1 ${portfolioSummary.realizedGainLoss === 0 ? 'text-slate-400' : portfolioSummary.realizedGainLoss > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                <Money amount={formatMoney(portfolioSummary.realizedGainLoss, currency, { signed: true })} />
              </h2>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors order-2`}>
            <div>
              <MetricLabel label="Cost basis" explanation="The remaining cost basis of your current holdings. This is not your total cash deposits." />
              <h2 className={`text-2xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Money amount={formatMoney(portfolioSummary.totalCost, currency)} />
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'}`}>
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors order-4`}>
            <div>
              <MetricLabel label="Unrealized P/L" explanation="Current market value minus the remaining cost basis of holdings you still own. Currency movements may affect this amount." />
              <h2 className={`text-xl font-bold mt-1 flex items-center gap-1 ${portfolioSummary.totalGainLoss === 0 ? 'text-slate-400' : isTotalPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                <Money amount={formatMoney(portfolioSummary.totalGainLoss, currency, { signed: true })} />
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                  {portfolioSummary.totalCost > 0 ? formatPercent(portfolioSummary.totalGainLossPercent) : 'Not available yet'}
                </span>
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${isTotalPositive ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
              {isTotalPositive ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>
          </div>

          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors order-5`}>
            <div>
              <MetricLabel label="Est. Annual Dividends" explanation="Estimated yearly income from current holdings and saved dividend yields. The percentage is estimated income divided by total portfolio value, including cash; payments are not guaranteed." />
              <h2 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Money amount={formatMoney(portfolioSummary.annualDividend, currency)} />
                <span className="text-[10px] text-slate-400 font-normal">{portfolioSummary.totalValue > 0 ? `(${formatPercent(portfolioSummary.portfolioYield)})` : 'Not available yet'}</span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Received: <Money amount={formatMoney(portfolioSummary.dividendsReceived, currency)} /></p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>
        </section>),
            cash: (<CashPanel summary={portfolioSummary} currencyCode={currency} hasCashRecords={transactions.some(entry => ['DEPOSIT', 'WITHDRAW'].includes(entry.type) || entry.cashImpact === true)} onRecord={type => { setTransactionIntent({ type, currency, id: Date.now() }); changeTab('history'); }} />),
            charts: holdings.length > 0 ? (<PortfolioCharts performance={performance} backtestHistory={backtestHistory} summary={portfolioSummary} snapshots={snapshots} symbol={symbol} currencyCode={currency} rate={rate} theme={theme} compact={viewDensity === 'compact'} showPerformanceChart={false} />) : null,
            insights: holdings.length > 0 ? (<PortfolioInsights summary={portfolioSummary} currencyCode={currency} />) : null,
            holdings: holdings.length > 0 ? (<DashboardCard cardId="top-holdings" label="Top holdings" className="overview-panel mt-6" aria-labelledby="top-holdings-title">
              <header className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div><h2 id="top-holdings-title" className="section-title">Top holdings</h2><p className="supporting-text">Your five largest holdings · {valueCurrencyMode === 'display' ? `Values and gains in ${currency}, including currency effects.` : 'Values and gains in each asset’s currency, excluding currency effects.'}</p></div>
                <div className="top-holdings-actions"><CurrencyMode mode={valueCurrencyMode} onChange={setValueCurrencyMode} currencyCode={currency} /><button className="secondary-button" onClick={() => changeTab('holdings')}>View all holdings</button></div>
              </header>
              <ul className="top-holdings">
                {[...portfolioSummary.items].sort((a, b) => b.totalValue - a.totalValue || a.symbol.localeCompare(b.symbol) || a.id.localeCompare(b.id)).slice(0, 5).map(item => { const display = holdingDisplay(item, valueCurrencyMode, currency); return <li key={item.id}>
                  <div className="min-w-0"><strong>{item.symbol}</strong><p className="supporting-text truncate">{item.name}</p></div>
                  <div className="text-right shrink-0"><strong><Money amount={formatMoney(display.value, display.currency)} /></strong><p className={display.gain === 0 ? 'text-slate-400 text-sm' : display.gain > 0 ? 'text-emerald-500 text-sm' : 'text-rose-500 text-sm'}><Money amount={formatMoney(display.gain, display.currency, { signed: true })} /> <span className="text-xs">({formatPercent(display.percent)})</span></p></div>
                </li>; })}
              </ul>
            </DashboardCard>) : null
          })[key]}</React.Fragment>)}
        </>}

        {activeTab === 'holdings' && (
          <HoldingsTable
            onBulkUpdate={updateHoldingsBulk}
            key={`${selectedAccountId}-${reviewSymbol}`}
            initialFilter={reviewSymbol}
            valueCurrencyMode={valueCurrencyMode}
            setValueCurrencyMode={setValueCurrencyMode}
            summary={portfolioSummary}
            currencyCode={currency}
            customCategories={customCategories}
            theme={theme}
            onAddHolding={addHolding}
            onUpdateHoldingPrice={updateHoldingPrice}
            onUpdateHolding={updateHolding}
            onUpdateHoldingNotes={updateHoldingNotes}
            onRemoveHolding={id => askToConfirm('Delete this holding?', 'The holding and its linked transactions will move to Recently deleted.', () => removeHolding(id))}
            onExportCSV={exportCSV}
            onImportCSV={importCSV}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            fxRates={fxRates}
            symbol={symbol}
            currencyCode={currency}
            customCategories={customCategories}
            rate={rate}
            theme={theme}
            onAddWatchlistItem={addWatchlistItem}
            onUpdateWatchlistPrice={updateWatchlistPrice}
            onRemoveWatchlistItem={id => askToConfirm('Remove from watchlist?', 'This idea will move to Recently deleted and can be restored later.', () => removeWatchlistItem(id))}
            onAddHolding={addHolding}
          />
        )}

        {activeTab === 'rebalance' && (
          <RebalanceView
            summary={portfolioSummary}
            currencyCode={currency}
            onUpdateTarget={updateHoldingTarget}
            onAddHoldings={() => changeTab('holdings')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            draftScope={selectedAccountId}
            key={selectedAccountId}
            intent={transactionIntent}
            onIntentHandled={consumeTransactionIntent}
            transactions={transactions}
            historicalFx={historicalFx}
            holdings={holdings}
            onSaveTransaction={saveTransaction}
            onDeleteTransaction={id => askToConfirm('Delete this transaction?', 'The transaction will move to Recently deleted. Earlier portfolio balances may change.', () => deleteTransaction(id))}
            currencyCode={currency}
            rate={rate}
          />
        )}

        {activeTab === 'dividends' && <DividendView onManageHoldings={() => changeTab('holdings')} onRecordDividend={() => { setTransactionIntent({ type: 'DIVIDEND', id: Date.now() }); changeTab('history'); }} summary={portfolioSummary} transactions={transactions} currencyCode={currency} theme={theme} />}
        {activeTab === 'performance' && <PerformanceView performance={performance} transactions={transactions} netContributionsUSD={netContributionsUSD} summary={portfolioSummary} backtestHistory={backtestHistory} currencyCode={currency} rate={rate} theme={theme} historyLoading={historyLoading} historyError={historyError} onRetryHistory={refreshHistoricalData} onManageHoldings={() => changeTab('holdings')} onRecordDeposit={() => { setTransactionIntent({ type: 'DEPOSIT', id: Date.now() }); changeTab('history'); }} />}
        </Suspense>
        </div>
        </>}
      </main>

      <BackToTop />
      {/* Footer */}
      <footer className={`no-print border-t ${isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-900 bg-slate-950 text-slate-500'} py-4 text-center text-xs mb-12 sm:mb-0 transition-colors`}>
        ApexFinance &middot; {new Date().getFullYear()} &middot; Zafar Ali
        <nav className="footer-links" aria-label="Finance resources">
          {[
            ['Yahoo Finance', 'https://finance.yahoo.com/'],
            ['Google Finance', 'https://www.google.com/finance/'],
            ['TradingView Heatmap', 'https://www.tradingview.com/heatmap/stock/'],
            ['Finviz', 'https://finviz.com/'],
            ['Investopedia', 'https://www.investopedia.com/'],
          ].map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
        </nav>
      </footer>
    </div></DashboardCardsProvider></PrivacyContext.Provider>
  );
}
