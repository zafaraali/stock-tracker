import React, { useState } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { Navbar } from './components/Navbar';
import { PortfolioCharts } from './components/PortfolioCharts';
import { HoldingsTable } from './components/HoldingsTable';
import { DollarSign, Wallet, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    currency,
    setCurrency,
    symbol,
    portfolioSummary,
    addHolding,
    updateHoldingPrice,
    removeHolding,
    exportJSON,
    exportCSV,
    importJSON
  } = usePortfolio();

  const isTotalPositive = portfolioSummary.totalGainLoss >= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        exportJSON={exportJSON}
        exportCSV={exportCSV}
        importJSON={importJSON}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Quick Helper Banner */}
        <div className="mb-6 bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold">Tip:</span> Check live prices anytime on <a href="https://www.google.com/finance" target="_blank" rel="noreferrer" className="underline text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5">Google Finance <ExternalLink className="w-3 h-3" /></a> and click the edit icon in your holdings table to update them.
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Portfolio Value</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {symbol}{portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Investment Cost</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {symbol}{portfolioSummary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="p-3 bg-slate-800 text-slate-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Unrealized P/L</p>
              <h2 className={`text-2xl font-bold mt-1 flex items-center gap-1.5 ${isTotalPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isTotalPositive ? '+' : ''}{symbol}{portfolioSummary.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800">
                  {portfolioSummary.totalGainLossPercent.toFixed(2)}%
                </span>
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${isTotalPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isTotalPositive ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>
          </div>

        </div>

        {/* Tab Switcher Content */}
        {activeTab === 'dashboard' && (
          <>
            <PortfolioCharts summary={portfolioSummary} symbol={symbol} />
            <HoldingsTable
              summary={portfolioSummary}
              symbol={symbol}
              onAddHolding={addHolding}
              onUpdateHoldingPrice={updateHoldingPrice}
              onRemoveHolding={removeHolding}
              onExportCSV={exportCSV}
            />
          </>
        )}

        {activeTab === 'holdings' && (
          <HoldingsTable
            summary={portfolioSummary}
            symbol={symbol}
            onAddHolding={addHolding}
            onUpdateHoldingPrice={updateHoldingPrice}
            onRemoveHolding={removeHolding}
            onExportCSV={exportCSV}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 mb-12 sm:mb-0">
        ApexFinance Manual Portfolio Tracker — Built with React, Vite & TailwindCSS
      </footer>
    </div>
  );
}
