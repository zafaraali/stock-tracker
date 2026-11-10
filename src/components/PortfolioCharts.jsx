import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#14b8a6', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];

export function PortfolioCharts({ performance, summary, snapshots, symbol, currencyCode = 'USD', rate, theme }) {
  const isLight = theme === 'light';
  const [range, setRange] = useState('ALL');
  const [activeAsset, setActiveAsset] = useState(null);
  const [activeSector, setActiveSector] = useState(null);
  const rangeSize = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
  const visiblePerformance = range === 'ALL' ? performance : performance.slice(-rangeSize[range]);

  const growthHistory = visiblePerformance.map(observation => ({
    date: observation.date, value: observation.valueUSD * rate,
    capital: observation.capitalUSD * rate, gain: observation.gainUSD * rate
  }));
  const latest = growthHistory.at(-1);

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
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* Portfolio Growth Chart */}
      <div className={`${cardBg} chart-card hover-lift border p-5 rounded-2xl lg:col-span-2 transition-colors`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h3 className={`text-xs font-semibold ${headingColor} tracking-wider uppercase`}>Portfolio value & contributions</h3><div className="chart-range flex gap-1" role="group" aria-label="Chart time range">{['1M', '3M', '6M', '1Y', 'ALL'].map(option => <button key={option} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${range === option ? 'bg-indigo-600 text-white' : isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'}`} onClick={() => setRange(option)}>{option}</button>)}</div></div>
        <p className="text-sm text-slate-400 mb-4">Investment gain since tracking began: <strong className={latest?.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{symbol}{Number(latest?.gain || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode}</strong></p>
        <div className="h-64 w-full">
          {growthHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center">
              A portfolio snapshot will be saved when you open the app.
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
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
              <XAxis dataKey="date" stroke={isLight ? '#64748b' : '#64748b'} fontSize={11} />
              <YAxis stroke={isLight ? '#64748b' : '#64748b'} fontSize={11} tickFormatter={(v) => `${symbol}${v}`} />
              <Tooltip formatter={value => `${symbol}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`} />
              <Area isAnimationActive animationBegin={80} animationDuration={850} animationEasing="ease-out" type="monotone" name="Portfolio value" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={growthHistory.length === 1} fillOpacity={1} fill="url(#colorVal)" />
              <Area isAnimationActive animationBegin={160} animationDuration={850} animationEasing="ease-out" type="linear" name="Starting value + net contributions" dataKey="capital" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm my-3"><span className="text-indigo-400">● Portfolio value</span><span className="text-amber-400">┄ Starting value + net contributions</span></div>
        <p className="text-[10px] text-slate-500 mt-1">Value includes cash. The contribution line starts at your first tracked value and changes with deposits, withdrawals, and positions recorded outside cash. Their difference is investment gain, not a percentage return. Observations are saved on days you use the app. Historical ledger corrections restart performance tracking; earlier value-only observations are excluded.</p>
      </div>

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
