import { describe, expect, it } from 'vitest';
import { getRealizedGains, rebuildHoldings, toUSD, fromUSD } from './usePortfolio';
import { isTseSymbol, toYahooSymbol, detectSymbolCurrency } from '../services/marketApi';

describe('portfolio calculations', () => {
  it('rebuilds average cost after a partial sale', () => {
    const holdings = [{ id: 'h-1', symbol: 'AAPL', shares: 0, avgCost: 0 }];
    const transactions = [
      { id: 'b1', holdingId: 'h-1', type: 'BUY', date: '2024-01-01', shares: 10, price: 100 },
      { id: 'b2', holdingId: 'h-1', type: 'BUY', date: '2024-02-01', shares: 10, price: 120 },
      { id: 's1', holdingId: 'h-1', type: 'SELL', date: '2024-03-01', shares: 5, price: 150 }
    ];
    const [holding] = rebuildHoldings(holdings, transactions);
    expect(holding.shares).toBe(15);
    expect(holding.avgCost).toBeCloseTo(110, 2);
    expect(getRealizedGains(transactions)).toBeCloseTo(200, 2);
  });

  it('never lets an oversold ledger create negative shares', () => {
    const holdings = [{ id: 'h-1', symbol: 'AAPL', shares: 0, avgCost: 0 }];
    const transactions = [
      { id: 'b1', holdingId: 'h-1', type: 'BUY', date: '2024-01-01', shares: 2, price: 100 },
      { id: 's1', holdingId: 'h-1', type: 'SELL', date: '2024-02-01', shares: 5, price: 150 }
    ];
    const [holding] = rebuildHoldings(holdings, transactions);
    expect(holding.shares).toBe(0);
    expect(holding.avgCost).toBe(0);
  });

  it('accurately converts CAD amounts to USD and back', () => {
    // 135 CAD / 1.35 = 100 USD
    expect(toUSD(135, 'CAD')).toBeCloseTo(100, 2);
    expect(fromUSD(100, 'CAD')).toBeCloseTo(135, 2);
    expect(toUSD(100, 'USD')).toBe(100);
    expect(fromUSD(100, 'USD')).toBe(100);
  });

  it('calculates realized gains in USD for CAD (TSE) transactions', () => {
    const holdings = [{ id: 'h-cad', symbol: 'RY.TO', currency: 'CAD', shares: 0, avgCost: 0 }];
    // Buy 10 @ 100 CAD = 1000 CAD, sell 5 @ 127 CAD -> gain = 5 * 27 = 135 CAD.
    // 135 CAD in USD (rate 1.35) = 100 USD.
    const transactions = [
      { id: 'b1', holdingId: 'h-cad', symbol: 'RY.TO', currency: 'CAD', type: 'BUY', date: '2024-01-01', shares: 10, price: 100 },
      { id: 's1', holdingId: 'h-cad', symbol: 'RY.TO', currency: 'CAD', type: 'SELL', date: '2024-02-01', shares: 5, price: 127 }
    ];
    const gainsUSD = getRealizedGains(transactions, holdings);
    expect(gainsUSD).toBeCloseTo(100, 2);
  });
});

describe('TSE / TSX symbol detection and formatting', () => {
  it('identifies TSE and TSX symbols and maps to CAD currency', () => {
    expect(isTseSymbol('SHOP.TO')).toBe(true);
    expect(isTseSymbol('RY.TO')).toBe(true);
    expect(isTseSymbol('TSE:ENB')).toBe(true);
    expect(isTseSymbol('TSX:TD')).toBe(true);
    expect(isTseSymbol('SHOP:TSE')).toBe(true);
    expect(isTseSymbol('XYZ.V')).toBe(true);
    expect(isTseSymbol('TSXV:XYZ')).toBe(true);

    expect(isTseSymbol('AAPL')).toBe(false);
    expect(isTseSymbol('MSFT')).toBe(false);
    expect(isTseSymbol('BTC')).toBe(false);

    expect(detectSymbolCurrency('SHOP.TO')).toBe('CAD');
    expect(detectSymbolCurrency('TSE:RY')).toBe('CAD');
    expect(detectSymbolCurrency('AAPL')).toBe('USD');
  });

  it('normalizes TSE ticker input variants for Yahoo Finance', () => {
    expect(toYahooSymbol('TSE:SHOP')).toBe('SHOP.TO');
    expect(toYahooSymbol('TSX:RY')).toBe('RY.TO');
    expect(toYahooSymbol('ENB:TSE')).toBe('ENB.TO');
    expect(toYahooSymbol('TD:TSX')).toBe('TD.TO');
    expect(toYahooSymbol('TSXV:XYZ')).toBe('XYZ.V');
    expect(toYahooSymbol('SHOP.TO')).toBe('SHOP.TO');
    expect(toYahooSymbol('BTC')).toBe('BTC-USD');
    expect(toYahooSymbol('AAPL')).toBe('AAPL');
  });
});
