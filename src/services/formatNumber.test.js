import { expect, it } from 'vitest';
import { formatQuantity, formatPercent } from './formatNumber';

it('formats whole and fractional quantities without unnecessary zeros', () => {
  expect(formatQuantity(1234)).toBe('1,234');
  expect(formatQuantity(1.125)).toBe('1.125');
  expect(formatQuantity(.00000001)).toBe('0.00000001');
});
it('uses consistent percentage precision and avoids negative zero', () => {
  expect(formatPercent(1)).toBe('1.00%');
  expect(formatPercent(-.00001)).toBe('0.00%');
  expect(formatPercent(1.234, { signed: true })).toBe('+1.23%');
});
it('does not disguise missing values as zero', () => {
  expect(formatPercent(null)).toBe('—');
  expect(formatQuantity('')).toBe('—');
  expect(formatQuantity(NaN)).toBe('—');
});
