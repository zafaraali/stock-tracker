import React from 'react';
import { TrendingUp, PieChart as PieIcon, List, ArrowDownUp, Download, Upload } from 'lucide-react';
import { CURRENCY_RATES } from '../data/mockData';

export function Navbar({ activeTab, setActiveTab, currency, setCurrency, exportJSON, exportCSV, importJSON }) {
  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Apex<span className="text-indigo-400">Finance</span> <span className="text-xs text-slate-400 font-normal ml-1">(Manual)</span></span>
        </div>

        {/* Desktop & Tablet Tabs */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieIcon className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'holdings' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownUp className="w-4 h-4" /> Holdings & Prices
          </button>
        </div>

        {/* Actions & Currency Selector */}
        <div className="flex items-center gap-2.5">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.keys(CURRENCY_RATES).map(code => (
              <option key={code} value={code}>
                {code} ({CURRENCY_RATES[code].symbol})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={exportJSON}
              title="Backup JSON"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Backup</span>
            </button>
            <label title="Restore JSON" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1">
              <Upload className="w-4 h-4" />
              <span className="hidden lg:inline">Restore</span>
              <input type="file" accept=".json" onChange={importJSON} className="hidden" />
            </label>
          </div>
        </div>

      </div>

      {/* Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-6 py-2.5 flex justify-around items-center z-50">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'}`}
        >
          <PieIcon className="w-5 h-5" /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${activeTab === 'holdings' ? 'text-indigo-400' : 'text-slate-400'}`}
        >
          <ArrowDownUp className="w-5 h-5" /> Holdings
        </button>
      </div>
    </nav>
  );
}
