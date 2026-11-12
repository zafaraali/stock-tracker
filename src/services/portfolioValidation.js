import { validBackupPreferences } from './backupPreferences';
import { CURRENCY_RATES } from '../data/mockData';
import { validRates } from './exchangeRates';
import { compareEntries, CASH_TYPES, cashChange, entryCurrency, grossValue } from './ledger';

export const compareTrades = compareEntries;
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const number = (value, min = 0) => typeof value === 'number' && Number.isFinite(value) && value >= min;
const positive = value => number(value) && value > 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const unique = items => items.every(item => item && text(item.id)) && new Set(items.map(item => item.id)).size === items.length;
const currency = item => item.currency === undefined || Object.hasOwn(CURRENCY_RATES, item.currency);
const validAccounts = items => Array.isArray(items) && items.length > 0 && unique(items) && items.every(item => text(item.name) && currency(item));
const asset = item => text(item.symbol) && currency(item) && number(item.currentPrice) &&
  ['name', 'notes', 'category'].every(key => item[key] === undefined || typeof item[key] === 'string');

export function validateLedger(holdings, transactions) {
  const ids = new Set(holdings.map(item => item.id));
  const balances = new Map();
  const cash = {};
  for (const trade of [...transactions].sort(compareTrades)) {
    if (!trade || !validDate(trade.date) || !['BUY', 'SELL', 'DIVIDEND', 'SPLIT', ...CASH_TYPES].includes(trade.type) || !currency(trade)) return 'A transaction has an invalid date, type, or currency.';
    if (trade.cashImpact !== undefined && typeof trade.cashImpact !== 'boolean') return 'Invalid cash tracking flag.';
    if (trade.fxRate !== undefined && !positive(trade.fxRate)) return 'A transaction has an invalid exchange rate.';
    if (trade.fee !== undefined && (!number(trade.fee) || (!['BUY', 'SELL'].includes(trade.type) && trade.fee !== 0))) return 'Fees must be nonnegative and belong to a buy or sell.';
    if (trade.openingValue !== undefined && !number(trade.openingValue)) return 'Invalid opening position value.';
    if (!CASH_TYPES.includes(trade.type)) {
      if (!ids.has(trade.holdingId)) return 'A transaction refers to a missing holding.';
      const holding = holdings.find(item => item.id === trade.holdingId);
      if (trade.currency && holding.currency && trade.currency !== holding.currency) return 'Transaction currency must match its holding.';
    } else if (!trade.currency || trade.holdingId) return 'Cash movements need a currency and must not refer to a holding.';
    if (['DIVIDEND', ...CASH_TYPES].includes(trade.type)) {
      if (!positive(trade.total)) return 'Cash movements and dividend payments must be greater than zero.';
    } else if (trade.type === 'SPLIT') {
      const balance = balances.get(trade.holdingId) || 0;
      if (!positive(trade.ratio) || balance <= 0 || !Number.isFinite(balance * trade.ratio)) return 'A split needs a positive ratio and shares held on its date.';
      balances.set(trade.holdingId, balance * trade.ratio);
    } else {
      if (!positive(trade.shares) || !positive(trade.price)) return 'Trade quantities and prices must be greater than zero.';
      if (!Number.isFinite(grossValue(trade) + Number(trade.fee || 0))) return 'Trade value is too large.';
      if (trade.type === 'SELL' && Number(trade.fee || 0) > grossValue(trade)) return 'A sell fee cannot exceed its proceeds.';
      const balance = balances.get(trade.holdingId) || 0;
      if (trade.type === 'SELL' && trade.shares > balance + 1e-8) return `This change leaves a sale on ${trade.date} exceeding available shares. Adjust the sale first.`;
      balances.set(trade.holdingId, balance + (trade.type === 'BUY' ? trade.shares : -trade.shares));
    }
    const code = entryCurrency(trade, holdings);
    cash[code] = (cash[code] || 0) + cashChange(trade);
    if (!Number.isFinite(cash[code]) || cash[code] < -1e-8) return `Insufficient ${code} cash on ${trade.date}. Record a deposit first or mark an existing trade as outside tracked cash.`;
  }
  return '';
}

export const validWatchlist = items => Array.isArray(items) && unique(items) && items.every(item => asset(item) && (item.targetBuyPrice === undefined || item.targetBuyPrice === 0 || positive(item.targetBuyPrice)));
export const validSnapshots = items => Array.isArray(items) && items.every(item => item && validDate(item.date) && number(item.valueUSD) && ['netContributionsUSD', 'startingContributionsUSD'].every(key => item[key] === undefined || (typeof item[key] === 'number' && Number.isFinite(item[key]))) && (item.startingValueUSD === undefined || number(item.startingValueUSD))) && new Set(items.map(item => item.date)).size === items.length;

export function validateBackup(data) {
  if (data?.preferences !== undefined && !validBackupPreferences(data.preferences)) return 'Invalid backup preferences.';
  if (!data || !Array.isArray(data.holdings) || !Array.isArray(data.transactions) || !validWatchlist(data.watchlist) || !validSnapshots(data.snapshots)) return 'Invalid backup collections, watchlist prices, or snapshots.';
  if (!unique(data.holdings) || !unique(data.transactions)) return 'Backup contains missing or duplicate IDs.';
  if (!data.holdings.every(item => asset(item) && number(item.shares) && number(item.avgCost) &&
    ['targetPercent', 'dividendYield'].every(key => item[key] === undefined || (number(item[key]) && item[key] <= 100)) &&
    (item.buyDate === undefined || validDate(item.buyDate)))) return 'Backup contains invalid holding values.';
  if (data.currency !== undefined && !Object.hasOwn(CURRENCY_RATES, data.currency)) return 'Unsupported display currency.';
  if (data.accounts !== undefined && !validAccounts(data.accounts)) return 'Backup contains invalid accounts.';
  if (data.selectedAccountId !== undefined && data.accounts !== undefined && data.selectedAccountId !== '__combined__' && !data.accounts.some(account => account.id === data.selectedAccountId)) return 'Backup selects a missing account.';
  if (data.theme !== undefined && !['light', 'dark'].includes(data.theme)) return 'Invalid theme.';
  if (data.fxData !== undefined && !(data.fxData?.date === null && Object.keys(CURRENCY_RATES).every(code => positive(data.fxData.rates?.[code]))) && !validRates(data.fxData)) return 'Invalid exchange rate data.';
  if (data.historicalFx !== undefined && (!data.historicalFx || typeof data.historicalFx !== 'object' || Array.isArray(data.historicalFx) || !Object.entries(data.historicalFx).every(([date, rates]) => validDate(date) && validRates(rates)))) return 'Invalid historical exchange rate data.';
  if (data.transactions.some(item => item.total !== undefined && (!number(item.total) || (['BUY', 'SELL'].includes(item.type) && Math.abs(item.total - item.shares * item.price) > Math.max(0.01, item.total * 1e-10))))) return 'A transaction total does not match its quantity and price.';
  if (data.mode !== undefined && !['pending', 'personal', 'demo'].includes(data.mode)) return 'Invalid portfolio mode.';
  if (data.trash !== undefined && (!Array.isArray(data.trash) || data.trash.length > 20 || data.trash.some(entry => !entry || !text(entry.id) || !text(entry.label) || !['holdings', 'transactions', 'watchlist'].every(key => Array.isArray(entry[key]) && unique(entry[key]))))) return 'Invalid recently deleted items.';
  return validateLedger(data.holdings, data.transactions);
}
