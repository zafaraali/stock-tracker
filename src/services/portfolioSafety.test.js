import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_HOLDINGS, INITIAL_TRANSACTIONS, INITIAL_WATCHLIST } from '../data/mockData';
import { validateBackup, validateLedger } from './portfolioValidation';
import { readJSON, writeJSON } from './storage';
import { fetchExchangeRates, fallbackRates } from './exchangeRates';
import { getRealizedGains, rebuildHoldings, loadSavedPortfolio, toUSD } from '../hooks/usePortfolio';
import { fetchMarketQuote } from './marketApi';

const backup = () => JSON.parse(JSON.stringify({ holdings: INITIAL_HOLDINGS, transactions: INITIAL_TRANSACTIONS, watchlist: INITIAL_WATCHLIST, snapshots: [] }));
const storage = values => ({ getItem: key => values[key] ?? null, setItem: vi.fn() });
afterEach(() => vi.unstubAllGlobals());

describe('ledger integrity', () => {
  const holdings = [{ id: 'h', symbol: 'AAPL', currency: 'USD' }];
  const buy = { id: 'b', holdingId: 'h', type: 'BUY', date: '2024-01-01', shares: 10, price: 100 };
  const sell = { id: 's', holdingId: 'h', type: 'SELL', date: '2024-02-01', shares: 8, price: 120 };
  it('rejects reducing a buy below a later sale', () => expect(validateLedger(holdings, [{ ...buy, shares: 5 }, sell])).toContain('exceeding'));
  it('rejects deleting the buy supporting a sale', () => expect(validateLedger(holdings, [sell])).toContain('exceeding'));
  it('rejects moving the buy after the sale', () => expect(validateLedger(holdings, [{ ...buy, date: '2024-03-01' }, sell])).toContain('exceeding'));
  it('permits valid partial sales', () => expect(validateLedger(holdings, [sell, buy])).toBe(''));
});

describe('backup validation', () => {
  it('accepts existing app backups', () => expect(validateBackup(backup())).toBe(''));
  it.each([
    data => { data.holdings[0].currentPrice = -1; },
    data => { data.holdings.push(data.holdings[0]); },
    data => { data.transactions[0].holdingId = 'missing'; },
    data => { data.transactions[0].date = '2024-02-30'; },
    data => { data.transactions[0].shares = null; },
    data => { data.transactions[0].total = 1; },
    data => { data.watchlist[0].targetBuyPrice = 'bad'; },
    data => { data.snapshots.push({ date: '2024-01-01', valueUSD: -1 }); }
  ])('rejects malformed financial data (%#)', mutate => {
    const data = backup(); mutate(data); expect(validateBackup(data)).not.toBe('');
  });

  it('accepts imported holdings with zero prices awaiting live data', () => {
    const data = backup();
    data.holdings[0].currentPrice = 0;
    data.holdings[0].avgCost = 0;
    data.transactions = [];
    expect(validateBackup(data)).toBe('');
  });
});

describe('storage recovery', () => {
  it('recovers from malformed JSON without writing over it', () => {
    const saved = storage({ st_pro_watchlist: '{bad' });
    const result = loadSavedPortfolio(saved);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data.watchlist)).toBe(true);
    expect(saved.setItem).not.toHaveBeenCalled();
  });
  it('rejects valid JSON with the wrong schema', () => {
    const error = vi.fn();
    expect(readJSON(storage({ key: '{}' }), 'key', [], Array.isArray, error)).toEqual([]);
    expect(error).toHaveBeenCalled();
  });
  it('reports storage access and quota failures', () => {
    const unavailable = { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } };
    expect(() => loadSavedPortfolio(unavailable)).not.toThrow();
    expect(writeJSON(unavailable, 'key', {})).toContain('Could not save');
  });
  it('prefers the atomic saved portfolio over stale legacy data', () => {
    const data = backup();
    const saved = storage({ st_pro_data_v2: JSON.stringify(data), st_pro_holdings: 'broken' });
    expect(loadSavedPortfolio(saved).errors).toEqual([]);
  });
});

describe('dated currency conversion', () => {
  const holdings = [{ id: 'h', symbol: 'RY.TO', currency: 'CAD' }];
  const trades = [
    { id: 'b', holdingId: 'h', type: 'BUY', date: '2024-01-01', shares: 10, price: 100, currency: 'CAD' },
    { id: 's', holdingId: 'h', type: 'SELL', date: '2024-02-01', shares: 5, price: 120, currency: 'CAD' }
  ];
  const historical = { '2024-01-01': { rates: { CAD: 1.25 } }, '2024-02-01': { rates: { CAD: 1.5 } } };
  it('uses buy-date cost and sell-date proceeds rather than current FX', () => {
    expect(getRealizedGains(trades, holdings, historical)).toBeCloseTo(0);
    expect(rebuildHoldings(holdings, trades, historical)[0].costBasisUSD).toBeCloseTo(400);
    expect(toUSD(150, 'CAD', { CAD: 1.5 })).toBe(100);
  });
  it('honors an explicitly recorded transaction exchange rate', () => {
    expect(getRealizedGains(trades.map(t => ({ ...t, fxRate: 1 })), holdings, historical)).toBeCloseTo(100);
  });
  it('uses the latest published historical rates within the preceding week', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => Object.entries(fallbackRates).filter(([code]) => code !== 'USD').flatMap(([quote, rate]) => [
      { date: '2024-01-05', quote, rate }, { date: '2024-01-04', quote, rate: rate * 2 }
    ]) }));
    const result = await fetchExchangeRates('2024-01-07');
    expect(result.date).toBe('2024-01-05');
    expect(result.rates.CAD).toBe(1.35);
    expect(fetch.mock.calls[0][0]).toContain('from=2023-12-31&to=2024-01-07');
  });
  it('rejects incomplete rates instead of silently mixing them with estimates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await expect(fetchExchangeRates()).rejects.toThrow();
  });
});

it('preserves the market timestamp instead of using request time', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 123, regularMarketTime: 1700000000, currency: 'USD' } }] } }) }));
  expect((await fetchMarketQuote('AAPL')).updatedAt).toBe(new Date(1700000000000).toISOString());
});
