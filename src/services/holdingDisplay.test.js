import { expect, it } from 'vitest';
import { holdingDisplay } from './holdingDisplay';

const holding = { currency: 'USD', nativeTotalValue: 120, nativeGainLoss: 20, nativeCurrentPrice: 12, nativeAvgCost: 10, gainLossPercent: 20, totalValue: 180, totalCost: 160, gainLoss: 20, currentPrice: 18, avgCost: 15, annualDividend: 9, dividendYield: 5 };

it('keeps native value, gain, prices, and income in the asset currency', () => {
  expect(holdingDisplay(holding, 'native', 'CAD')).toEqual({ currency: 'USD', value: 120, gain: 20, percent: 20, price: 12, cost: 10, annualDividend: 6 });
});

it('uses display cost basis for the display-currency gain percentage', () => {
  expect(holdingDisplay(holding, 'display', 'CAD')).toEqual({ currency: 'CAD', value: 180, gain: 20, percent: 12.5, price: 18, cost: 15, annualDividend: 9 });
});
