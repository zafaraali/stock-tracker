import React from 'react';

export function DashboardSetup({ onNavigate, onExploreDemo }) {
  return <section className="setup-panel bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 mb-6" aria-labelledby="setup-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Quick setup</p><h2 id="setup-title" className="text-xl font-bold text-white mt-1">Build your portfolio view</h2><p className="text-sm text-slate-400 mt-1">Complete one step to start seeing allocation, performance, and income insights.</p></div>
      <button className="secondary-button" onClick={onExploreDemo}>Explore demo</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
      <button className="setup-step" onClick={() => onNavigate('holdings')}><span className="setup-number">1</span><span><strong>Add a holding</strong><small>Track a stock, ETF, or crypto.</small></span></button>
      <button className="setup-step" onClick={() => onNavigate('history')}><span className="setup-number">2</span><span><strong>Record cash</strong><small>Add a deposit or transaction.</small></span></button>
      <button className="setup-step" onClick={() => onNavigate('watchlist')}><span className="setup-number">3</span><span><strong>Build a watchlist</strong><small>Save ideas for later.</small></span></button>
    </div>
  </section>;
}
