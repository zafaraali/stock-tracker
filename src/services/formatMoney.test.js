import { expect, it } from 'vitest';
import { formatMoney } from './formatMoney';

it('labels currencies and groups monetary values consistently', () => {
  expect(formatMoney(1234.5, 'CAD').replace(/\s/g, ' ')).toBe('CAD $1,234.50');
});

it('preserves loss signs and avoids negative zero', () => {
  expect(formatMoney(-45.5, 'USD', { signed: true }).replace(/\s/g, ' ')).toBe('-USD $45.50');
  expect(formatMoney(45.5, 'USD', { signed: true }).replace(/\s/g, ' ')).toBe('+USD $45.50');
  expect(formatMoney(-0, 'USD', { signed: true }).replace(/\s/g, ' ')).toBe('USD $0.00');
});

it('does not show missing or invalid amounts as zero', () => {
  for (const value of [null, undefined, NaN, '', Infinity]) expect(formatMoney(value)).toBe('—');
});
