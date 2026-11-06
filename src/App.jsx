import React, { useState } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { Navbar } from './components/Navbar';
import { PortfolioCharts } from './components/PortfolioCharts';
import { HoldingsTable } from './components/HoldingsTable';
import { RebalanceView } from './components/RebalanceView';
import { HistoryView } from './components/HistoryView';
import { WatchlistView } from './components/WatchlistView';
import { DollarSign, Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, ExternalLink, Printer } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    holdings,
    watchlist,
    transactions,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    symbol,
    rate,
    portfolioSummary,
    addHolding,
    updateHoldingPrice,
    updateHoldingNotes,
    updateHoldingTarget,
    removeHolding,
    addWatchlistItem,
    updateWatchlistPrice,
    removeWatchlistItem,
    exportJSON,
    exportCSV,
    importJSON
  } = usePortfolio();

  const isLight = theme === 'light';
  const isTotalPositive = portfolioSummary.totalGainLoss >= 0;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans transition-colors duration-200`}>
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        toggleTheme={toggleTheme}
        exportJSON={exportJSON}
        exportCSV={exportCSV}
        importJSON={importJSON}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Quick Helper & Print Executive Summary Banner */}
        <div className="no-print mb-6 bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold">Pro Suite:</span> Check live prices anytime on <a href="https://www.google.com/finance" target="_blank" rel="noreferrer" className="underline text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5">Google Finance <ExternalLink className="w-3 h-3" /></a> and update them inline.
          </div>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            <Printer className="w-4 h-4" /> Export to PDF / Print Report
          </button>
        </div>

        {/* Printable Executive Header (Only visible when printing/exporting PDF) */}
        <div className="hidden print:block mb-8 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">ApexFinance Pro - Executive Portfolio Report</h1>
          <p className="text-xs text-slate-600 mt-1">Generated on {new Date().toLocaleDateString()} | Base Currency: {currency}</p>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl'} border p-5 rounded-2xl flex items-center justify-between transition-colors`}>
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
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Tab Switcher Content */}
        {activeTab === 'dashboard' && (
          <>
            <PortfolioCharts summary={portfolioSummary} transactions={transactions} symbol={symbol} rate={rate} theme={theme} />
            <HoldingsTable
              summary={portfolioSummary}
              symbol={symbol}
              theme={theme}
              onAddHolding={addHolding}
              onUpdateHoldingPrice={updateHoldingPrice}
              onUpdateHoldingNotes={updateHoldingNotes}
              onRemoveHolding={removeHolding}
              onExportCSV={exportCSV}
            />
          </>
        )}

        {activeTab === 'holdings' && (
          <HoldingsTable
            summary={portfolioSummary}
            symbol={symbol}
            theme={theme}
            onAddHolding={addHolding}
            onUpdateHoldingPrice={updateHoldingPrice}
            onUpdateHoldingNotes={updateHoldingNotes}
            onRemoveHolding={removeHolding}
            onExportCSV={exportCSV}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            symbol={symbol}
            rate={rate}
            theme={theme}
            onAddWatchlistItem={addWatchlistItem}
            onUpdateWatchlistPrice={updateWatchlistPrice}
            onRemoveWatchlistItem={removeWatchlistItem}
            onAddHolding={addHolding}
          />
        )}

        {activeTab === 'rebalance' && (
          <RebalanceView
            summary={portfolioSummary}
            symbol={symbol}
            theme={theme}
            onUpdateTarget={updateHoldingTarget}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            transactions={transactions}
            symbol={symbol}
            theme={theme}
          />
        )}

      </main>

      {/* Footer */}
      <footer className={`no-print border-t ${isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-900 bg-slate-950 text-slate-500'} py-4 text-center text-xs mb-12 sm:mb-0 transition-colors`}>
        ApexFinance Pro Manual Portfolio Suite — Built with React, Vite & TailwindCSS
      </footer>
    </div>
  );
}
