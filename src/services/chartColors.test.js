import { expect, it } from 'vitest';
import { chartColor } from './chartColors';

it('keeps colors stable when ranking or portfolio membership changes', () => {
  const before = ['AAPL', 'MSFT', 'BTC'].map(name => [name, chartColor(name)]);
  const after = new Map(['BTC', 'NEW', 'AAPL', 'MSFT'].map(name => [name, chartColor(name)]));
  for (const [name, color] of before) expect(after.get(name)).toBe(color);
  expect(chartColor(' aapl ')).toBe(chartColor('AAPL'));
});
