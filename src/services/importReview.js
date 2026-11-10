const upper = value => String(value || '').trim().toUpperCase();
export function transactionFingerprint(row) {
  const trade = ['BUY', 'SELL'].includes(upper(row.type));
  const cash = ['DEPOSIT', 'WITHDRAW'].includes(upper(row.type));
  return JSON.stringify([row.date, upper(row.type), cash ? '' : upper(row.symbol), upper(row.currency), trade ? Number(row.shares || 0) : 0, trade ? Number(row.price || 0) : 0, trade ? 0 : Number(row.total || 0), trade ? Number(row.fee || 0) : 0, row.type === 'SPLIT' ? Number(row.ratio || 0) : 0]);
}
export function findImportDuplicates(rows, existing, kind) {
  const fingerprint = kind === 'transactions' ? transactionFingerprint : row => JSON.stringify([upper(row.symbol), upper(row.currency), Number(row.shares), Number(row.avgCost), upper(row.accountName)]);
  const seen = new Set(existing.map(fingerprint));
  return rows.map(row => { const key = fingerprint(row); const duplicate = seen.has(key); seen.add(key); return duplicate; });
}
const stable = value => JSON.stringify(value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
export function compareCollection(current = [], incoming = [], key = 'id') {
  const before = new Map(current.map(item => [item[key], item]));
  const after = new Map(incoming.map(item => [item[key], item]));
  return {
    added: incoming.filter(item => !before.has(item[key])),
    removed: current.filter(item => !after.has(item[key])),
    changed: incoming.filter(item => before.has(item[key]) && stable(before.get(item[key])) !== stable(item)).map(item => ({ before: before.get(item[key]), after: item, fields: [...new Set([...Object.keys(before.get(item[key])), ...Object.keys(item)])].filter(field => stable(before.get(item[key])[field]) !== stable(item[field])) })),
  };
}
