export const BENCHMARK_SYMBOL = 'VOO';

const latestPointAtOrBefore = (points, date) => {
  let latest;
  for (const point of points) {
    if (point.date > date) break;
    latest = point;
  }
  return latest;
};

const latestPointBefore = (points, date) => {
  let latest;
  for (const point of points) {
    if (point.date >= date) break;
    latest = point;
  }
  return latest;
};

export function buildPerformanceComparison({ benchmarkSeries = [], holdingSeries = [], cutoffDate }) {
  const visibleBenchmark = benchmarkSeries
    .filter(point => point.date >= cutoffDate && Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const benchmarkBase = latestPointBefore(
    benchmarkSeries.filter(point => Number.isFinite(point.close) && point.close > 0).sort((a, b) => a.date.localeCompare(b.date)),
    cutoffDate
  ) || visibleBenchmark[0];
  if (!benchmarkBase) return [];

  const weightedHoldings = holdingSeries
    .filter(entry => entry.series?.length && Number(entry.weight) > 0)
    .map(entry => {
      const series = entry.series
        .filter(point => Number.isFinite(point.close) && point.close > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      return { ...entry, series, base: latestPointBefore(series, cutoffDate) || series.find(point => point.date >= cutoffDate) };
    })
    .filter(entry => entry.base);
  const weightTotal = weightedHoldings.reduce((total, entry) => total + entry.weight, 0);

  return visibleBenchmark.map(observation => {
    const portfolio = weightTotal > 0
      ? weightedHoldings.reduce((total, entry) => {
        const point = latestPointAtOrBefore(entry.series, observation.date);
        const returnPercent = point ? (point.close / entry.base.close - 1) * 100 : 0;
        return total + (entry.weight / weightTotal) * returnPercent;
      }, 0)
      : null;
    const voo = (observation.close / benchmarkBase.close - 1) * 100;
    return { date: observation.date, portfolio: Number.isFinite(portfolio) ? portfolio : null, voo, sp500: voo };
  });
}
