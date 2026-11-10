import { useState } from 'react';
import { CSV_FIELDS, parseCsvRows, parsePortfolioCsv } from '../services/csvImport';
import { Modal } from './Modal';

export function CsvMapping({ source, onPreview, onCancel }) {
  const rows = parseCsvRows(source.text);
  const headers = rows[0] || [];
  const [custom, setCustom] = useState(false);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  return <Modal title="Map CSV columns" onClose={onCancel}><p className="supporting-text mb-3">{source.fileName}: {Math.max(0, rows.length - 1)} rows. Try automatic matching or choose your own column mapping. Nothing is imported yet.</p>
    <label className="flex items-center gap-2 mb-3"><input type="checkbox" checked={custom} onChange={event => setCustom(event.target.checked)} />Use custom column mapping</label>
    {custom && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.entries(CSV_FIELDS).map(([field, label]) => <label key={field}>{label}<select aria-label={label} className="field" value={mapping[field] ?? ''} onChange={event => setMapping(previous => ({ ...previous, [field]: event.target.value }))}><option value="">Not mapped</option>{headers.map((header, index) => <option key={index} value={index}>{index + 1}. {header || '(empty heading)'}</option>)}</select></label>)}</div>}
    <details className="my-3"><summary>First five source rows</summary><div className="overflow-x-auto"><table className="text-sm"><thead><tr>{headers.map((value, index) => <th className="p-2" key={index}>{value}</th>)}</tr></thead><tbody>{rows.slice(1, 6).map((row, index) => <tr key={index}>{row.map((value, column) => <td className="p-2" key={column}>{value}</td>)}</tr>)}</tbody></table></div></details>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="flex justify-end gap-2 mt-4"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" onClick={() => { try { const parsed = parsePortfolioCsv(source.text, source.accountId, custom ? mapping : undefined); onPreview(parsed); } catch (err) { setError(err.message); } }}>Preview import</button></div>
  </Modal>;
}
