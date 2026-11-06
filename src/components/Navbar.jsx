import React from 'react';
import { TrendingUp, PieChart as PieIcon, ArrowDownUp, Sliders, History, Eye, Download, Upload, Sun, Moon } from 'lucide-react';
import { CURRENCY_RATES } from '../data/mockData';

export function Navbar({ activeTab, setActiveTab, currency, setCurrency, theme, toggleTheme, exportJSON, exportCSV, importJSON }) {
  const isLight = theme === 'light';

  return (
    <nav className={`no-print ${isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-100'} backdrop-blur-md border-b sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className={`font-bold text-lg tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Apex<span className="text-indigo-600 dark:text-indigo-400">Finance</span> <span className="text-xs text-amber-500 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 ml-1">PRO</span>
          </span>
        </div>

        {/* Desktop & Tablet Tabs */}
        <div className={`hidden sm:flex items-center gap-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-slate-800'} p-1 rounded-xl border`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <PieIcon className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'holdings' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <ArrowDownUp className="w-4 h-4" /> Holdings
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'watchlist' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <Eye className="w-4 h-4" /> Watchlist
          </button>
          <button
            onClick={() => setActiveTab('rebalance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rebalance' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <Sliders className="w-4 h-4" /> Rebalance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <History className="w-4 h-4" /> Transactions
          </button>
        </div>

        {/* Actions & Currency & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'} text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border`}
          >
            {Object.keys(CURRENCY_RATES).map(code => (
              <option key={code} value={code}>
                {code} ({CURRENCY_RATES[code].symbol})
              </option>
            ))}
          </select>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            className={`p-2 rounded-xl text-xs font-medium transition border ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'}`}
          >
            {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={exportJSON}
              title="Backup JSON"
              className={`p-2 rounded-xl text-xs font-medium transition flex items-center gap-1 border ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Backup</span>
            </button>
            <label title="Restore JSON" className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1 border ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}>
              <Upload className="w-4 h-4" />
              <span className="hidden lg:inline">Restore</span>
              <input type="file" accept=".json" onChange={importJSON} className="hidden" />
            </label>
          </div>
        </div>

      </div>

      {/* Mobile Bottom Bar */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 ${isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-200'} backdrop-blur-lg border-t px-2 py-2.5 flex justify-around items-center z-50`}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <PieIcon className="w-4 h-4" /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'holdings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <ArrowDownUp className="w-4 h-4" /> Holdings
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'watchlist' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <Eye className="w-4 h-4" /> Watchlist
        </button>
        <button
          onClick={() => setActiveTab('rebalance')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'rebalance' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <Sliders className="w-4 h-4" /> Rebalance
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>
    </nav>
  );
}
