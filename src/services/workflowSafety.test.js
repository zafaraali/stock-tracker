import { expect, it } from 'vitest';
import { parsePortfolioCsv } from './csvImport';
import { findImportDuplicates, compareCollection } from './importReview';
import { buildRebalancePreview } from './rebalancePreview';

it('maps unfamiliar CSV headings without changing the source', () => {
  const csv = 'AssetCode,Owned,BookPerUnit,Quote\nTEST,5,10,12';
  const result = parsePortfolioCsv(csv, 'main', { symbol: '0', shares: '1', avgcost: '2', currentprice: '3' });
  expect(result.rows[0]).toMatchObject({ symbol: 'TEST', shares: 5, avgCost: 10, currentPrice: 12 });
});
it('rejects using one CSV column for multiple meanings', () => {
  expect(() => parsePortfolioCsv('A,B\nTEST,5', 'main', { symbol: 0, shares: 1, avgcost: 1 })).toThrow('only one field');
});
it('reports original source lines and reasons including blank lines', () => {
  const result = parsePortfolioCsv('Symbol,Shares,AvgCost,CurrentPrice\r\nGOOD,2,10,12\r\n\r\nBAD,abc,10,12', 'main');
  expect(result.sourceLines).toEqual([2]);
  expect(result.rejectedRows).toEqual([{ sourceLine: 4, reasons: ['Shares must be a positive number'] }]);
});
it('counts quoted multiline records correctly and rejects malformed dates', () => {
  const result = parsePortfolioCsv('Type,Date,Symbol,Shares,Price,Name\nBUY,2026-01-01,GOOD,1,10,"Two\nlines"\nBUY,2026-02-30,BAD,1,10,Bad', 'main');
  expect(result.sourceLines).toEqual([2]);
  expect(result.rejectedRows[0]).toMatchObject({ sourceLine: 4, reasons: ['Date must be a valid YYYY-MM-DD date'] });
});
it('keeps all-rejected files reviewable without allowing a false successful import', () => {
  const result = parsePortfolioCsv('Symbol,Shares,AvgCost\nBAD,0,10', 'main');
  expect(result.rows).toEqual([]); expect(result.rejectedRows[0].sourceLine).toBe(2);
});
it('parses cash transactions without requiring a ticker column', () => {
  expect(parsePortfolioCsv('Type,Date,Amount,Currency\nDEPOSIT,2026-01-01,50,CAD', 'main').rows[0]).toMatchObject({ type: 'DEPOSIT', currency: 'CAD', total: 50 });
});
it('flags existing and within-file duplicates without dropping rows', () => {
  const row = { date: '2026-01-01', type: 'BUY', symbol: 'TEST', shares: 5, price: 10, currency: 'USD', fee: 0 };
  const input = [row, { ...row }, { ...row, fee: 1 }];
  expect(findImportDuplicates(input, [row], 'transactions')).toEqual([true, true, false]);
  expect(input).toHaveLength(3);
});
it('compares added, removed, and changed restore records', () => {
  const result = compareCollection([{ id: 'a', shares: 1 }, { id: 'b' }], [{ id: 'a', shares: 2 }, { id: 'c' }]);
  expect(result.added[0].id).toBe('c'); expect(result.removed[0].id).toBe('b');
  expect(result.changed[0].fields).toEqual(['shares']);
});
const summary = { totalValue: 100, cashBalances: { USD: 25 }, items: [{ id: 'a', symbol: 'TEST', shares: 3, currentPrice: 25, nativeCurrentPrice: 25, currency: 'USD', totalValue: 75, actualPercent: 75, targetPercent: 50 }] };
it('previews capped whole-share sales, rounding and fees without mutations', () => {
  const original = JSON.stringify(summary);
  const plan = buildRebalancePreview(summary, { fee: 1 });
  expect(plan.trades[0]).toMatchObject({ action: 'SELL', shares: 1, nativeValue: 25, roundingResidual: 0 });
  expect(plan.required.USD).toBe(-24); expect(JSON.stringify(summary)).toBe(original);
});
it('never proposes selling more shares than are held', () => {
  const plan = buildRebalancePreview({ ...summary, items: [{ ...summary.items[0], shares: .5, targetPercent: 0 }] });
  expect(plan.trades).toHaveLength(0);
});
