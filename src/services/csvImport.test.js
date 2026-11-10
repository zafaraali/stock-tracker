import { describe, expect, it } from 'vitest';
import { parseCsvRows, parsePortfolioCsv } from './csvImport';

describe('CSV import parsing', () => {
  it('handles quoted commas and broker holdings columns', () => {
    const result = parsePortfolioCsv('Symbol,Description,Quantity,Cost Basis Total,Market Value\nAAPL,"Apple, Inc.",2,300,340', 'account-main');
    expect(result.kind).toBe('holdings');
    expect(result.rows[0]).toMatchObject({ symbol: 'AAPL', shares: 2, avgCost: 150, currentPrice: 170 });
  });

  it('maps transaction action rows', () => {
    const result = parsePortfolioCsv('Date,Action,Symbol,Quantity,Price,Commission\n2026-01-02,Bought,AAPL,2,150,1', 'account-main');
    expect(result.kind).toBe('transactions');
    expect(result.rows[0]).toMatchObject({ type: 'BUY', symbol: 'AAPL', shares: 2, price: 150, fee: 1 });
  });

  it('supports multiline quoted fields', () => {
    expect(parseCsvRows('Symbol,Notes\nAAPL,"line one\nline two"')).toEqual([['Symbol', 'Notes'], ['AAPL', 'line one\nline two']]);
  });

  it('accepts holdings whose prices are zero and can be refreshed later', () => {
    const result = parsePortfolioCsv('Symbol,Name,Shares,Avg Cost (CAD),Current Price (CAD)\nSHOP.TO,Shopify,10,0,0', 'account-main');
    expect(result.rows[0]).toMatchObject({ symbol: 'SHOP.TO', shares: 10, avgCost: 0, currentPrice: 0 });
  });

  it('reads holdings list names from combined exports', () => {
    const result = parsePortfolioCsv('Holdings List,Symbol,Name,Shares,Avg Cost (CAD),Current Price (CAD)\nRetirement,TEC.TO,TEC,2,10,12', 'account-main');
    expect(result.rows[0]).toMatchObject({ accountName: 'Retirement', accountId: 'account-main' });
  });
});
