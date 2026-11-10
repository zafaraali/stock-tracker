import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { BENCHMARK_SYMBOL, buildPerformanceComparison } from '../services/performanceComparison';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#14b8a6', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];

export function PortfolioCharts({ performance, backtestHistory = [], summary, snapshots, symbol, currencyCode = 'USD', rate, theme }) {
  const isLight = theme === 'light';
  const [range, setRange] = useState('5Y');
  const [activeAsset, setActiveAsset] = useState(null);
  const [activeSector, setActiveSector] = useState(null);
  const cutoff = new Date();
  if (range === 'YTD') cutoff.setMonth(0, 1);
  else if (range === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
  else if (range === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
  else if (range === '6M') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (range === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1);
  else if (range === '3Y') cutoff.setFullYear(cutoff.getFullYear() - 3);
  else if (range === '5Y') cutoff.setFullYear(cutoff.getFullYear() - 5);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const holdingSeries = summary.items.map(item => ({
    item,
    series: backtestHistory.find(history => history.symbol === item.symbol.toUpperCase())?.points || []
  })).filter(entry => entry.series.length && entry.item.totalValue > 0);
  const comparisonHistory = buildPerformanceComparison({
    benchmarkSeries: backtestHistory.find(series => series.symbol === BENCHMARK_SYMBOL)?.points || [],
    holdingSeries: holdingSeries.map(entry => ({ series: entry.series, weight: entry.item.totalValue })),
    cutoffDate
  });
  const growthHistory = comparisonHistory.map(point => ({ ...point, value: point.portfolio, capital: point.sp500 }));
  const latestComparison = comparisonHistory.at(-1);
  const metric = value => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';
  const portfolioReturn = latestComparison?.portfolio;
  const benchmarkReturn = latestComparison?.sp500;
  const outperformance = Number.isFinite(portfolioReturn) && Number.isFinite(benchmarkReturn) ? portfolioReturn - benchmarkReturn : null;

  const assetPieData = summary.items.filter(item => item.totalValue > 0).map(item => ({
    name: item.symbol,
    value: item.totalValue
  }));

  if (summary.cashValue > 0) assetPieData.push({ name: 'Cash', value: summary.cashValue });
  const assetTotal = assetPieData.reduce((total, item) => total + item.value, 0);
  const activeAssetItem = activeAsset === null ? null : assetPieData[activeAsset];

  const sectorPieData = summary.categoryBreakdown.map(cat => ({
    name: cat.name,
    value: cat.value
  }));
  const sectorTotal = sectorPieData.reduce((total, item) => total + item.value, 0);
  const activeSectorItem = activeSector === null ? null : sectorPieData[activeSector];

  const cardBg = isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl';
  const headingColor = isLight ? 'text-slate-700' : 'text-slate-400';
  const chartTheme = isLight
    ? { grid: '#e2e8f0', axis: '#64748b', portfolio: '#4f46e5', benchmark: '#d97706', tooltip: '#ffffff', tooltipText: '#0f172a' }
    : { grid: '#334155', axis: '#94a3b8', portfolio: '#a5b4fc', benchmark: '#fbbf24', tooltip: '#0f172a', tooltipText: '#f8fafc' };
  const showPerformanceChart = true;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {showPerformanceChart && (
      <>
      {/* Performance Comparison Chart */}
      <div className={`${cardBg} chart-card hover-lift border p-5 rounded-2xl lg:col-span-2 transition-colors`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h3 className={`text-xs font-semibold ${headingColor} tracking-wider uppercase`}>Performance vs VOO</h3><div className="chart-range flex gap-1" role="group" aria-label="Chart time range">{['YTD', '1M', '3M', '6M', '1Y', '3Y', '5Y'].map(option => <button key={option} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${range === option ? 'bg-indigo-600 text-white' : isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'}`} onClick={() => setRange(option)}>{option}</button>)}</div></div>
        <p className="text-sm text-slate-400 mb-4">Backtested return for your current holdings versus VOO, the Vanguard S&amp;P 500 ETF. Maximum history is five years.</p>
        <div className="h-64 w-full">
          {comparisonHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center">
              VOO performance data is not available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthHistory}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={11} />
              <YAxis stroke={chartTheme.axis} fontSize={11} tickFormatter={value => `${value.toFixed(0)}%`} />
              <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltip, border: `1px solid ${chartTheme.grid}`, borderRadius: 10, color: chartTheme.tooltipText }} labelStyle={{ color: chartTheme.tooltipText }} itemStyle={{ color: chartTheme.tooltipText }} formatter={value => `${Number(value).toFixed(2)}%`} />
              <Legend wrapperStyle={{ color: chartTheme.tooltipText }} />
              <Area isAnimationActive animationBegin={80} animationDuration={850} animationEasing="ease-out" type="monotone" name="Portfolio" dataKey="value" stroke={chartTheme.portfolio} strokeWidth={3} dot={false} fill="none" />
              <Area isAnimationActive animationBegin={160} animationDuration={850} animationEasing="ease-out" type="monotone" name="VOO (S&P 500)" dataKey="capital" stroke={chartTheme.benchmark} fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm my-3"><span className="text-indigo-400">● Portfolio</span><span className="text-amber-400">┄ S&amp;P 500</span></div>
        <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 mt-3" aria-label="Performance metrics">
          <div><p className="text-[10px] uppercase tracking-wide text-slate-500">Portfolio</p><p className={`text-sm font-semibold ${portfolioReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{metric(portfolioReturn)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-500">VOO (S&amp;P 500)</p><p className={`text-sm font-semibold ${benchmarkReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{metric(benchmarkReturn)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-500">Outperformance</p><p className={`text-sm font-semibold ${outperformance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{metric(outperformance)}</p></div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Uses daily closing prices for VOO and your current holding weights, normalized to the selected range. Cash, dividends, and historical contributions are excluded; holdings with shorter histories begin when their data becomes available.</p>
      </div>
      </>
      )}

      {/* Asset Allocation Pie Chart */}
      <div className={`${cardBg} chart-card hover-lift border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Asset Allocation</h3>
        {assetPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No holdings added</div>
        ) : (
          <div className="space-y-2">
            <div className="chart-donut-wrap h-80 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    isAnimationActive
                    animationBegin={80}
                    animationDuration={750}
                    animationEasing="ease-out"
                    data={assetPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={84}
                    outerRadius={activeAsset !== null ? 136 : 128}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseLeave={() => setActiveAsset(null)}
                  >
                    {assetPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={activeAsset === null || activeAsset === index ? 1 : 0.38} onMouseEnter={() => setActiveAsset(index)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-donut-center" aria-hidden="true"><span>Total value</span><strong>{symbol}{assetTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencyCode}</strong></div>
              {activeAssetItem && <div className="chart-hover-card"><strong>{activeAssetItem.name}</strong><span>{symbol}{Number(activeAssetItem.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode} · {((activeAssetItem.value / assetTotal) * 100).toFixed(1)}%</span></div>}
            </div>
            <div className="chart-legend mt-2 space-y-2" aria-label="Asset allocation percentages">
              {assetPieData.map((item, index) => {
                const percentage = assetTotal > 0 ? (item.value / assetTotal) * 100 : 0;
                return (
                  <div key={`allocation-${item.name}`} className={`chart-legend-row flex items-center justify-between gap-3 text-sm ${activeAsset === index ? 'is-active' : ''}`} onMouseEnter={() => setActiveAsset(index)} onMouseLeave={() => setActiveAsset(null)}>
                    <span className="flex min-w-0 items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-slate-100">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sector / Category Breakdown Pie Chart */}
      <div className={`${cardBg} chart-card hover-lift border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Sector Breakdown</h3>
        {sectorPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No sector data</div>
        ) : (
          <>
          <div className="chart-donut-wrap h-80 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive
                  animationBegin={140}
                  animationDuration={750}
                  animationEasing="ease-out"
                  data={sectorPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={84}
                  outerRadius={activeSector !== null ? 136 : 128}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseLeave={() => setActiveSector(null)}
                >
                  {sectorPieData.map((entry, index) => (
                    <Cell key={`sector-${index}`} fill={COLORS[(index + 3) % COLORS.length]} opacity={activeSector === null || activeSector === index ? 1 : 0.38} onMouseEnter={() => setActiveSector(index)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-donut-center" aria-hidden="true"><span>Total value</span><strong>{symbol}{sectorTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencyCode}</strong></div>
            {activeSectorItem && <div className="chart-hover-card"><strong>{activeSectorItem.name}</strong><span>{symbol}{Number(activeSectorItem.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode} · {((activeSectorItem.value / sectorTotal) * 100).toFixed(1)}%</span></div>}
          </div>
          <div className="chart-legend mt-2 space-y-2" aria-label="Sector allocation percentages">
            {sectorPieData.map((item, index) => {
              const percentage = sectorTotal > 0 ? (item.value / sectorTotal) * 100 : 0;
              return <div key={`sector-allocation-${item.name}`} className={`chart-legend-row flex items-center justify-between gap-3 text-sm ${activeSector === index ? 'is-active' : ''}`} onMouseEnter={() => setActiveSector(index)} onMouseLeave={() => setActiveSector(null)}>
                <span className="flex min-w-0 items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }} aria-hidden="true" /><span className="truncate">{item.name}</span></span>
                <span className="shrink-0 font-semibold text-slate-100">{symbol}{Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode} · {percentage.toFixed(1)}%</span>
              </div>;
            })}
          </div>
          </>
        )}
      </div>

    </div>
  );
}
