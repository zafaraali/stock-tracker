import { fallbackRates } from './exchangeRates';
import { detectSymbolCurrency } from './marketApi';

export const CASH_TYPES = ['DEPOSIT', 'WITHDRAW'];
export const POSITION_TYPES = ['BUY', 'SELL', 'SPLIT'];
const order = { DEPOSIT: 0, BUY: 1, SPLIT: 2, SELL: 3, DIVIDEND: 4, WITHDRAW: 5 };
export const compareEntries = (a, b) => String(a.date).localeCompare(String(b.date)) || (order[a.type] - order[b.type]) || String(a.id).localeCompare(String(b.id));
export const entryCurrency = (entry, holdings = []) => entry.currency || holdings.find(h => h.id === entry.holdingId)?.currency || detectSymbolCurrency(entry.symbol);
export const entryRate = (entry, holdings, historical = {}) => entry.fxRate || historical[entry.date]?.rates?.[entryCurrency(entry, holdings)] || fallbackRates[entryCurrency(entry, holdings)];
export const grossValue = entry => Number(entry.shares || 0) * Number(entry.price || 0);
export const cashChange = entry => {
  if (entry.type === 'DEPOSIT') return Number(entry.total);
  if (entry.type === 'WITHDRAW') return -Number(entry.total);
  if (!entry.cashImpact || entry.type === 'SPLIT') return 0;
  if (entry.type === 'BUY') return -grossValue(entry) - Number(entry.fee || 0);
  if (entry.type === 'SELL') return grossValue(entry) - Number(entry.fee || 0);
  return entry.type === 'DIVIDEND' ? Number(entry.total) : 0;
};

export function calculateCash(transactions, holdings = []) {
  const balances = {};
  for (const entry of transactions) {
    const code = entryCurrency(entry, holdings);
    balances[code] = (balances[code] || 0) + cashChange(entry);
  }
  for (const code of Object.keys(balances)) if (Math.abs(balances[code]) < 1e-8) balances[code] = 0;
  return balances;
}

export function externalContributions(transactions, holdings = [], historical = {}, through = '9999-12-31') {
  return transactions.filter(t => t.date <= through).reduce((sum, t) => {
    let contribution = 0;
    if (t.type === 'DEPOSIT') contribution = t.total;
    else if (t.type === 'WITHDRAW') contribution = -t.total;
    else if (!t.cashImpact && t.type === 'BUY') contribution = t.openingValue ?? grossValue(t) + Number(t.fee || 0);
    else if (!t.cashImpact && t.type === 'SELL') contribution = -(grossValue(t) - Number(t.fee || 0));
    else if (!t.cashImpact && t.type === 'DIVIDEND') contribution = -t.total;
    return sum + contribution / entryRate(t, holdings, historical);
  }, 0);
}

export function positionLedger(holdings, transactions, historical = {}) {
  const tradedIds = new Set(transactions.filter(t => POSITION_TYPES.includes(t.type)).map(t => t.holdingId));
  const positions = new Map(holdings.map(h => {
    // Imported/manual positions can legitimately have no trade history. Keep
    // their entered quantity and cost when unrelated ledger entries change.
    const hasTrades = tradedIds.has(h.id);
    const shares = hasTrades ? 0 : Number(h.shares || 0);
    const basis = hasTrades ? 0 : shares * Number(h.avgCost || 0);
    const fx = fallbackRates[h.currency] || 1;
    return [h.id, { ...h, shares, basis, costBasisUSD: basis / fx }];
  }));
  let realizedUSD = 0;
  for (const t of [...transactions].sort(compareEntries)) {
    const p = positions.get(t.holdingId);
    if (!p || !POSITION_TYPES.includes(t.type)) continue;
    if (t.type === 'SPLIT') { p.shares *= t.ratio; continue; }
    const fee = Number(t.fee || 0);
    const fx = entryRate(t, holdings, historical);
    if (t.type === 'BUY') {
      p.shares += t.shares;
      p.basis += grossValue(t) + fee;
      p.costBasisUSD += (grossValue(t) + fee) / fx;
    } else {
      const sold = Math.min(t.shares, p.shares);
      const fraction = p.shares > 0 ? sold / p.shares : 0;
      realizedUSD += (sold * t.price - fee) / fx - p.costBasisUSD * fraction;
      p.basis *= 1 - fraction;
      p.costBasisUSD *= 1 - fraction;
      p.shares = Math.max(0, p.shares - sold);
    }
  }
  return {
    holdings: [...positions.values()].map(({ basis, ...p }) => ({ ...p, avgCost: p.shares > 0 ? basis / p.shares : 0 })),
    realizedUSD
  };
}

export function performanceHistory(snapshots, transactions, holdings, historical = {}) {
  const observations = snapshots.filter(s => Number.isFinite(s.netContributionsUSD)).sort((a, b) => a.date.localeCompare(b.date));
  if (!observations.length) return [];
  const first = observations[0];
  const initialValue = first.startingValueUSD ?? first.valueUSD;
  const initialContributions = Array.isArray(first.startingTransactionIds)
    ? externalContributions(transactions.filter(t => first.startingTransactionIds.includes(t.id)), holdings, historical)
    : first.startingContributionsUSD ?? first.netContributionsUSD;
  let previous = null;
  let cumulativeFactor = 1;
  return observations.map(s => {
    const contributions = externalContributions(transactions, holdings, historical, s.date);
    const capitalUSD = initialValue + contributions - initialContributions;
    const netFlowUSD = previous ? s.netContributionsUSD - previous.netContributionsUSD : 0;
    const periodReturn = previous && previous.valueUSD > 0
      ? (s.valueUSD - netFlowUSD) / previous.valueUSD - 1
      : 0;
    if (Number.isFinite(periodReturn) && periodReturn > -1) cumulativeFactor *= 1 + periodReturn;
    const returnPercent = (cumulativeFactor - 1) * 100;
    previous = s;
    return { ...s, capitalUSD, gainUSD: s.valueUSD - capitalUSD, periodReturn, returnPercent };
  });
}

export function mergeDeleted(current, entry) {
  const result = { ...current };
  for (const key of ['holdings', 'transactions', 'watchlist']) {
    const restored = entry[key] || [];
    if (restored.some(item => current[key].some(existing => existing.id === item.id))) throw new Error('An item with the same ID already exists. Undo would overwrite it.');
    result[key] = [...current[key], ...restored];
  }
  return result;
}
