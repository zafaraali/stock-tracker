import { Money } from './Money';
import { FilterPanel } from './FilterPanel';
import { usePreference } from '../hooks/usePreference';
import { Pagination } from './Pagination';
import { usePagination } from '../hooks/usePagination';
import { formatMoney } from '../services/formatMoney';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Modal, FormError } from './Modal';
import { CURRENCY_RATES } from '../data/mockData';
import { CASH_TYPES, entryCurrency, entryRate, grossValue } from '../services/ledger';
import { EmptyState } from './EmptyState';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const emptyForm = (type = 'BUY') => ({ id: '', holdingId: '', type, date: today(), shares: '', price: '', total: '', fee: '0', ratio: '2', currency: 'CAD', cashImpact: true });

export function HistoryView({ transactions, holdings, currencyCode = 'USD', rate, historicalFx, onSaveTransaction, onDeleteTransaction, intent, onIntentHandled }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [pageSize, setPageSize] = usePreference('apex-transactions-page-size', 20, [20, 50, 100]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const dateInputRef = useRef(null);
  useEffect(() => { if (intent) { setForm({ ...emptyForm(intent.type), currency: intent.currency || currencyCode }); setOpen(true); setError(''); onIntentHandled?.(); } }, [intent, currencyCode, onIntentHandled]);
  const isCash = CASH_TYPES.includes(form.type);
  const isTrade = ['BUY', 'SELL'].includes(form.type);
  const isEditing = Boolean(form.id);
  const code = isCash ? form.currency : entryCurrency({ ...form, currency: undefined }, holdings);
  const change = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setError(''); };
  const add = type => { setForm({ ...emptyForm(type), holdingId: holdings[0]?.id || '' }); setError(''); setOpen(true); };
  const edit = t => { setForm({ ...emptyForm(t.type), ...t, originalPrice: t.price, cashImpact: t.cashImpact === true }); setError(''); setOpen(true); };
  const submit = event => {
    event.preventDefault();
    const { originalPrice, ...formValues } = form;
    const entry = {
      ...formValues,
      ...(isTrade ? { shares: Number(form.shares), price: form.price === '' && isEditing ? Number(originalPrice) : Number(form.price) } : { shares: undefined, price: undefined }),
      total: Number(form.total),
      fee: isTrade ? Number(form.fee) : 0,
      ratio: Number(form.ratio),
      currency: code
    };
    if (onSaveTransaction(entry, setError)) { setOpen(false); setError(''); }
  };
  const ordered = useMemo(() => [...transactions]
    .filter(transaction => typeFilter === 'ALL' || transaction.type === typeFilter)
    .filter(transaction => !search || String(transaction.symbol || '').toLowerCase().includes(search.toLowerCase()))
    .filter(transaction => !fromDate || transaction.date >= fromDate)
    .filter(transaction => !toDate || transaction.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))), [transactions, typeFilter, search, fromDate, toDate]);
  const pagination = usePagination(ordered, `${typeFilter}|${search}|${fromDate}|${toDate}|${pageSize}`, pageSize);
  return <div className="space-y-6">
    <header className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-wrap gap-4 justify-between">
      <div><h2 className="text-xl font-bold">Transactions & cash</h2><p className="text-sm text-slate-400 mt-2">Deposits, withdrawals, trades, dividends, and stock splits. Fees are included in cost basis and gains.</p></div>
      <div className="flex flex-wrap gap-2 items-center"><button className="secondary-button" onClick={() => add('DEPOSIT')}>Deposit</button><button className="secondary-button" onClick={() => add('WITHDRAW')}>Withdraw</button><button className="primary-button" onClick={() => add('BUY')}>Add transaction</button></div>
    </header>
    <FilterPanel>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
      <label className="text-xs text-slate-400">Search symbol<input className="field mt-1" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="AAPL" /></label>
      <label className="text-xs text-slate-400">Type<select className="field mt-1" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>{['ALL', 'BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAW', 'SPLIT'].map(type => <option key={type}>{type}</option>)}</select></label>
      <label className="text-xs text-slate-400">From<input className="field mt-1" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label>
      <label className="text-xs text-slate-400">To<input className="field mt-1" type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label>
      {(search || typeFilter !== 'ALL' || fromDate || toDate) && <button className="secondary-button" onClick={() => { setSearch(''); setTypeFilter('ALL'); setFromDate(''); setToDate(''); }}>Clear filters</button>}
    </div>
    </FilterPanel>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="financial-table responsive-table w-full text-sm">
      <thead className="text-slate-400 border-b border-slate-800"><tr>{['Date', 'Type', 'Symbol', 'Shares / ratio', 'Execution price', 'Fees', 'Amount', 'Actions'].map(label => <th key={label} data-label={label} className="p-4">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800/60">{!ordered.length ? <tr><td colSpan={8}><EmptyState compact title={transactions.length ? 'No matching transactions' : 'No transactions yet'} description={transactions.length ? 'Try a different symbol, type, or date range.' : 'Record a deposit or trade to begin tracking your portfolio.'} actionLabel={transactions.length ? 'Clear filters' : 'Record a transaction'} onAction={() => { if (transactions.length) { setSearch(''); setTypeFilter('ALL'); setFromDate(''); setToDate(''); } else add('BUY'); }} /></td></tr> : pagination.pageItems.map(t => {
        const currency = entryCurrency(t, holdings);
        const fx = entryRate(t, holdings, historicalFx);
        const amount = t.type === 'BUY' ? grossValue(t) + Number(t.fee || 0) : t.type === 'SELL' ? grossValue(t) - Number(t.fee || 0) : Number(t.total || 0);
        return <tr key={t.id}>
          <td data-label="Date" className="p-4 text-slate-400">{t.date}</td>
          <td data-label="Type" className="p-4"><span className="font-semibold text-indigo-400">{t.type}</span>{['BUY', 'SELL', 'DIVIDEND'].includes(t.type) && <div className="text-xs text-slate-400">{t.cashImpact ? 'Tracked cash' : 'Outside cash ledger'}</div>}</td>
          <td data-label="Symbol" className="p-4 font-semibold">{CASH_TYPES.includes(t.type) ? currency + ' cash' : t.symbol}</td>
          <td data-label="Shares / ratio" className="p-4">{t.type === 'SPLIT' ? `${t.ratio}:1` : ['BUY', 'SELL'].includes(t.type) ? t.shares : '—'}</td>
          <td data-label="Execution price" className="p-4">{['BUY', 'SELL'].includes(t.type) ? formatMoney(t.price, currency) : '—'}</td>
          <td data-label="Fees" className="p-4"><Money amount={formatMoney(t.fee || 0, currency)} /></td>
          <td data-label="Amount" className="p-4 font-semibold">{t.type === 'SPLIT' ? 'No cash change' : <><Money amount={formatMoney(amount / fx * rate, currencyCode)} /><div className="text-xs text-slate-400"><Money amount={formatMoney(amount, currency)} /></div></>}</td>
          <td data-label="Actions" className="p-4"><button className="icon-button mr-2" aria-label={`Edit ${t.type} transaction for ${t.symbol || t.currency || 'cash'} on ${t.date}`} onClick={() => edit(t)}><Pencil className="w-4 h-4" /></button><button className="danger-button icon-button text-rose-400" aria-label={`Delete ${t.type} transaction for ${t.symbol || t.currency || 'cash'} on ${t.date}`} onClick={() => onDeleteTransaction(t.id)}><Trash2 className="w-4 h-4" /></button></td>
        </tr>;
      })}</tbody>
    </table></div></div>
    <Pagination {...pagination} total={ordered.length} onPageChange={pagination.setPage} onPageSizeChange={setPageSize} label="Transactions" />
    <p className="text-sm text-slate-400">Existing trades stay outside tracked cash unless enabled. Same-day entries apply deposits, buys, splits, sells, dividends, then withdrawals. Historical amounts use trade-date FX, then current display-currency FX.</p>
    {open && <Modal title={form.id ? 'Edit transaction' : 'Add transaction'} onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={submit}>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-4"><label>Type<select aria-label="Type" value={form.type} onChange={e => change('type', e.target.value)} className="field">{['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'DEPOSIT', 'WITHDRAW'].map(type => <option key={type}>{type}</option>)}</select></label><label>Date<div className="date-picker-field"><input ref={dateInputRef} type="date" required value={form.date} onChange={e => change('date', e.target.value)} className="field" /><button type="button" className="date-picker-button" aria-label="Open date picker" title="Open date picker" onClick={() => dateInputRef.current?.showPicker?.()}><CalendarDays className="w-4 h-4" /></button></div></label></div>
      {isCash ? <label>Currency<select aria-label="Currency" value={form.currency} onChange={e => change('currency', e.target.value)} className="field">{Object.keys(CURRENCY_RATES).map(c => <option key={c}>{c}</option>)}</select></label> : <label>Holding<select required value={form.holdingId} onChange={e => change('holdingId', e.target.value)} className="field"><option value="">Choose a holding</option>{holdings.map(h => <option key={h.id} value={h.id}>{h.symbol}</option>)}</select></label>}
      {isTrade ? <><div className="grid grid-cols-2 gap-4"><label>Shares<input className="field" type="number" min="0.00000001" step="any" required value={form.shares} onChange={e => change('shares', e.target.value)} /></label><label>Price ({code})<input className="field" type="number" min="0.00000001" step="any" required={!isEditing} placeholder={isEditing ? 'Leave blank to keep existing' : ''} value={form.price} onChange={e => change('price', e.target.value)} /></label></div><label>Commission / fees ({code})<input className="field" type="number" min="0" step="any" required value={form.fee} onChange={e => change('fee', e.target.value)} /></label></> : form.type === 'SPLIT' ? <><label>New shares per old share<input className="field" type="number" min="0.00000001" step="any" required value={form.ratio} onChange={e => change('ratio', e.target.value)} /></label><p className="text-sm text-slate-400">Use 2 for 2-for-1, or 0.1 for a 1-for-10 reverse split. Total cost basis stays the same. Update manual market prices separately; live quotes already reflect splits.</p></> : <label>Amount ({code})<input className="field" type="number" min="0.00000001" step="any" required value={form.total} onChange={e => change('total', e.target.value)} /></label>}
      {!isCash && form.type !== 'SPLIT' && <label className="flex items-start gap-3"><input type="checkbox" checked={form.cashImpact} onChange={e => change('cashImpact', e.target.checked)} /><span>Apply to tracked {code} cash<span className="block text-sm text-slate-400">Buys need cash in the same currency. Turn off for trades recorded outside this cash ledger.</span></span></label>}
      <div className="flex justify-end gap-3"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button" type="submit">Save transaction</button></div>
    </form></Modal>}
  </div>;
}
