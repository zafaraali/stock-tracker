import { expect, it } from 'vitest';
import { calculatePeriodReturn } from './periodReturn';

it('does not invent zero returns for missing history', () => {
  expect(calculatePeriodReturn([], '2025-01-01')).toBeNull();
  expect(calculatePeriodReturn([{ date: '2025-06-01', periodReturn: 0 }], '2025-01-01')).toBeNull();
  expect(calculatePeriodReturn([{ date: '2025-06-01', periodReturn: 0 }, { date: '2025-06-02', periodReturn: .1 }], '2025-01-01')).toBeNull();
});

it('distinguishes a measured zero return from insufficient data', () => {
  expect(calculatePeriodReturn([{ date: '2025-01-01', periodReturn: 0 }, { date: '2025-01-02', periodReturn: 0 }], '2025-01-01')).toBe(0);
});

it('compounds only the observations after the baseline', () => {
  expect(calculatePeriodReturn([{ date: '2024-12-31', periodReturn: .5 }, { date: '2025-01-02', periodReturn: .1 }, { date: '2025-01-03', periodReturn: -.05 }], '2025-01-01')).toBeCloseTo(.045);
});
