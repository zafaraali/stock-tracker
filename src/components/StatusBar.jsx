import { Printer, MoreHorizontal, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function StatusBar({ marketStatus, priceDates = [], fxData, fxError, lastSavedAt, historicalEstimated, onRetry, children }) {
  const [online, setOnline] = useState(() => typeof window === 'undefined' || window.navigator.onLine);
  useEffect(() => { const update = () => setOnline(window.navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const reportRef = useRef(null);
  useEffect(() => {
    const outside = event => { const report = reportRef.current; if (report && !report.contains(event.target)) report.open = false; };
    const escape = event => {
      if (event.key === 'Escape' && reportRef.current?.open) {
        reportRef.current.open = false;
        reportRef.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const savedDates = priceDates.map(value => Date.parse(value)).filter(Number.isFinite);
  const savedPriceLabel = savedDates.length ? `Oldest dated holding price: ${new Date(Math.min(...savedDates)).toLocaleString()}.` : 'Saved price timestamps are unavailable.';
  const fxDateLabel = fxData.date && fxData.date <= today
    ? `latest published reference rates as of ${fxData.date}`
    : fxData.fetchedAt
      ? `latest available rates fetched ${new Date(fxData.fetchedAt).toLocaleDateString()}`
      : 'latest available rates';
  return <div className="no-print status-bar">
    <details className="min-w-0 flex-1">
      <summary className="cursor-pointer min-h-11 flex items-center gap-2 flex-wrap">
        <span className={`h-2 w-2 rounded-full ${marketStatus.error ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <span>{!online ? 'Offline · using saved data' : marketStatus.loading ? 'Refreshing prices...' : marketStatus.error ? 'Some prices may be out of date' : marketStatus.lastUpdated ? `Prices refreshed ${new Date(marketStatus.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Showing saved prices'}</span>
        <span className="text-slate-400">· {lastSavedAt ? 'Saved' : 'Save pending'}</span>
        <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
      </summary>
      <div className="text-sm text-slate-400 pb-3 space-y-2">
        {!online && <p role="status">Saved holdings, local edits, and file backups work offline. Prices, ticker search, exchange-rate updates, and Google Drive need a connection. Previously cached app screens can open offline. New transaction drafts stay in this browser tab until saved or discarded; they are not included in backups.</p>}
        {lastSavedAt && <p>Last saved: {new Date(lastSavedAt).toLocaleString()}</p>}
        <p>{marketStatus.error ? 'Prices that could not refresh retain their saved values; totals may be out of date.' : 'Prices refresh every five minutes.'} {marketStatus.error}</p>
        <p>{savedPriceLabel} {priceDates.length > savedDates.length && 'Some holdings have no saved price timestamp.'}</p>
        <p>Exchange rates: {fxDateLabel}. Transactions use trade-date rates. {historicalEstimated && 'Some historical conversions are estimated while dated rates are unavailable.'} {fxError}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Check Yahoo Finance</a>
          <a href="https://www.google.com/finance" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Check Google Finance</a>
        </div>
      </div>
    </details>
    <details ref={reportRef} className="report-menu relative shrink-0">
      <summary aria-label="Portfolio actions" className="icon-button cursor-pointer"><MoreHorizontal className="w-5 h-5" /></summary>
      <div className="report-menu-panel space-y-3">
        {marketStatus.error && <button className="secondary-button" disabled={marketStatus.loading} onClick={onRetry}>{marketStatus.loading ? 'Retrying…' : 'Retry prices'}</button>}
        <button onClick={event => { event.currentTarget.closest('details').open = false; window.print(); }} className="secondary-button whitespace-nowrap"><Printer className="w-4 h-4" /> Print report</button>
        {children}
      </div>
    </details>
  </div>;
}
