import { CASH_TYPES, positionLedger, calculateCash, externalContributions, performanceHistory, mergeDeleted } from '../services/ledger';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { INITIAL_HOLDINGS, INITIAL_WATCHLIST, INITIAL_TRANSACTIONS, CURRENCY_RATES, INITIAL_CATEGORIES } from '../data/mockData';
import { compareTrades, validateLedger, validateBackup, validWatchlist, validSnapshots } from '../services/portfolioValidation';
import { readJSON, writeJSON, browserStorage } from '../services/storage';
import { fallbackRates, validRates, fetchExchangeRates } from '../services/exchangeRates';
import { fetchHistoricalMarketData, fetchMarketFundamentals, fetchMarketQuote, isTseSymbol, detectSymbolCurrency, inferSymbolMetadata } from '../services/marketApi';
import { parsePortfolioCsv } from '../services/csvImport';
import { BENCHMARK_SYMBOL } from '../services/performanceComparison';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const fileDate = () => today();

const DEFAULT_ACCOUNT = { id: 'account-main', name: 'Main', type: '', currency: 'USD' };
export const COMBINED_ACCOUNT_ID = '__combined__';
export const ACCENT_THEMES = {
  green: { label: 'Green', color: '#2f6f52' },
  red: { label: 'Red', color: '#8f3f4b' },
  orange: { label: 'Orange', color: '#a4572f' },
  yellow: { label: 'Yellow', color: '#806b1f' },
  blue: { label: 'Blue', color: '#345f83' },
  indigo: { label: 'Indigo', color: '#444b86' },
  violet: { label: 'Violet', color: '#5b4380' },
  emerald: { label: 'Emerald', color: '#2f6f52' },
  rose: { label: 'Rose', color: '#8f3f4b' },
  amber: { label: 'Amber', color: '#806b1f' },
};
const normalizeAccounts = value => Array.isArray(value) && value.length
  ? value.filter(account => account && account.id && account.name).map(account => ({ ...DEFAULT_ACCOUNT, ...account }))
  : [DEFAULT_ACCOUNT];
const accountIdFor = (item, fallback = DEFAULT_ACCOUNT.id) => item?.accountId || fallback;
const assignDefaultAccount = (items, fallback = DEFAULT_ACCOUNT.id) => items.map(item => ({ ...item, accountId: accountIdFor(item, fallback) }));
const normalizeTransactionDate = value => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) return `${slashDate[3]}-${slashDate[1].padStart(2, '0')}-${slashDate[2].padStart(2, '0')}`;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? raw : new Date(parsed).toISOString().slice(0, 10);
};

export function migratePortfolioData(holdings, transactions) {
  const migratedTransactions = transactions.map(transaction => {
    if (transaction.holdingId) return transaction;
    const candidates = holdings.filter(holding => holding.symbol?.toUpperCase() === transaction.symbol?.toUpperCase());
    const matchingDate = candidates.find(holding => holding.buyDate === transaction.date);
    return candidates.length
      ? { ...transaction, holdingId: (matchingDate || candidates[0]).id }
      : transaction;
  });

  holdings.forEach(holding => {
    const hasTrades = migratedTransactions.some(transaction =>
      transaction.holdingId === holding.id && ['BUY', 'SELL'].includes(transaction.type)
    );
    if (!hasTrades && Number(holding.shares) > 0) {
      migratedTransactions.push({
        id: `opening-${holding.id}`,
        holdingId: holding.id,
        date: holding.buyDate || today(),
        type: 'BUY',
        symbol: holding.symbol,
        shares: Number(holding.shares),
        price: Number(holding.avgCost),
        total: Number(holding.shares) * Number(holding.avgCost)
      });
    }
  });

  return { holdings, transactions: migratedTransactions };
}

export function rebuildHoldings(holdings, transactions, historical = {}) {
  return positionLedger(holdings, transactions, historical).holdings;
}

export function toUSD(amount, currency = 'USD', rates = fallbackRates) {
  const rate = rates[currency] || 1.0;
  return Number(amount) / rate;
}

export function fromUSD(amountUSD, currency = 'USD', rates = fallbackRates) {
  const rate = rates[currency] || 1.0;
  return Number(amountUSD) * rate;
}

export function getRealizedGains(transactions, holdings = [], historical = {}) {
  const inferred = holdings.length ? holdings : [...new Map(transactions.filter(t => t.holdingId).map(t => [t.holdingId, { id: t.holdingId, symbol: t.symbol, currency: t.currency }])).values()];
  return positionLedger(inferred, transactions, historical).realizedUSD;
}

export function loadSavedPortfolio(storage) {
    const errors = [];
    const failed = message => errors.push(message);
    const saved = readJSON(storage, 'st_pro_data_v2', null, value => validateBackup(value) === '', failed);
    if (saved) {
      const accounts = normalizeAccounts(saved.accounts);
      return { data: { ...saved, accounts, holdings: assignDefaultAccount(saved.holdings || [], accounts[0].id), transactions: assignDefaultAccount(saved.transactions || [], accounts[0].id), mode: saved.mode || 'personal' }, errors };
    }
    const empty = { holdings: [], transactions: [], watchlist: [], snapshots: [], mode: 'personal' };
    try {
      if (!errors.length && ['st_pro_holdings', 'st_pro_transactions', 'st_pro_watchlist'].every(key => storage.getItem(key) === null)) return { data: { ...empty, mode: 'pending' }, errors };
    } catch { failed('Browser storage is unavailable.'); }
    const legacyHoldings = readJSON(storage, 'st_pro_holdings', INITIAL_HOLDINGS, Array.isArray, failed);
    const legacyTrades = readJSON(storage, 'st_pro_transactions', INITIAL_TRANSACTIONS, Array.isArray, failed);
    let legacy = empty;
    try {
      legacy = { ...empty, ...migratePortfolioData(legacyHoldings, legacyTrades) };
      if (validateBackup(legacy)) throw new Error('Invalid ledger');
    } catch { failed('Saved holdings or transactions need recovery. Original data is preserved.'); legacy = empty; }
    legacy.watchlist = readJSON(storage, 'st_pro_watchlist', INITIAL_WATCHLIST, validWatchlist, failed);
    legacy.snapshots = readJSON(storage, 'st_pro_snapshots', [], validSnapshots, failed);
    try {
      const code = storage.getItem('st_pro_currency');
      const theme = storage.getItem('st_pro_theme');
      if (Object.hasOwn(CURRENCY_RATES, code)) legacy.currency = code;
      if (['dark', 'light'].includes(theme)) legacy.theme = theme;
    } catch { failed('Browser storage is unavailable.'); }
    legacy.accounts = [DEFAULT_ACCOUNT];
    legacy.holdings = assignDefaultAccount(legacy.holdings);
    legacy.transactions = assignDefaultAccount(legacy.transactions);
    return { data: legacy, errors };
}

export function usePortfolio() {
  const [uiMessage, setUiMessage] = useState('');
  const [recovery] = useState(() => loadSavedPortfolio(browserStorage));
  const [storageError, setStorageError] = useState(recovery.errors.join(' '));
  const [storageBlocked, setStorageBlocked] = useState(recovery.errors.length > 0);
  const [portfolioData, setPortfolioData] = useState(() => ({ holdings: rebuildHoldings(recovery.data.holdings, recovery.data.transactions), transactions: recovery.data.transactions }));
  const [accounts, setAccounts] = useState(() => normalizeAccounts(recovery.data.accounts));
  const [selectedAccountId, setSelectedAccountId] = useState(() => recovery.data.selectedAccountId || normalizeAccounts(recovery.data.accounts)[0].id);
  const activeAccountId = selectedAccountId === COMBINED_ACCOUNT_ID ? accounts[0].id : selectedAccountId;
  const [mode, setMode] = useState(recovery.data.mode || 'personal');
  const [trash, setTrash] = useState(recovery.data.trash || []);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const allHoldings = portfolioData.holdings;
  const allTransactions = portfolioData.transactions;
  const holdings = useMemo(() => selectedAccountId === COMBINED_ACCOUNT_ID ? allHoldings : allHoldings.filter(item => accountIdFor(item) === selectedAccountId), [allHoldings, selectedAccountId]);
  const transactions = useMemo(() => selectedAccountId === COMBINED_ACCOUNT_ID ? allTransactions : allTransactions.filter(item => accountIdFor(item) === selectedAccountId), [allTransactions, selectedAccountId]);
  const [watchlistData, setWatchlist] = useState(() => assignDefaultAccount(recovery.data.watchlist || []));
  const watchlist = useMemo(() => selectedAccountId === COMBINED_ACCOUNT_ID ? watchlistData : watchlistData.filter(item => accountIdFor(item) === selectedAccountId), [watchlistData, selectedAccountId]);
  const customCategories = useMemo(() => [...new Set([...allHoldings, ...watchlistData].map(item => String(item.category || '').trim()).filter(category => category && !INITIAL_CATEGORIES.includes(category)))].sort((a, b) => a.localeCompare(b)), [allHoldings, watchlistData]);
  const [snapshots, setSnapshots] = useState(recovery.data.snapshots);
  const backtestSymbols = useMemo(() => [...new Set([...allHoldings.map(item => item.symbol), BENCHMARK_SYMBOL].filter(Boolean))], [allHoldings]);
  const [backtestHistory, setBacktestHistory] = useState([]);
  const [currency, setCurrency] = useState(recovery.data.currency || 'CAD');
  const [theme, setTheme] = useState(recovery.data.theme || 'light');
  const [accent, setAccent] = useState(() => Object.hasOwn(ACCENT_THEMES, recovery.data.accent) ? recovery.data.accent : 'green');
  const [fxData, setFxData] = useState(() => readJSON(browserStorage, 'st_pro_fx', { date: null, rates: fallbackRates }, validRates));
  const [historicalFx, setHistoricalFx] = useState(() => readJSON(browserStorage, 'st_pro_fx_history', {}, value => value && typeof value === 'object' && Object.values(value).every(validRates)));
  const [fxError, setFxError] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const [pendingCsvImport, setPendingCsvImport] = useState(null);
  const fxRates = fxData.rates;

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled(backtestSymbols.map(async symbol => ({ symbol: symbol.toUpperCase(), points: await fetchHistoricalMarketData(symbol, controller.signal) })))
      .then(results => {
        if (!controller.signal.aborted) setBacktestHistory(results.filter(result => result.status === 'fulfilled').map(result => result.value));
      });
    return () => controller.abort();
  }, [backtestSymbols]);

  const [marketStatus, setMarketStatus] = useState({ loading: false, error: '', lastUpdated: null });
  const holdingsRef = useRef(holdings);
  const watchlistRef = useRef(watchlistData);
  holdingsRef.current = holdings;
  watchlistRef.current = watchlistData;

  useEffect(() => {
    if (storageBlocked || mode === 'pending') return;
    const savePortfolio = () => writeJSON(browserStorage, 'st_pro_data_v2', { holdings: allHoldings, transactions: allTransactions, accounts, selectedAccountId, watchlist: watchlistData, snapshots, currency, theme, accent, mode, trash });
    setStorageError(savePortfolio());
    const flushOnPageHide = () => { savePortfolio(); };
    window.addEventListener('pagehide', flushOnPageHide);
    return () => window.removeEventListener('pagehide', flushOnPageHide);
  }, [allHoldings, allTransactions, accounts, selectedAccountId, watchlistData, snapshots, currency, theme, accent, storageBlocked, mode, trash]);

  useEffect(() => {
    const controller = new AbortController();
    fetchExchangeRates('latest', controller.signal).then(data => {
      setFxData(data);
      const error = writeJSON(browserStorage, 'st_pro_fx', data);
      if (error) setStorageError(error);
    }).catch(() => { if (!controller.signal.aborted) setFxError('Current exchange rates unavailable; using cached or estimated rates.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const dates = [...new Set(transactions.filter(t => (t.currency || holdings.find(h => h.id === t.holdingId)?.currency || detectSymbolCurrency(t.symbol)) !== 'USD' && !t.fxRate).map(t => t.date))];
    const missing = dates.filter(date => !historicalFx[date]);
    if (!missing.length) return;
    const controller = new AbortController();
    Promise.allSettled(missing.map(async date => [date, await fetchExchangeRates(date, controller.signal)])).then(results => {
      if (controller.signal.aborted) return;
      const loaded = Object.fromEntries(results.filter(r => r.status === 'fulfilled').map(r => r.value));
      if (Object.keys(loaded).length) setHistoricalFx(previous => ({ ...previous, ...loaded }));
      if (results.some(r => r.status === 'rejected')) setFxError('Some historical exchange rates are unavailable; affected transactions use estimated rates.');
    });
    return () => controller.abort();
  }, [transactions, holdings, historicalFx]);

  useEffect(() => {
    const error = writeJSON(browserStorage, 'st_pro_fx_history', historicalFx);
    if (error) setStorageError(error);
  }, [historicalFx]);

  const refreshMarketData = useCallback(async () => {
    if (modeRef.current === 'pending') return;
    const symbols = [...new Set([
      ...holdingsRef.current.map(item => item.symbol),
      ...watchlistRef.current.map(item => item.symbol)
    ].filter(Boolean))];
    if (!symbols.length) {
      setMarketStatus({ loading: false, error: 'Add a holding or watchlist ticker to refresh live prices.', lastUpdated: null });
      return;
    }

    setMarketStatus(previous => ({ ...previous, loading: true, error: '' }));
    const results = await Promise.allSettled(symbols.map(symbol => fetchMarketQuote(symbol)));
    const holdingSymbols = [...new Set(holdingsRef.current.map(item => item.symbol).filter(Boolean))];
    const fundamentals = await Promise.allSettled(holdingSymbols.map(symbol => fetchMarketFundamentals(symbol)));
    const quotes = new Map(results
      .filter(result => result.status === 'fulfilled')
      .map(result => [result.value.symbol, result.value]));
    const yields = new Map(fundamentals
      .filter(result => result.status === 'fulfilled')
      .map((result, index) => [holdingSymbols[index].toUpperCase(), result.value.dividendYield]));
    const failedCount = results.filter(result => result.status === 'rejected').length;

    {
      setPortfolioData(previous => ({
        ...previous,
        holdings: previous.holdings.map(item => {
          const quote = quotes.get(item.symbol.toUpperCase());
          if (!quote) return { ...item, priceRefreshFailed: true };
          return {
            ...item,
            currentPrice: quote.price,
            dividendYield: yields.has(item.symbol.toUpperCase()) ? Number(Number(yields.get(item.symbol.toUpperCase()) || 0).toFixed(2)) : item.dividendYield,
            priceSource: 'live', priceUpdatedAt: quote.updatedAt, priceRefreshFailed: false,
            currency: quote.currency || item.currency || detectSymbolCurrency(item.symbol)
          };
        })
      }));
      setWatchlist(previous => previous.map(item => {
        const quote = quotes.get(item.symbol.toUpperCase());
        if (!quote) return { ...item, priceRefreshFailed: true };
        return {
          ...item,
          currentPrice: quote.price,
            priceSource: 'live', priceUpdatedAt: quote.updatedAt, priceRefreshFailed: false,
          currency: quote.currency || item.currency || detectSymbolCurrency(item.symbol)
        };
      }));
    }

    setMarketStatus({
      loading: false,
      error: failedCount && !quotes.size ? 'Live prices unavailable. Showing saved prices.' : failedCount ? `${failedCount} quote${failedCount === 1 ? '' : 's'} unavailable.` : '',
      lastUpdated: quotes.size ? new Date().toISOString() : null
    });
  }, []);

  useEffect(() => {
    refreshMarketData();
    const interval = window.setInterval(refreshMarketData, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshMarketData, mode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  const dismissMessage = useCallback(() => setUiMessage(''), []);

  const rate = fxRates[currency] || 1.0;
  const symbol = CURRENCY_RATES[currency]?.symbol || '$';

  const portfolioSummary = useMemo(() => {
    let totalValueUSD = 0;
    let totalCostUSD = 0;
    let annualDividendUSD = 0;
    let totalTargetPercent = 0;
    const categoryMap = {};

    const items = rebuildHoldings(holdings, transactions, historicalFx).map(h => {
      const holdingCurrency = h.currency || detectSymbolCurrency(h.symbol);
      const rawCurrentPrice = h.currentPrice !== undefined && h.currentPrice !== null ? Number(h.currentPrice) : Number(h.avgCost);
      const rawAvgCost = Number(h.avgCost || 0);

      const currentPriceUSD = toUSD(rawCurrentPrice, holdingCurrency, fxRates);
      const avgCostUSD = toUSD(rawAvgCost, holdingCurrency, fxRates);

      const valUSD = h.shares * currentPriceUSD;
      const costUSD = h.costBasisUSD || 0;
      const gainUSD = valUSD - costUSD;
        const nativeShares = Number(h.shares || 0);
        const nativeCost = nativeShares * rawAvgCost;
        const nativeGainLoss = nativeShares * (rawCurrentPrice - rawAvgCost);
        const nativeGainPercent = nativeCost > 0 ? (nativeGainLoss / nativeCost) * 100 : 0;
      
      const divYield = h.dividendYield ? Number(h.dividendYield) : 0;
      const itemAnnualDivUSD = valUSD * (divYield / 100);

      totalValueUSD += valUSD;
      totalCostUSD += costUSD;
      annualDividendUSD += itemAnnualDivUSD;
      totalTargetPercent += Number(h.targetPercent || 0);

      const cat = h.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + valUSD;

      return {
        ...h,
        currency: holdingCurrency,
        nativeCurrentPrice: rawCurrentPrice,
        nativeAvgCost: rawAvgCost,
        nativeTotalValue: Number(h.shares || 0) * rawCurrentPrice,
        currentPriceUSD,
        avgCostUSD,
        currentPrice: currentPriceUSD * rate,
        avgCost: avgCostUSD * rate,
        totalValue: valUSD * rate,
        totalCost: costUSD * rate,
        gainLoss: gainUSD * rate,
          nativeGainLoss,
          gainLossPercent: nativeGainPercent,
        annualDividend: itemAnnualDivUSD * rate
      };
    });

    const holdingsValueUSD = totalValueUSD;
    const cashBalances = calculateCash(transactions, holdings);
    const cashUSD = Object.entries(cashBalances).reduce((sum, [code, value]) => sum + toUSD(value, code, fxRates), 0);
    totalValueUSD += cashUSD;
    if (cashUSD > 0) categoryMap.Cash = cashUSD;

    const itemsWithRebalance = items.map(item => {
      const actualPercent = totalValueUSD > 0 ? (item.totalValue / (totalValueUSD * rate)) * 100 : 0;
      const targetPct = Number(item.targetPercent || 0);
      const targetValueUSD = totalValueUSD * (targetPct / 100);
      const diffUSD = (item.totalValue / rate) - targetValueUSD;
      const actionShares = item.currentPriceUSD > 0 ? Math.abs(diffUSD) / item.currentPriceUSD : 0;

      let action = 'HOLD';
      if (actualPercent > targetPct + 0.5) action = 'SELL';
      else if (actualPercent < targetPct - 0.5) action = 'BUY';

      return {
        ...item,
        actualPercent,
        targetPercent: targetPct,
        rebalanceAction: action,
        rebalanceDiffValue: Math.abs(diffUSD) * rate,
        rebalanceShares: Number(actionShares.toFixed(2))
      };
    });

    const totalGainUSD = holdingsValueUSD - totalCostUSD;
    const totalGainPercent = totalCostUSD > 0 ? (totalGainUSD / totalCostUSD) * 100 : 0;

    const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
      name: cat,
      value: categoryMap[cat] * rate,
      percent: totalValueUSD > 0 ? (categoryMap[cat] / totalValueUSD) * 100 : 0
    }));

    return {
      items: itemsWithRebalance,
      cashBalances, cashValue: cashUSD * rate, holdingsValue: holdingsValueUSD * rate,
      cashAllocation: totalValueUSD > 0 ? (cashUSD / totalValueUSD) * 100 : 0,
      totalValue: totalValueUSD * rate,
      totalCost: totalCostUSD * rate,
      totalGainLoss: totalGainUSD * rate,
      totalGainLossPercent: totalGainPercent,
      realizedGainLoss: getRealizedGains(transactions, holdings, historicalFx) * rate,
      annualDividend: annualDividendUSD * rate,
      dividendsReceived: transactions
        .filter(transaction => transaction.type === 'DIVIDEND')
        .reduce((total, transaction) => {
          const holding = holdings.find(h => h.id === transaction.holdingId);
          const hCurrency = transaction.currency || holding?.currency || detectSymbolCurrency(transaction.symbol || holding?.symbol);
          return total + Number(transaction.total || 0) / (transaction.fxRate || historicalFx[transaction.date]?.rates?.[hCurrency] || fallbackRates[hCurrency]);
        }, 0) * rate,
      portfolioYield: totalValueUSD > 0 ? (annualDividendUSD / totalValueUSD) * 100 : 0,
      totalTargetPercent,
      categoryBreakdown
    };
  }, [holdings, rate, transactions, fxRates, historicalFx]);

  const netContributionsUSD = externalContributions(transactions, holdings, historicalFx);
  const performance = useMemo(() => performanceHistory(snapshots, transactions, holdings, historicalFx), [snapshots, transactions, holdings, historicalFx]);

  const currentSnapshotTracked = snapshots.some(s => s.date === today() && Number.isFinite(s.netContributionsUSD));

  useEffect(() => {
    if (mode === 'pending') return;
    const date = today();
    const valueUSD = portfolioSummary.totalValue / rate;
    setSnapshots(previous => {
      const existing = previous.find(snapshot => snapshot.date === date);
      if (existing?.valueUSD === valueUSD && existing?.netContributionsUSD === netContributionsUSD) return previous;
      const observation = {
        ...existing, date, valueUSD, netContributionsUSD,
        startingValueUSD: existing?.startingValueUSD ?? valueUSD,
        startingTransactionIds: existing?.startingTransactionIds ?? transactions.map(t => t.id),
        startingContributionsUSD: existing?.startingContributionsUSD ?? netContributionsUSD
      };
      return [...previous.filter(snapshot => snapshot.date !== date), observation].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, [mode, portfolioSummary.totalValue, rate, netContributionsUSD, currentSnapshotTracked, transactions]);

  const resetPerformance = () => setSnapshots(previous => previous.map(({ date, valueUSD }) => ({ date, valueUSD })));
  const stashDeleted = (label, deleted) => {
    setTrash(previous => [{ id: 'deleted-' + crypto.randomUUID(), label, holdings: [], transactions: [], watchlist: [], ...deleted }, ...previous].slice(0, 20));
    setUiMessage(label + ' moved to Recently deleted. You can undo below.');
  };

  const restoreDeleted = id => {
    const entry = trash.find(item => item.id === id);
    if (!entry) return;
    try {
      const restored = mergeDeleted({ holdings: allHoldings, transactions: allTransactions, watchlist: watchlistData }, entry);
      const error = validateBackup({ ...restored, snapshots });
      if (error) throw new Error(error);
      setPortfolioData({ holdings: rebuildHoldings(restored.holdings, restored.transactions), transactions: restored.transactions });
      setWatchlist(restored.watchlist);
      if (entry.snapshots) setSnapshots(previous => [...new Map([...entry.snapshots, ...previous].map(s => [s.date, { date: s.date, valueUSD: s.valueUSD }])).values()]);
      else if (entry.holdings.length || entry.transactions.length) resetPerformance();
      setTrash(previous => previous.filter(item => item.id !== id));
      setUiMessage('Restored ' + entry.label.toLowerCase() + '.');
    } catch (error) { setUiMessage('Could not undo: ' + error.message); }
  };
  const clearRecentlyDeleted = () => {
    setTrash([]);
    setUiMessage('Recently deleted was cleared.');
  };

  const startPortfolio = nextMode => {
    setMode(nextMode);
    setAccounts([DEFAULT_ACCOUNT]);
    setSelectedAccountId(DEFAULT_ACCOUNT.id);
    setPortfolioData(nextMode === 'demo' ? { holdings: assignDefaultAccount(INITIAL_HOLDINGS), transactions: assignDefaultAccount(INITIAL_TRANSACTIONS) } : { holdings: [], transactions: [] });
    setWatchlist(nextMode === 'demo' ? assignDefaultAccount(INITIAL_WATCHLIST) : []);
    setSnapshots([]);
    setTrash([]);
    setUiMessage('');
  };

  const addHolding = (newHolding) => {
    const sym = newHolding.symbol.toUpperCase();
    const shares = Number(newHolding.shares);
    const hasCurrentPrice = newHolding.currentPrice !== '' && newHolding.currentPrice !== undefined;
    const hasAvgCost = newHolding.avgCost !== '' && newHolding.avgCost !== undefined;
    const currentPrice = hasCurrentPrice ? Number(newHolding.currentPrice) : hasAvgCost ? Number(newHolding.avgCost) : 0;
    const avgCost = hasAvgCost ? Number(newHolding.avgCost) : currentPrice;
    const dividendYield = Number(newHolding.dividendYield || 0);
    const targetPercent = Number(newHolding.targetPercent || 0);
    if (!sym || !Number.isFinite(shares) || shares <= 0 ||
      (hasAvgCost && (!Number.isFinite(avgCost) || avgCost <= 0)) ||
      (hasCurrentPrice && (!Number.isFinite(currentPrice) || currentPrice <= 0)) ||
      !Number.isFinite(dividendYield) || dividendYield < 0 || dividendYield > 100 ||
      !Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setUiMessage('Enter a valid ticker and positive shares. Prices are optional and can be filled from live market data.');
      return;
    }

    const itemCurrency = newHolding.currency || detectSymbolCurrency(sym);
    const item = {
      id: 'h-' + crypto.randomUUID(),
      accountId: newHolding.accountId || activeAccountId,
      symbol: sym,
      name: newHolding.name || sym + ' Corp',
      shares,
      avgCost,
      currentPrice,
      category: newHolding.category || 'Tech',
      assetType: newHolding.assetType || inferSymbolMetadata(sym).assetType,
      exchange: newHolding.exchange || inferSymbolMetadata(sym).exchange,
      dividendYield,
      targetPercent,
      notes: newHolding.notes || '',
      currency: itemCurrency,
      buyDate: newHolding.buyDate || today(),
      priceSource: 'manual', priceUpdatedAt: new Date().toISOString()
    };

    const tx = avgCost > 0 ? {
      id: 'tx-' + crypto.randomUUID(),
      accountId: item.accountId,
      holdingId: item.id,
      date: item.buyDate,
      type: 'BUY',
      symbol: sym,
      shares,
      price: avgCost,
      currency: itemCurrency,
      total: shares * avgCost, cashImpact: false, openingValue: shares * currentPrice
    } : null;
    if (item.buyDate < today()) resetPerformance();
    setPortfolioData(previous => {
      const nextTransactions = tx ? [tx, ...previous.transactions] : previous.transactions;
      return {
        transactions: nextTransactions,
        holdings: rebuildHoldings([...previous.holdings, item], nextTransactions)
      };
    });
  };

  const updateHoldingPrice = (id, newCurrentPrice) => {
    if (!Number.isFinite(Number(newCurrentPrice)) || Number(newCurrentPrice) <= 0) {
      setUiMessage('Current price must be greater than zero.');
      return;
    }
    setPortfolioData(prev => ({
      ...prev,
      holdings: prev.holdings.map(h => h.id === id ? { ...h, currentPrice: Number(newCurrentPrice), priceSource: 'manual', priceUpdatedAt: new Date().toISOString(), priceRefreshFailed: false } : h)
    }));
  };

  const updateHoldingNotes = (id, notes) => {
    setPortfolioData(prev => ({
      ...prev,
      holdings: prev.holdings.map(h => h.id === id ? { ...h, notes } : h)
    }));
  };

  const updateHolding = (id, changes) => {
    const shares = Number(changes.shares);
    const hasAvgCost = changes.avgCost !== '' && changes.avgCost !== undefined && changes.avgCost !== null && Number(changes.avgCost) > 0;
    const hasInvalidAvgCost = changes.avgCost !== '' && changes.avgCost !== undefined && changes.avgCost !== null && (!Number.isFinite(Number(changes.avgCost)) || Number(changes.avgCost) < 0);
    const hasCurrentPrice = changes.currentPrice !== '' && changes.currentPrice !== undefined && changes.currentPrice !== null;
    const avgCost = hasAvgCost ? Number(changes.avgCost) : null;
    const currentPrice = hasCurrentPrice ? Number(changes.currentPrice) : null;
    const dividendYield = Number(changes.dividendYield || 0);
    const targetPercent = Number(changes.targetPercent || 0);
    if (!String(changes.symbol || '').trim() || !Number.isFinite(shares) || shares <= 0 ||
      hasInvalidAvgCost ||
      (hasCurrentPrice && (!Number.isFinite(currentPrice) || currentPrice <= 0)) ||
      !Number.isFinite(dividendYield) || dividendYield < 0 || dividendYield > 100 ||
      !Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setUiMessage('Enter a ticker, positive shares, and valid nonnegative prices.');
      return false;
    }
    setPortfolioData(previous => ({
      ...previous,
      holdings: previous.holdings.map(holding => holding.id === id ? {
        ...holding,
        ...changes,
        symbol: String(changes.symbol).trim().toUpperCase(),
        shares,
        avgCost: hasAvgCost ? avgCost : holding.avgCost,
        currentPrice: hasCurrentPrice ? currentPrice : holding.currentPrice,
        dividendYield,
        targetPercent,
        currency: changes.currency || holding.currency,
        priceSource: currentPrice > 0 ? 'manual' : holding.priceSource,
        priceUpdatedAt: currentPrice > 0 ? new Date().toISOString() : holding.priceUpdatedAt
      } : holding)
    }));
    return true;
  };

  const updateHoldingTarget = (id, targetPercent) => {
    if (!Number.isFinite(Number(targetPercent)) || Number(targetPercent) < 0 || Number(targetPercent) > 100) {
      setUiMessage('Target allocation must be between 0 and 100%.');
      return;
    }
    setPortfolioData(prev => ({
      ...prev,
      holdings: prev.holdings.map(h => h.id === id ? { ...h, targetPercent: Number(targetPercent) } : h)
    }));
  };

  const removeHolding = id => {
    const remainingHoldings = allHoldings.filter(h => h.id !== id);
    const remainingTransactions = allTransactions.filter(t => t.holdingId !== id);
    const error = validateLedger(holdings.filter(h => h.id !== id), transactions.filter(t => t.holdingId !== id));
    if (error) { setUiMessage(error); return; }
    stashDeleted('Holding and its transactions', { holdings: allHoldings.filter(h => h.id === id), transactions: allTransactions.filter(t => t.holdingId === id) });
    setPortfolioData({ holdings: remainingHoldings, transactions: remainingTransactions });
    resetPerformance();
  };

  const saveTransaction = (transaction, onError = setUiMessage) => {
    const normalizedType = String(transaction.type || '').trim().toUpperCase();
    const normalizedDate = normalizeTransactionDate(transaction.date);
    const normalizedCurrency = String(transaction.currency || '').trim().toUpperCase();
    const holding = allHoldings.find(item => item.id === transaction.holdingId);
    const isCash = CASH_TYPES.includes(normalizedType);
    const updated = {
      ...transaction, id: transaction.id || 'tx-' + crypto.randomUUID(), accountId: transaction.accountId || holding?.accountId || activeAccountId,
      type: normalizedType,
      date: normalizedDate,
      holdingId: isCash ? undefined : transaction.holdingId,
      symbol: isCash ? normalizedCurrency : holding?.symbol,
      currency: isCash ? normalizedCurrency : holding?.currency || detectSymbolCurrency(holding?.symbol),
      fee: ['BUY', 'SELL'].includes(normalizedType) ? Number(transaction.fee || 0) : 0,
      total: ['DIVIDEND', ...CASH_TYPES].includes(normalizedType) ? Number(transaction.total) : normalizedType === 'SPLIT' ? 0 : Number(transaction.shares) * Number(transaction.price)
    };
    const normalizedExisting = allTransactions.map(item => ({
      ...item,
      type: String(item.type || '').trim().toUpperCase(),
      date: normalizeTransactionDate(item.date),
      currency: String(item.currency || (item.holdingId ? allHoldings.find(holdingItem => holdingItem.id === item.holdingId)?.currency : 'USD') || 'USD').trim().toUpperCase()
    }));
    const nextTransactions = transaction.id ? normalizedExisting.map(item => item.id === transaction.id ? updated : item) : [updated, ...normalizedExisting];
    const error = validateLedger(allHoldings.filter(item => accountIdFor(item) === updated.accountId), nextTransactions.filter(item => accountIdFor(item) === updated.accountId));
    if (error) { onError(error); return false; }
    if (transaction.id || transaction.date < today()) resetPerformance();
    setPortfolioData({ transactions: nextTransactions, holdings: rebuildHoldings(allHoldings, nextTransactions) });
    return true;
  };

  const deleteTransaction = (id) => {
    const nextTransactions = allTransactions.filter(transaction => transaction.id !== id);
    const error = validateLedger(holdings, transactions.filter(transaction => transaction.id !== id));
    if (error) { setUiMessage(error); return; }
    stashDeleted('Transaction', { transactions: allTransactions.filter(t => t.id === id) });
    resetPerformance();
    setPortfolioData({ transactions: nextTransactions, holdings: rebuildHoldings(allHoldings, nextTransactions) });
  };

  const deleteAllData = () => {
    stashDeleted('Cleared portfolio', { holdings: allHoldings, transactions: allTransactions, watchlist: watchlistData, snapshots });
    setStorageBlocked(false);
    setPortfolioData({ holdings: [], transactions: [] });
    setAccounts([DEFAULT_ACCOUNT]);
    setSelectedAccountId(DEFAULT_ACCOUNT.id);
    setWatchlist([]);
    setSnapshots([]);
    setCurrency('CAD');
    setAccent('indigo');
  };

  // Watchlist actions
  const addWatchlistItem = (item) => {
    const currentPrice = item.currentPrice === '' || item.currentPrice === undefined ? 0 : Number(item.currentPrice);
    const hasTargetBuyPrice = item.targetBuyPrice !== '' && item.targetBuyPrice !== undefined && item.targetBuyPrice !== null;
    const targetBuyPrice = hasTargetBuyPrice ? Number(item.targetBuyPrice) : 0;
    if (!item.symbol?.trim() || !Number.isFinite(currentPrice) || currentPrice < 0 ||
      (hasTargetBuyPrice && (!Number.isFinite(targetBuyPrice) || targetBuyPrice <= 0))) {
      setUiMessage('Enter a ticker. Current and target prices are optional.');
      return;
    }
    const sym = item.symbol.toUpperCase();
    const itemCurrency = item.currency || detectSymbolCurrency(sym);
    const newItem = {
      id: 'w-' + crypto.randomUUID(),
      symbol: sym,
      name: item.name || sym + ' Corp',
      currentPrice,
      priceSource: 'manual', priceUpdatedAt: new Date().toISOString(),
      targetBuyPrice,
      category: item.category || 'Tech',
      notes: item.notes || '',
      currency: itemCurrency
    };
    setWatchlist(prev => [...prev, { ...newItem, accountId: activeAccountId }]);
  };

  const updateWatchlistPrice = (id, currentPrice) => {
    if (!Number.isFinite(Number(currentPrice)) || Number(currentPrice) <= 0) {
      setUiMessage('Current price must be greater than zero.');
      return;
    }
    setWatchlist(prev => prev.map(w => w.id === id ? { ...w, currentPrice: Number(currentPrice), priceSource: 'manual', priceUpdatedAt: new Date().toISOString(), priceRefreshFailed: false } : w));
  };

  const removeWatchlistItem = (id) => {
    stashDeleted('Watchlist item', { watchlist: watchlistData.filter(w => w.id === id) });
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  const backupPayload = useMemo(() => ({ schemaVersion: 4, mode, fxData, historicalFx, accounts, selectedAccountId, holdings: allHoldings, watchlist: watchlistData, transactions: allTransactions, snapshots, currency, theme, accent, exportedAt: new Date().toISOString() }), [mode, fxData, historicalFx, accounts, selectedAccountId, allHoldings, watchlistData, allTransactions, snapshots, currency, theme, accent]);
  const exportJSON = () => {
    const payload = backupPayload;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pro_portfolio_backup_${fileDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = (scope = 'selected') => {
    const headers = ['Holdings List', 'Symbol', 'Name', 'Sector', 'Currency', 'Shares', 'Avg Cost (Native Currency)', 'Current Price (Native Currency)', 'Target %', 'Dividend Yield %', `Annual Dividend (${currency})`, `Total Value (${currency})`, `Gain/Loss (${currency})`, 'Gain/Loss (%)', 'Notes'];
    const selectedAccount = accounts.find(account => account.id === selectedAccountId);
    const exportAccounts = scope === 'all' || selectedAccountId === COMBINED_ACCOUNT_ID ? accounts : [selectedAccount];
    const rows = [];
    exportAccounts.forEach(account => {
      if (!account) return;
      const accountHoldings = allHoldings.filter(item => accountIdFor(item) === account.id);
      const accountTransactions = allTransactions.filter(item => accountIdFor(item) === account.id);
      const items = scope === 'selected' && selectedAccountId !== COMBINED_ACCOUNT_ID ? portfolioSummary.items : rebuildHoldings(accountHoldings, accountTransactions, historicalFx).map(item => {
        const holdingCurrency = item.currency || detectSymbolCurrency(item.symbol);
        const currentPriceUSD = toUSD(Number(item.currentPrice ?? item.avgCost ?? 0), holdingCurrency, fxRates);
        const avgCostUSD = toUSD(Number(item.avgCost || 0), holdingCurrency, fxRates);
        const valueUSD = Number(item.shares || 0) * currentPriceUSD;
        const costUSD = Number(item.costBasisUSD || 0);
        const gainUSD = valueUSD - costUSD;
          const nativeAvgCost = Number(item.avgCost || 0);
          const nativeCurrentPrice = Number(item.currentPrice ?? item.avgCost ?? 0);
          const nativeShares = Number(item.shares || 0);
          const nativeCost = nativeShares * nativeAvgCost;
          const nativeGainLoss = nativeShares * (nativeCurrentPrice - nativeAvgCost);
          return { ...item, currency: holdingCurrency, nativeAvgCost, nativeCurrentPrice, avgCost: avgCostUSD * rate, currentPrice: currentPriceUSD * rate, annualDividend: valueUSD * Number(item.dividendYield || 0) / 100 * rate, totalValue: valueUSD * rate, gainLoss: gainUSD * rate, nativeGainLoss, gainLossPercent: nativeCost > 0 ? nativeGainLoss / nativeCost * 100 : 0 };
      });
      items.forEach(item => rows.push([
        `"${(account.name || '').replace(/"/g, '""')}"`, item.symbol, `"${item.name || ''}"`, item.category, item.currency || detectSymbolCurrency(item.symbol), item.shares,
          Number(item.nativeAvgCost ?? item.avgCost ?? 0).toFixed(2), Number(item.nativeCurrentPrice ?? item.currentPrice ?? 0).toFixed(2), Number(item.targetPercent || 0) + '%', Number(item.dividendYield || 0).toFixed(2) + '%', Number(item.annualDividend || 0).toFixed(2), Number(item.totalValue || 0).toFixed(2), Number(item.nativeGainLoss ?? item.gainLoss ?? 0).toFixed(2), Number(item.gainLossPercent || 0).toFixed(2) + '%', `"${(item.notes || '').replace(/"/g, '""')}"`
      ]));
      Object.entries(calculateCash(accountTransactions, accountHoldings)).filter(([, amount]) => Math.abs(amount) > 1e-8).forEach(([code, amount]) => {
        const displayAmount = toUSD(amount, code, fxRates) * rate;
        rows.push([`"${(account.name || '').replace(/"/g, '""')}"`, `${code} CASH`, `"${code} Cash"`, 'Cash', code, 1, displayAmount.toFixed(2), displayAmount.toFixed(2), '0%', '0.00%', '0.00', displayAmount.toFixed(2), '0.00', '0.00%', '"Cash balance"']);
      });
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    const suffix = scope === 'all' || selectedAccountId === COMBINED_ACCOUNT_ID ? 'all_lists' : (selectedAccount?.name || 'holdings_list').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    a.download = `pro_portfolio_holdings_${suffix}_${fileDate()}.csv`;
    a.click();
  };
  const exportAllCSV = () => exportCSV('all');

  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const data = {
          ...parsed,
          holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
          snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : []
        };
        const error = validateBackup(data);
        if (error) throw new Error(error);
        setPendingImport(data);
      } catch (err) {
        setUiMessage('Could not import backup: ' + err.message);
      }
      event.target.value = '';
    };
    reader.onerror = () => { setUiMessage('Could not read the backup file.'); event.target.value = ''; };
    reader.readAsText(file);
  };

  const importCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parsePortfolioCsv(e.target.result, activeAccountId);
        const accountHoldings = allHoldings.filter(item => accountIdFor(item) === activeAccountId);
        const accountTransactions = allTransactions.filter(item => accountIdFor(item) === activeAccountId);
        const duplicates = parsed.kind === 'holdings'
          ? parsed.rows.filter(row => accountHoldings.some(item => item.symbol.toUpperCase() === row.symbol.toUpperCase())).length
          : parsed.rows.filter(row => accountTransactions.some(item => item.date === row.date && item.type === row.type && item.symbol?.toUpperCase() === row.symbol?.toUpperCase() && Number(item.shares || 0) === Number(row.shares || 0) && Number(item.price || 0) === Number(row.price || 0))).length;
        setPendingCsvImport({ ...parsed, duplicates, accountId: activeAccountId, fileName: file.name });
        return;
      } catch (error) { setUiMessage(`Could not import CSV: ${error.message}`); }
      event.target.value = '';
    };
    reader.onerror = () => { setUiMessage('Could not read the CSV file.'); event.target.value = ''; };
    reader.readAsText(file);
  };

  const confirmCsvImport = () => {
    if (!pendingCsvImport) return;
    if (pendingCsvImport.kind === 'transactions') {
      const accountId = pendingCsvImport.accountId;
      const accountHoldings = allHoldings.filter(item => accountIdFor(item) === accountId);
      const importedSymbols = new Map(accountHoldings.map(item => [item.symbol.toUpperCase(), item]));
      const newHoldings = [];
      const transactions = pendingCsvImport.rows.map(row => {
        let holding = importedSymbols.get(row.symbol.toUpperCase());
        if (!holding && row.type === 'BUY') {
          holding = { id: 'h-' + crypto.randomUUID(), accountId, symbol: row.symbol.toUpperCase(), name: row.symbol.toUpperCase(), shares: 0, avgCost: row.price, currentPrice: row.price, category: 'Other', dividendYield: 0, targetPercent: 0, notes: '', currency: detectSymbolCurrency(row.symbol), buyDate: row.date, priceSource: 'manual', priceUpdatedAt: new Date().toISOString() };
          importedSymbols.set(holding.symbol, holding);
          newHoldings.push(holding);
        }
        return { ...row, id: 'tx-' + crypto.randomUUID(), holdingId: holding?.id, currency: holding?.currency || 'USD', symbol: holding?.symbol || row.symbol.toUpperCase() };
      }).filter(row => ['DEPOSIT', 'WITHDRAW'].includes(row.type) || row.holdingId);
      const nextTransactions = [...transactions, ...allTransactions];
      const nextHoldings = [...newHoldings, ...allHoldings];
      const error = validateLedger(nextHoldings.filter(item => accountIdFor(item) === accountId), nextTransactions.filter(item => accountIdFor(item) === accountId));
      if (error) { setUiMessage(`Could not import transactions: ${error}`); return; }
      setPortfolioData({ holdings: rebuildHoldings(nextHoldings, nextTransactions), transactions: nextTransactions });
      setUiMessage(`Imported ${transactions.length} transaction${transactions.length === 1 ? '' : 's'} from ${pendingCsvImport.broker}.`);
      setPendingCsvImport(null);
      return;
    }
    const listNames = [...new Set(pendingCsvImport.rows.map(item => item.accountName).filter(Boolean))];
    const includesMain = listNames.some(name => name.toLowerCase() === DEFAULT_ACCOUNT.name.toLowerCase());
    if (listNames.length && !includesMain) {
      setAccounts(previous => previous.filter(account => account.id !== DEFAULT_ACCOUNT.id));
      setPortfolioData(previous => ({
        holdings: previous.holdings.filter(item => accountIdFor(item) !== DEFAULT_ACCOUNT.id),
        transactions: previous.transactions.filter(item => accountIdFor(item) !== DEFAULT_ACCOUNT.id)
      }));
      setWatchlist(previous => previous.filter(item => accountIdFor(item) !== DEFAULT_ACCOUNT.id));
    }
    const existingByName = new Map(accounts.map(account => [account.name.toLowerCase(), account]));
    const importedAccounts = listNames.map(name => existingByName.get(name.toLowerCase()) || { id: 'account-' + crypto.randomUUID(), name, type: '', currency });
    if (listNames.length && !includesMain && importedAccounts[0]) setSelectedAccountId(importedAccounts[0].id);
    if (importedAccounts.some(account => !existingByName.has(account.name.toLowerCase()))) setAccounts(previous => [...previous, ...importedAccounts.filter(account => !previous.some(existing => existing.id === account.id))]);
    const importedHoldings = pendingCsvImport.rows.map(item => {
      const account = item.accountName
        ? (existingByName.get(item.accountName.toLowerCase()) || importedAccounts.find(candidate => candidate.name.toLowerCase() === item.accountName.toLowerCase()))
        : null;
      const avgCost = Number(item.avgCost || 0);
      const currentPrice = Number(item.currentPrice || 0);
      return {
        ...item,
        id: 'h-' + crypto.randomUUID(),
        accountId: account?.id || pendingCsvImport.accountId,
        symbol: String(item.symbol || '').trim().toUpperCase(),
        shares: Number(item.shares || 0),
        avgCost,
        currentPrice,
        currency: item.currency || detectSymbolCurrency(item.symbol),
        buyDate: item.buyDate || today(),
        priceSource: 'manual',
        priceUpdatedAt: new Date().toISOString()
      };
    });
    const importedTransactions = importedHoldings.filter(item => item.avgCost > 0).map(item => ({
      id: 'tx-' + crypto.randomUUID(),
      accountId: item.accountId,
      holdingId: item.id,
      date: item.buyDate,
      type: 'BUY',
      symbol: item.symbol,
      shares: item.shares,
      price: item.avgCost,
      currency: item.currency,
      total: item.shares * item.avgCost,
      cashImpact: false,
      openingValue: item.shares * item.currentPrice
    }));
    setPortfolioData(previous => {
      const nextTransactions = [...importedTransactions, ...previous.transactions];
      return {
        transactions: nextTransactions,
        holdings: rebuildHoldings([...previous.holdings, ...importedHoldings], nextTransactions)
      };
    });
    setUiMessage(`Imported ${pendingCsvImport.rows.length} holding${pendingCsvImport.rows.length === 1 ? '' : 's'} from ${pendingCsvImport.broker}.`);
    setPendingCsvImport(null);
  };

  const cancelCsvImport = () => setPendingCsvImport(null);

  const confirmImport = () => {
    if (!pendingImport) return;
    const importedAccounts = normalizeAccounts(pendingImport.accounts);
    const importedTransactions = assignDefaultAccount(pendingImport.transactions, importedAccounts[0].id);
    const importedHoldings = assignDefaultAccount(pendingImport.holdings, importedAccounts[0].id);
    const cashHoldingPattern = /^(USD|CAD|EUR|GBP|JPY)\s+CASH$/i;
    const cashHoldings = importedHoldings.filter(item => cashHoldingPattern.test(String(item.symbol || '').trim()) || (String(item.category || '').toLowerCase() === 'cash' && /^[A-Z]{3}$/.test(String(item.currency || '').toUpperCase())));
    const regularHoldings = importedHoldings.filter(item => !cashHoldings.includes(item));
    const cashDeposits = cashHoldings.map(item => {
      const currencyCode = String(item.currency || String(item.symbol || '').split(/\s+/)[0] || 'USD').toUpperCase();
      const amount = Number(item.shares || 1) * Number(item.avgCost || item.currentPrice || 0);
      const date = item.buyDate || today();
      const alreadyRecorded = importedTransactions.some(transaction => transaction.type === 'DEPOSIT' && transaction.currency === currencyCode && transaction.date === date && Math.abs(Number(transaction.total || 0) - amount) < 1e-8);
      return alreadyRecorded || !Number.isFinite(amount) || amount <= 0 ? null : {
        id: 'tx-' + crypto.randomUUID(),
        accountId: item.accountId,
        type: 'DEPOSIT',
        date,
        currency: currencyCode,
        symbol: currencyCode,
        total: amount,
        cashImpact: true
      };
    }).filter(Boolean);
    const normalizedTransactions = [...cashDeposits, ...importedTransactions];
    setAccounts(importedAccounts);
    setSelectedAccountId(pendingImport.selectedAccountId || importedAccounts[0].id);
    setPortfolioData({ holdings: rebuildHoldings(regularHoldings, normalizedTransactions), transactions: normalizedTransactions });
    setWatchlist(assignDefaultAccount(pendingImport.watchlist, importedAccounts[0].id));
    setSnapshots(pendingImport.snapshots);
    if (pendingImport.currency) setCurrency(pendingImport.currency);
    if (pendingImport.theme) setTheme(pendingImport.theme);
    if (Object.hasOwn(ACCENT_THEMES, pendingImport.accent)) setAccent(pendingImport.accent);
    if (validRates(pendingImport.fxData)) setFxData(pendingImport.fxData);
    setHistoricalFx(pendingImport.historicalFx && Object.values(pendingImport.historicalFx).every(validRates) ? pendingImport.historicalFx : {});
    setMode(pendingImport.mode === 'demo' ? 'demo' : 'personal');
    setTrash([]);
    setStorageBlocked(false);
    setPendingImport(null);
  };

  const addAccount = (name, type = '', accountCurrency = currency) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) { setUiMessage('Enter an account name.'); return; }
    const account = { id: 'account-' + crypto.randomUUID(), name: cleanName, type, currency: accountCurrency };
    setAccounts(previous => [...previous, account]);
    setSelectedAccountId(account.id);
  };
  const deleteAccount = id => {
    if (accounts.length <= 1) { setUiMessage('Keep at least one holdings list.'); return; }
    const account = accounts.find(item => item.id === id);
    if (!account) return;
    const replacement = accounts.find(item => item.id !== id);
    stashDeleted(`Deleted list ${account.name}`, {
      holdings: allHoldings.filter(item => accountIdFor(item) === id),
      transactions: allTransactions.filter(item => accountIdFor(item) === id),
      watchlist: watchlistData.filter(item => accountIdFor(item) === id)
    });
    setAccounts(previous => previous.filter(item => item.id !== id));
    setPortfolioData(previous => ({
      holdings: previous.holdings.filter(item => accountIdFor(item) !== id),
      transactions: previous.transactions.filter(item => accountIdFor(item) !== id)
    }));
    setWatchlist(previous => previous.filter(item => accountIdFor(item) !== id));
    if (selectedAccountId === id) setSelectedAccountId(replacement.id);
  };

  const renameAccount = (id, name) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) { setUiMessage('Account name cannot be empty.'); return; }
    setAccounts(previous => previous.map(account => account.id === id ? { ...account, name: cleanName } : account));
  };

  return {
    mode, startPortfolio, trash, restoreDeleted, clearRecentlyDeleted, performance,
    holdings,
    watchlist,
    transactions,
    snapshots,
    backtestHistory,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    accent,
    setAccent,
    symbol,
    rate,
    portfolioSummary,
    addHolding,
    updateHoldingPrice,
    updateHolding,
    updateHoldingNotes,
    updateHoldingTarget,
    removeHolding,
    saveTransaction,
    deleteTransaction,
    deleteAllData,
    addWatchlistItem,
    updateWatchlistPrice,
    removeWatchlistItem,
    exportJSON,
    exportCSV,
    exportAllCSV,
    importJSON,
    importCSV,
    pendingCsvImport, confirmCsvImport, cancelCsvImport,
    accounts, selectedAccountId, setSelectedAccountId, addAccount, renameAccount, deleteAccount, customCategories,
    refreshMarketData,
    marketStatus, uiMessage, dismissMessage, storageError, storageBlocked, resumeSaving: () => { if (window.confirm('Replace unreadable browser data with the recovered portfolio shown here? Export a backup first.')) setStorageBlocked(false); },
    pendingImport, confirmImport, cancelImport: () => setPendingImport(null), fxRates, fxData, fxError, historicalFx,
    historicalEstimated: transactions.some(t => !t.fxRate && (t.currency || holdings.find(h => h.id === t.holdingId)?.currency || detectSymbolCurrency(t.symbol)) !== 'USD' && !historicalFx[t.date])
  };
}
