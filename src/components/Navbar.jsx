import React, { useState } from 'react';
import { Modal } from './Modal';
import { TrendingUp, PieChart as PieIcon, ArrowDownUp, Sliders, History, Eye, Download, Upload, Sun, Moon, Trash2, RefreshCw, Settings, Search } from 'lucide-react';
import { CURRENCY_RATES } from '../data/mockData';

export function Navbar({ activeTab, setActiveTab, currency, setCurrency, theme, toggleTheme, accent, setAccent, exportJSON, exportCSV, importJSON, importCSV, accounts = [], selectedAccountId, setSelectedAccountId, addAccount, renameAccount, onDeleteAllData, refreshMarketData, marketStatus, globalQuery, setGlobalQuery }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const isLight = theme === 'light';

  return (
    <nav className={`no-print ${isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-100'} border-b sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <button aria-label="Go to dashboard" className="flex items-center gap-2 cursor-pointer" aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => setActiveTab('dashboard')}>
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className={`font-bold text-lg tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Apex<span className="text-indigo-600 dark:text-indigo-400">Finance</span> <span className="text-xs text-amber-500 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 ml-1">PRO</span>
          </span>
        </button>

        {/* Desktop & Tablet Tabs */}
        <div className={`hidden sm:flex items-center gap-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-slate-800'} p-1 rounded-xl border`}>
          <button
            aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <PieIcon className="w-4 h-4" /> Dashboard
          </button>
          <button
            aria-current={activeTab === 'holdings' ? 'page' : undefined} onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'holdings' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <ArrowDownUp className="w-4 h-4" /> Holdings
          </button>
          <button
            aria-current={activeTab === 'watchlist' ? 'page' : undefined} onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'watchlist' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <Eye className="w-4 h-4" /> Watchlist
          </button>
          <button
            aria-current={activeTab === 'rebalance' ? 'page' : undefined} onClick={() => setActiveTab('rebalance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rebalance' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <Sliders className="w-4 h-4" /> Rebalance
          </button>
          <button
            aria-current={activeTab === 'history' ? 'page' : undefined} onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <History className="w-4 h-4" /> Transactions
          </button>
        </div>

        {/* Actions & Currency & Theme Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <label className={`flex items-center gap-2 rounded-xl border px-3 w-full sm:w-auto ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'}`}>
            <Search className="w-4 h-4 text-slate-400" />
            <input id="global-search" type="search" value={globalQuery} onChange={event => setGlobalQuery(event.target.value)} placeholder="Search portfolio" aria-label="Search portfolio" className="w-full sm:w-36 bg-transparent border-0 outline-none text-sm min-h-10" />
            <kbd className="text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">/</kbd>
          </label>
          <select
            aria-label="Display currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'} text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border`}
          >
            {Object.keys(CURRENCY_RATES).sort((a, b) => a.localeCompare(b)).map(code => (
              <option key={code} value={code}>
                {code} ({CURRENCY_RATES[code].symbol})
              </option>
            ))}
          </select>
          <select
            aria-label="Portfolio account"
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'} text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border max-w-36`}
          >
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>

          {/* Theme Toggle Button */}
          <button
            onClick={refreshMarketData}
            disabled={marketStatus?.loading}
            title="Refresh live market prices"
            aria-label="Refresh live market prices"
            className={`p-2 rounded-xl text-xs font-medium transition border ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'} disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${marketStatus?.loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
            onClick={toggleTheme}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            className={`p-2 rounded-xl text-xs font-medium transition border ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'}`}
          >
            {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button aria-label="Open settings" onClick={() => setSettingsOpen(true)} className="icon-button"><Settings className="w-5 h-5" /></button>
          {settingsOpen && <Modal title="Settings & data" onClose={() => setSettingsOpen(false)}>
            <p className="text-sm text-slate-400 mb-5">Your portfolio stays in this browser's local storage. Keep an encrypted or otherwise secure copy of exported backups.</p>
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-800 p-3">
                <p className="text-sm font-semibold mb-2">Accounts</p>
                <div className="space-y-2 mb-3">{accounts.map(account => <div key={account.id} className="flex items-center gap-2"><span className="text-sm flex-1">{account.name} <span className="text-xs text-slate-500">({account.type})</span></span><button className="secondary-button" onClick={() => { const next = window.prompt('Rename account', account.name); if (next) renameAccount(account.id, next); }}>Rename</button></div>)}</div>
                <div className="flex gap-2"><input aria-label="New account name" className="field" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="New account" /><button className="primary-button" onClick={() => { addAccount(newAccountName); setNewAccountName(''); }}>Add</button></div>
              </div>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 p-3 text-sm"><span><strong className="block">Accent color</strong><small className="text-slate-500">Choose your default highlight color.</small></span><select aria-label="Accent color" value={accent} onChange={event => setAccent(event.target.value)} className="field mt-0 w-auto"><option value="indigo">Indigo</option><option value="emerald">Emerald</option><option value="violet">Violet</option><option value="rose">Rose</option><option value="amber">Amber</option></select></label>
              <button className="secondary-button" onClick={exportJSON}><Download className="w-4 h-4" /> Download JSON backup</button>
              <button className="secondary-button" onClick={exportCSV}><Download className="w-4 h-4" /> Export holdings CSV</button>
              <label className="secondary-button cursor-pointer relative"><Upload className="w-4 h-4" /> Import holdings CSV<input aria-label="Choose holdings CSV" type="file" accept=".csv,text/csv" className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={event => { importCSV(event); setSettingsOpen(false); }} /></label>
              <label className="secondary-button cursor-pointer relative"><Upload className="w-4 h-4" /> Restore JSON backup<input aria-label="Choose JSON backup" type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={event => { importJSON(event); setSettingsOpen(false); }} /></label>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-sm text-slate-400 mb-3">Permanently clear this browser’s portfolio. Export a backup first.</p>
              <button className="secondary-button text-rose-400" onClick={onDeleteAllData}><Trash2 className="w-4 h-4" /> Delete all saved data</button>
            </div>
          </Modal>}

        </div>

      </div>

      {/* Mobile Bottom Bar */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 ${isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-200'} backdrop-blur-lg border-t px-2 py-2.5 flex justify-around items-center z-50`}>
        <button
          aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <PieIcon className="w-4 h-4" /> Dashboard
        </button>
        <button
          aria-current={activeTab === 'holdings' ? 'page' : undefined} onClick={() => setActiveTab('holdings')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'holdings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <ArrowDownUp className="w-4 h-4" /> Holdings
        </button>
        <button
          aria-current={activeTab === 'watchlist' ? 'page' : undefined} onClick={() => setActiveTab('watchlist')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'watchlist' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <Eye className="w-4 h-4" /> Watchlist
        </button>
        <button
          aria-current={activeTab === 'rebalance' ? 'page' : undefined} onClick={() => setActiveTab('rebalance')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'rebalance' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <Sliders className="w-4 h-4" /> Rebalance
        </button>
        <button
          aria-current={activeTab === 'history' ? 'page' : undefined} onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>
    </nav>
  );
}
