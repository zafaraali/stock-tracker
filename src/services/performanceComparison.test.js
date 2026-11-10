import { describe, expect, it } from 'vitest';
import { BENCHMARK_SYMBOL, buildPerformanceComparison } from './performanceComparison';

describe('benchmark comparison', () => {
  it('uses VOO as the benchmark', () => {
    expect(BENCHMARK_SYMBOL).toBe('VOO');
  });

  it('normalizes VOO and fixed-weight holdings to the selected start date', () => {
    const result = buildPerformanceComparison({
      cutoffDate: '2026-01-01',
      benchmarkSeries: [
        { date: '2026-01-01', close: 100 },
        { date: '2026-01-02', close: 110 }
      ],
      holdingSeries: [
        { weight: 75, series: [{ date: '2026-01-01', close: 100 }, { date: '2026-01-02', close: 120 }] },
        { weight: 25, series: [{ date: '2026-01-01', close: 100 }, { date: '2026-01-02', close: 80 }] }
      ]
    });

    expect(result[0]).toMatchObject({ portfolio: 0, voo: 0 });
    expect(result[1].portfolio).toBeCloseTo(10, 6);
    expect(result[1].voo).toBeCloseTo(10, 6);
  });

  it('does not let a holding with no price history distort the weights', () => {
    const result = buildPerformanceComparison({
      cutoffDate: '2026-01-01',
      benchmarkSeries: [{ date: '2026-01-01', close: 100 }, { date: '2026-01-02', close: 110 }],
      holdingSeries: [
        { weight: 50, series: [{ date: '2026-01-01', close: 100 }, { date: '2026-01-02', close: 120 }] },
        { weight: 50, series: [] }
      ]
    });

    expect(result[1].portfolio).toBeCloseTo(20, 6);
  });
});
