import { DashboardCard } from './DashboardCard';
import { formatMoney } from '../services/formatMoney';
import { Money } from './Money';
export function Onboarding({ onStart }) {
  return <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl mx-auto my-12">
    <p className="text-indigo-400 font-semibold mb-3">Welcome to ApexFinance</p>
    <h1 className="text-3xl font-bold mb-4">Your portfolio, in one place</h1>
    <p className="text-slate-400 mb-6">Start with your own holdings and cash, or explore a clearly labeled sample portfolio. Your data is saved in this browser.</p>
    <div className="flex flex-wrap gap-3"><button className="primary-button" onClick={() => onStart('personal')}>Start empty</button><button className="secondary-button" onClick={() => onStart('demo')}>Explore demo</button></div>
  </section>;
}

export function CashPanel({ summary, currencyCode = 'USD', hasCashRecords = false, onRecord }) {
  return <DashboardCard cardId="cash" label="Available cash" aria-labelledby="cash-title" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-5">
    <div><h2 id="cash-title" className="font-semibold">Available cash</h2><p className="text-2xl font-bold tabular-nums mt-1">{hasCashRecords ? <Money amount={formatMoney(summary.cashValue, currencyCode)} /> : 'Not recorded'}</p><p className="text-sm text-slate-400 mt-1">{Object.entries(summary.cashBalances).filter(([, amount]) => Math.abs(amount) > 1e-8).map(([code, amount]) => <span key={code}><Money amount={formatMoney(amount, code)} /> </span>)}{!Object.values(summary.cashBalances).some(amount => Math.abs(amount) > 1e-8) && (hasCashRecords ? 'Recorded cash balance is zero.' : 'An opening cash balance has not been recorded.')}</p><p className="text-sm text-slate-400">{hasCashRecords ? 'Total portfolio value includes holdings and recorded cash.' : 'Use a deposit to record your opening cash and establish contributed capital.'}</p></div>
    <div><div className="flex flex-wrap gap-2"><button className="primary-button" onClick={() => onRecord('DEPOSIT')} >{hasCashRecords ? 'Record deposit' : 'Set opening balance'}</button><button className="secondary-button" disabled={!hasCashRecords} aria-describedby={!hasCashRecords ? 'withdrawal-help' : undefined} onClick={() => onRecord('WITHDRAW')}>Record withdrawal</button></div>{!hasCashRecords && <p id="withdrawal-help" className="text-xs text-slate-400 mt-2">Record an opening balance before withdrawing cash.</p>}</div>
  </DashboardCard>;
}

export function RecentlyDeleted({ entries, onRestore, onClear }) {
  if (!entries.length) return null;
  return <details className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6"><summary className="cursor-pointer font-semibold flex items-center justify-between gap-4"><span>Recently deleted ({entries.length}) · Undo available</span><button type="button" className="danger-button secondary-button text-rose-400 shrink-0" onClick={event => { event.preventDefault(); onClear(); }}>Dismiss all</button></summary><p className="text-sm text-slate-400 my-3">The last 20 deletions are saved in this browser. Undo restores removed records without replacing newer work.</p><ul className="space-y-2">{entries.map(entry => <li key={entry.id} className="flex items-center justify-between gap-4"><span>{entry.label}</span><button className="secondary-button" aria-label={`Undo ${entry.label}`} onClick={() => onRestore(entry.id)}>Undo</button></li>)}</ul></details>;
}
