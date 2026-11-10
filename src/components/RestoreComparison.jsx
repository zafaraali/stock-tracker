import { compareCollection } from '../services/importReview';
import { useState, useContext } from 'react';
import { Modal } from './Modal';
import { PrivacyContext } from './OverviewControls';

const fieldLabel = field => ({ shares: 'Shares', avgCost: 'Average cost (native currency)', currentPrice: 'Current price (native currency)', targetPercent: 'Target %', dividendYield: 'Dividend yield %', name: 'Name', category: 'Category' })[field] || field.replace(/([A-Z])/g, ' $1');
const valueLabel = value => value === undefined || value === null ? '(not set)' : typeof value === 'object' ? JSON.stringify(value) : typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 8 }) : String(value) || '(empty)';

function ChangedRecord({ item }) {
  const privateMode = useContext(PrivacyContext);
  return <li><strong>Replace {item.after.symbol || item.after.name || item.after.date || item.after.id}</strong><dl className="restore-field-changes">{item.fields.map(field => <div key={field}><dt>{fieldLabel(field)}</dt><dd>{privateMode ? '•••• → ••••' : <>{valueLabel(item.before[field])} → {valueLabel(item.after[field])}</>}</dd></div>)}</dl></li>;
}

export function RestoreReview({ current, incoming, onConfirm, onCancel }) {
  const [accepted, setAccepted] = useState(false);
  return <Modal title="Review backup restore" onClose={onCancel}><RestoreComparison current={current} incoming={incoming} /><label className="flex gap-2 items-start my-4"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I understand this replaces the entire portfolio, including records marked removed. I have saved a backup if needed.</label><div className="flex justify-end gap-2"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={!accepted} onClick={onConfirm}>Replace portfolio</button></div></Modal>;
}

export function RestoreComparison({ current, incoming }) {
  const groups = [['holdings', 'id'], ['transactions', 'id'], ['watchlist', 'id'], ['snapshots', 'date'], ['accounts', 'id']];
  return <div className="space-y-3 mb-4"><p className="supporting-text">Restoring replaces your portfolio; it does not merge records.</p><details className="supporting-text"><summary className="cursor-pointer">How this comparison works</summary><p className="mt-2">Comparison uses record IDs (dates for snapshots). A record with a new ID is shown as removed and added, even if it represents the same investment. Legacy cash holdings may be converted to cash deposits during restore.</p></details>{groups.map(([name, key]) => {
    const difference = compareCollection(current[name], incoming[name] || (name === 'accounts' ? [{ id: 'account-main', name: 'Main', type: '', currency: 'USD' }] : []), key);
    return <details key={name} className="rounded-lg border border-slate-800 p-3"><summary className="cursor-pointer capitalize">{name}: {difference.added.length} added · {difference.removed.length} removed · {difference.changed.length} replaced</summary><ul className="text-sm space-y-2 mt-2">{difference.added.map((item, index) => <li key={`a${index}`}>Add: {item.symbol || item.name || item.date || item.id}</li>)}{difference.removed.map((item, index) => <li key={`r${index}`}>Remove: {item.symbol || item.name || item.date || item.id}</li>)}{difference.changed.map((item, index) => <ChangedRecord key={`c${index}`} item={item} />)}</ul></details>;
  })}<p className="supporting-text">Backup preferences: {['currency', 'theme', 'accent', 'selectedAccountId'].filter(key => incoming[key] !== undefined && incoming[key] !== current[key]).map(key => `${key}: ${String(current[key] ?? 'default')} → ${String(incoming[key])}`).join(' · ') || 'No changes to display currency, theme, accent, or selected list.'} Exchange-rate data may also be replaced. This is a full restore, not a merge.</p></div>;
}
