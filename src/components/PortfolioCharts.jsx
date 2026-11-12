import { DashboardCard } from './DashboardCard';
import { Money } from './Money';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { byValueThenName } from '../services/chartOrdering';
import { formatQuantity, formatPercent } from '../services/formatNumber';
import { chartColor } from '../services/chartColors';
import { formatMoney } from '../services/formatMoney';
import React, { useEffect, useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { BENCHMARK_SYMBOL, buildPerformanceComparison } from '../services/performanceComparison';


export function PortfolioCharts({ performance, backtestHistory = [], summary, snapshots, symbol, currencyCode = 'USD', rate, theme, showPerformanceChart = true }) {
  const reducedMotion = useReducedMotion();
  const isLight = theme === 'light';
  const [range, setRange] = useState('5Y');
  const [hoverAsset, setHoverAsset] = useState(null);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [hoverSector, setHoverSector] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const assetCard = useRef(null), sectorCard = useRef(null);
  useEffect(() => {
    const outside = event => {
      if (!assetCard.current?.contains(event.target)) setSelectedAsset(null);
      if (!sectorCard.current?.contains(event.target)) setSelectedSector(null);
    };
    const escape = event => { if (event.key === 'Escape') { setSelectedAsset(null); setSelectedSector(null); setHoverAsset(null); setHoverSector(null); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
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

  const assetPieData = [...summary.items.filter(item => item.totalValue > 0).reduce((assets, item) => {
    const symbolKey = String(item.symbol || '').trim().toUpperCase();
    const existing = assets.get(symbolKey);
    assets.set(symbolKey, { name: symbolKey || item.symbol, value: (existing?.value || 0) + item.totalValue });
    return assets;
  }, new Map()).values()];

  if (summary.cashValue > 0) assetPieData.push({ name: 'Cash', value: summary.cashValue });
  assetPieData.sort(byValueThenName);
  const assetTotal = assetPieData.reduce((total, item) => total + item.value, 0);
  const selectedAssetIndex = assetPieData.findIndex(item => item.name === selectedAsset);
  const activeAsset = selectedAssetIndex >= 0 ? selectedAssetIndex : hoverAsset;
  const activeAssetItem = activeAsset === null ? null : assetPieData[activeAsset];

  const sectorPieData = summary.categoryBreakdown.map(cat => ({
    name: cat.name,
    value: cat.value
  })).sort(byValueThenName);
  const sectorTotal = sectorPieData.reduce((total, item) => total + item.value, 0);
  const selectedSectorIndex = sectorPieData.findIndex(item => item.name === selectedSector);
  const activeSector = selectedSectorIndex >= 0 ? selectedSectorIndex : hoverSector;
  const activeSectorItem = activeSector === null ? null : sectorPieData[activeSector];

  const cardBg = isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl';
  const headingColor = isLight ? 'text-slate-700' : 'text-slate-400';
  const chartTheme = isLight
    ? { grid: '#e2e8f0', axis: '#64748b', portfolio: '#4f46e5', benchmark: '#d97706', tooltip: '#ffffff', tooltipText: '#0f172a' }
    : { grid: '#334155', axis: '#94a3b8', portfolio: '#a5b4fc', benchmark: '#fbbf24', tooltip: '#0f172a', tooltipText: '#f8fafc' };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {showPerformanceChart && (
      <>
      {/* Performance Comparison Chart */}
      <div className={`${cardBg} chart-card border p-5 rounded-2xl lg:col-span-2 transition-colors`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h3 className={`text-xs font-semibold ${headingColor} tracking-wider uppercase`}>Estimated Performance vs VOO</h3><div className="chart-range flex gap-1" role="group" aria-label="Chart time range">{['YTD', '1M', '3M', '6M', '1Y', '3Y', '5Y'].map(option => <button key={option} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${range === option ? 'bg-indigo-600 text-white' : isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'}`} onClick={() => setRange(option)}>{option}</button>)}</div></div>
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
              <Area isAnimationActive={!reducedMotion} animationBegin={80} animationDuration={850} animationEasing="ease-out" type="monotone" name="Portfolio" dataKey="value" stroke={chartTheme.portfolio} strokeWidth={3} dot={false} fill="none" />
              <Area isAnimationActive={!reducedMotion} animationBegin={160} animationDuration={850} animationEasing="ease-out" type="monotone" name="VOO (S&P 500)" dataKey="capital" stroke={chartTheme.benchmark} fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm my-3"><span className="text-indigo-400">● Portfolio</span><span className="text-amber-400">┄ VOO (S&amp;P 500)</span></div>
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
      <DashboardCard as="div" cardId="asset-allocation" label="Asset Allocation"><div ref={assetCard} className={`${cardBg} chart-card border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Asset Allocation</h3>
        {assetPieData.length > 0 && <p className="chart-summary">{assetPieData[0].name === 'Cash' ? 'Largest allocation' : 'Largest holding'}: <strong>{assetPieData[0].name}</strong> · {formatPercent(assetPieData[0].value / assetTotal * 100)} of portfolio</p>}
        <div className="chart-selection-slot no-print" aria-live="polite">{selectedAsset && <button className="secondary-button" onClick={() => { setSelectedAsset(null); setHoverAsset(null); }}>Pinned: {selectedAsset} · Clear</button>}</div>
        {assetPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Add a holding to see how your portfolio is allocated.</div>
        ) : (
          <div className="space-y-2">
            <div className="chart-donut-wrap h-80 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    isAnimationActive={!reducedMotion}
                    animationBegin={80}
                    animationDuration={750}
                    animationEasing="ease-out"
                    data={assetPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="56%"
                    outerRadius="85%"
                    paddingAngle={3}
                    dataKey="value"
                    onMouseLeave={() => setHoverAsset(null)}
                  >
                    {assetPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColor(entry.name)} opacity={activeAsset === null || activeAsset === index ? 1 : 0.38} onMouseEnter={() => setHoverAsset(index)} onClick={() => setSelectedAsset(value => value === entry.name ? null : entry.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-donut-center" aria-hidden="true"><span>Total value</span><strong><Money amount={formatMoney(assetTotal, currencyCode, { compact: true })} /></strong></div>
            </div>
            <div className="chart-detail-slot">{activeAssetItem && <div className="chart-hover-card"><strong>{activeAssetItem.name}</strong><span><Money amount={formatMoney(activeAssetItem.value, currencyCode)} /> · {((activeAssetItem.value / assetTotal) * 100).toFixed(1)}%</span></div>}</div>
            <div className="chart-legend mt-2 space-y-2" aria-label="Asset allocation percentages">
              {assetPieData.map((item, index) => {
                const percentage = assetTotal > 0 ? (item.value / assetTotal) * 100 : 0;
                return (
                  <button type="button" key={`allocation-${item.name}`} className={`chart-legend-row w-full text-left flex items-center justify-between gap-3 text-sm ${index >= 5 && !showAllAssets ? 'legend-extra' : ''} ${activeAsset === index ? 'is-active' : ''}`} aria-pressed={selectedAsset === item.name} onFocus={() => setHoverAsset(index)} onBlur={() => setHoverAsset(null)} onClick={() => setSelectedAsset(value => value === item.name ? null : item.name)} onKeyDown={event => { if (event.key === 'Escape') { setSelectedAsset(null); setHoverAsset(null); } }} onMouseEnter={() => setHoverAsset(index)} onMouseLeave={() => setHoverAsset(null)}>
                    <span className="flex min-w-0 items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColor(item.name) }} aria-hidden="true" />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="chart-legend-value font-semibold text-slate-100"><Money amount={formatMoney(item.value, currencyCode)} /><small>{formatPercent(percentage)}</small></span>
                  </button>
                );
              })}
              {assetPieData.length > 5 && <button className="secondary-button no-print w-full" aria-expanded={showAllAssets} onClick={() => { setShowAllAssets(value => !value); setHoverAsset(null); }}>{showAllAssets ? 'Show fewer assets' : `Show all ${assetPieData.length} assets`}</button>}
            </div>
          </div>
        )}
      </div></DashboardCard>

      {/* Sector / Category Breakdown Pie Chart */}
      <DashboardCard as="div" cardId="sector-breakdown" label="Sector Breakdown"><div ref={sectorCard} className={`${cardBg} chart-card border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Sector Breakdown</h3>
        {sectorPieData.length > 0 && sectorTotal > 0 && <p className="chart-summary">{sectorPieData[0].name === 'Cash' ? 'Largest allocation' : 'Largest sector'}: <strong>{sectorPieData[0].name}</strong> · {formatPercent(sectorPieData[0].value / sectorTotal * 100)} {summary.cashValue > 0 ? 'of portfolio' : 'of holdings'}</p>}
        <div className="chart-selection-slot no-print" aria-live="polite">{selectedSector && <button className="secondary-button" onClick={() => { setSelectedSector(null); setHoverSector(null); }}>Pinned: {selectedSector} · Clear</button>}</div>
        {sectorPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No sector data</div>
        ) : (
          <>
          <div className="chart-donut-wrap h-80 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive={!reducedMotion}
                  animationBegin={140}
                  animationDuration={750}
                  animationEasing="ease-out"
                  data={sectorPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="56%"
                  outerRadius="85%"
                  paddingAngle={3}
                  dataKey="value"
                  onMouseLeave={() => setHoverSector(null)}
                >
                  {sectorPieData.map((entry, index) => (
                    <Cell key={`sector-${index}`} fill={chartColor(entry.name, 'sector')} opacity={activeSector === null || activeSector === index ? 1 : 0.38} onMouseEnter={() => setHoverSector(index)} onClick={() => setSelectedSector(value => value === entry.name ? null : entry.name)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-donut-center" aria-hidden="true"><span>Total value</span><strong><Money amount={formatMoney(sectorTotal, currencyCode, { compact: true })} /></strong></div>
          </div>
            <div className="chart-detail-slot">{activeSectorItem && <div className="chart-hover-card"><strong>{activeSectorItem.name}</strong><span><Money amount={formatMoney(activeSectorItem.value, currencyCode)} /> · {((activeSectorItem.value / sectorTotal) * 100).toFixed(1)}%</span></div>}</div>
          <div className="chart-legend mt-2 space-y-2" aria-label="Sector allocation percentages">
            {sectorPieData.map((item, index) => {
              const percentage = sectorTotal > 0 ? (item.value / sectorTotal) * 100 : 0;
              return <button type="button" key={`sector-allocation-${item.name}`} className={`chart-legend-row w-full text-left flex items-center justify-between gap-3 text-sm ${index >= 5 && !showAllSectors ? 'legend-extra' : ''} ${activeSector === index ? 'is-active' : ''}`} aria-pressed={selectedSector === item.name} onFocus={() => setHoverSector(index)} onBlur={() => setHoverSector(null)} onClick={() => setSelectedSector(value => value === item.name ? null : item.name)} onKeyDown={event => { if (event.key === 'Escape') { setSelectedSector(null); setHoverSector(null); } }} onMouseEnter={() => setHoverSector(index)} onMouseLeave={() => setHoverSector(null)}>
                <span className="flex min-w-0 items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColor(item.name, 'sector') }} aria-hidden="true" /><span className="truncate">{item.name}</span></span>
                <span className="chart-legend-value font-semibold text-slate-100"><Money amount={formatMoney(item.value, currencyCode)} /> · {formatPercent(percentage)}</span>
              </button>;
            })}
            {sectorPieData.length > 5 && <button className="secondary-button no-print w-full" aria-expanded={showAllSectors} onClick={() => { setShowAllSectors(value => !value); setHoverSector(null); }}>{showAllSectors ? 'Show fewer sectors' : `Show all ${sectorPieData.length} sectors`}</button>}
          </div>
          </>
        )}
      </div></DashboardCard>

    </div>
  );
}
