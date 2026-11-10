import { Printer } from 'lucide-react';

export function StatusBar({ marketStatus, fxData, fxError, historicalEstimated }) {
  const today = new Date().toISOString().slice(0, 10);
  const fxDateLabel = fxData.date && fxData.date <= today
    ? `latest published reference rates as of ${fxData.date}`
    : fxData.fetchedAt
      ? `latest available rates fetched ${new Date(fxData.fetchedAt).toLocaleDateString()}`
      : 'latest available rates';
  return <div className="no-print status-bar">
    <details className="min-w-0 flex-1">
      <summary className="cursor-pointer min-h-11 flex items-center gap-2 flex-wrap">
        <span className={`h-2 w-2 rounded-full ${marketStatus.error ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <span>{marketStatus.loading ? 'Refreshing prices…' : marketStatus.lastUpdated ? `Prices refreshed ${new Date(marketStatus.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Showing saved prices'}</span>
        <span className="text-slate-400">· Data details ▾</span>
      </summary>
      <div className="text-sm text-slate-400 pb-3 space-y-2">
        <p>Prices refresh every five minutes. {marketStatus.error}</p>
        <p>Exchange rates: {fxDateLabel}. Transactions use trade-date rates. {historicalEstimated && 'Some historical conversions are estimated while dated rates are unavailable.'} {fxError}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Check Yahoo Finance</a>
          <a href="https://www.google.com/finance" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Check Google Finance</a>
        </div>
      </div>
    </details>
    <button onClick={() => window.print()} className="secondary-button self-start"><Printer className="w-4 h-4" /> Print report</button>
  </div>;
}
