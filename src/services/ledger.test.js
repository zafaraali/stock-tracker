import { describe, expect, it } from 'vitest';
import { calculateCash, externalContributions, mergeDeleted, performanceHistory, positionLedger } from './ledger';
import { validateBackup, validateLedger } from './portfolioValidation';
import { loadSavedPortfolio } from '../hooks/usePortfolio';

const holdings = [{ id: 'h', symbol: 'TEST', currency: 'USD', currentPrice: 50, shares: 0, avgCost: 0 }];
const deposit = { id: 'd', type: 'DEPOSIT', currency: 'USD', date: '2026-01-01', total: 1000 };
const buy = { id: 'b', holdingId: 'h', type: 'BUY', date: '2026-01-02', shares: 2, price: 100, fee: 5, cashImpact: true };
const split = { id: 's', holdingId: 'h', type: 'SPLIT', date: '2026-01-03', ratio: 2, total: 0 };
const sale = { id: 'x', holdingId: 'h', type: 'SELL', date: '2026-01-04', shares: 1, price: 60, fee: 1, cashImpact: true };
const trades = [deposit, buy, split, sale];

describe('cash, fees and corporate actions', () => {
  it('includes commissions in basis and deducts sell fees from realized gains', () => {
    const result = positionLedger(holdings, trades);
    expect(result.holdings[0].shares).toBe(3);
    expect(result.holdings[0].avgCost).toBeCloseTo(51.25);
    expect(result.holdings[0].costBasisUSD).toBeCloseTo(153.75);
    expect(result.realizedUSD).toBeCloseTo(7.75);
    expect(calculateCash(trades, holdings).USD).toBeCloseTo(854);
    expect(validateLedger(holdings, trades)).toBe('');
  });
  it('keeps legacy trades outside tracked cash', () => {
    expect(calculateCash([{ ...buy, cashImpact: undefined }], holdings).USD).toBe(0);
    expect(validateLedger(holdings, [{ ...buy, cashImpact: undefined }])).toBe('');
  });
  it('rejects withdrawing cash or buying shares without funding', () => {
    expect(validateLedger(holdings, [buy])).toContain('Insufficient');
    expect(validateLedger([], [deposit, { ...deposit, id: 'w', type: 'WITHDRAW', total: 1001 }])).toContain('Insufficient');
  });
  it('does not spend CAD deposits on USD trades', () => {
    expect(validateLedger(holdings, [{ ...deposit, currency: 'CAD' }, buy])).toContain('Insufficient USD');
  });
  it('validates cash after deleting or reducing a deposit', () => {
    expect(validateLedger(holdings, [buy, split, sale])).toContain('Insufficient');
    expect(validateLedger(holdings, [{ ...deposit, total: 200 }, buy])).toContain('Insufficient');
  });
  it('handles reverse splits without changing total basis', () => {
    const result = positionLedger(holdings, [deposit, buy, { ...split, ratio: 0.1 }]);
    expect(result.holdings[0].shares).toBeCloseTo(0.2);
    expect(result.holdings[0].avgCost).toBeCloseTo(1025);
    expect(result.holdings[0].costBasisUSD).toBeCloseTo(205);
  });
  it('rejects a split before a holding exists and invalid ratios', () => {
    expect(validateLedger(holdings, [split])).toContain('split');
    expect(validateLedger(holdings, [deposit, buy, { ...split, ratio: 0 }])).toContain('split');
  });
  it('prevents deleting a split that supports a later sale', () => {
    const largeSale = { ...sale, shares: 3 };
    expect(validateLedger(holdings, [deposit, buy, split, largeSale])).toBe('');
    expect(validateLedger(holdings, [deposit, buy, largeSale])).toContain('exceeding');
  });
  it('rejects negative fees and fees larger than sell proceeds', () => {
    expect(validateLedger(holdings, [deposit, { ...buy, fee: -1 }])).toContain('Fees');
    expect(validateLedger(holdings, [deposit, buy, split, { ...sale, fee: 100 }])).toContain('fee');
  });
  it('credits tracked dividends and deducts withdrawals', () => {
    const dividend = { id: 'div', holdingId: 'h', type: 'DIVIDEND', date: '2026-01-05', total: 10, cashImpact: true };
    expect(calculateCash([...trades, dividend, { ...deposit, id: 'w', type: 'WITHDRAW', date: '2026-01-06', total: 100 }], holdings).USD).toBeCloseTo(764);
  });
  it('accepts new transaction types in backups and rejects malformed movements', () => {
    const data = { holdings, transactions: trades, watchlist: [], snapshots: [] };
    expect(validateBackup(data)).toBe('');
    expect(validateBackup({ ...data, transactions: [{ ...deposit, holdingId: 'h' }] })).not.toBe('');
  });
});

describe('contribution-aware performance', () => {
  const baseline = { date: '2026-01-01', valueUSD: 0, netContributionsUSD: 0, startingValueUSD: 0, startingContributionsUSD: 0, startingTransactionIds: [] };
  it('does not count deposits as gains', () => {
    const result = performanceHistory([baseline, { date: '2026-01-02', valueUSD: 1000, netContributionsUSD: 1000 }], [deposit], [], {});
    expect(result.at(-1).capitalUSD).toBe(1000);
    expect(result.at(-1).gainUSD).toBe(0);
  });
  it('does not count withdrawals as losses', () => {
    const withdrawal = { ...deposit, id: 'w', type: 'WITHDRAW', total: 200, date: '2026-01-02' };
    const result = performanceHistory([baseline, { date: '2026-01-02', valueUSD: 800, netContributionsUSD: 800 }], [deposit, withdrawal], [], {});
    expect(result.at(-1).gainUSD).toBe(0);
  });
  it('counts fees as an investment cost and keeps dividends as investment income', () => {
    const dividend = { id: 'div', holdingId: 'h', type: 'DIVIDEND', date: '2026-01-03', total: 10, cashImpact: true };
    const result = performanceHistory([baseline, { date: '2026-01-03', valueUSD: 1005, netContributionsUSD: 1000 }], [deposit, buy, dividend], holdings, {});
    expect(result.at(-1).gainUSD).toBe(5);
  });
  it('treats imported positions as contributed assets, not gains', () => {
    expect(externalContributions([{ ...buy, cashImpact: false, openingValue: 250 }], holdings)).toBe(250);
  });

  it('preserves a manual position with no trade history', () => {
    const imported = [{ ...holdings[0], shares: 12, avgCost: 25 }];
    const result = positionLedger(imported, [deposit]);
    expect(result.holdings[0].shares).toBe(12);
    expect(result.holdings[0].avgCost).toBe(25);
  });
  it('excludes legacy value-only observations from measured performance', () => {
    expect(performanceHistory([{ date: '2020-01-01', valueUSD: 1000 }], [], [])).toEqual([]);
  });
});

describe('onboarding and undo', () => {
  it('starts without fabricated holdings on first run', () => {
    const result = loadSavedPortfolio({ getItem: () => null });
    expect(result.data.mode).toBe('pending');
    expect(result.data.holdings).toEqual([]);
    expect(result.data.transactions).toEqual([]);
  });
  it('restores deleted records without replacing newer entries', () => {
    const result = mergeDeleted({ holdings, transactions: [deposit], watchlist: [] }, { holdings: [], transactions: [buy], watchlist: [] });
    expect(result.transactions).toEqual([deposit, buy]);
  });
  it('blocks restore conflicts', () => {
    expect(() => mergeDeleted({ holdings, transactions: [buy], watchlist: [] }, { transactions: [buy] })).toThrow('same ID');
  });
});
