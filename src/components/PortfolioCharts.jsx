import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#14b8a6', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];

export function PortfolioCharts({ summary, snapshots, symbol, rate, theme }) {
  const isLight = theme === 'light';

  const growthHistory = [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(snapshot => ({
      date: snapshot.date,
      value: Number(snapshot.valueUSD) * rate
    }));

  const assetPieData = summary.items.map(item => ({
    name: item.symbol,
    value: item.totalValue
  }));

  const sectorPieData = summary.categoryBreakdown.map(cat => ({
    name: cat.name,
    value: cat.value
  }));

  const cardBg = isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800/80 shadow-xl';
  const headingColor = isLight ? 'text-slate-700' : 'text-slate-400';
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className={`p-3 rounded-xl shadow-2xl border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'}`} style={{ color: isLight ? '#0f172a' : '#ffffff' }}>
          <p className="text-xs font-bold" style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{data.name || label}</p>
          <p className={`text-sm font-semibold mt-1 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
            {symbol}{Number(data.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* Portfolio Growth Chart */}
      <div className={`${cardBg} border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Portfolio Growth</h3>
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
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={growthHistory.length === 1} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Actual portfolio values are saved once per day when you open the app. Older history is unavailable.</p>
      </div>

      {/* Asset Allocation Pie Chart */}
      <div className={`${cardBg} border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Asset Allocation</h3>
        {assetPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No holdings added</div>
        ) : (
          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {assetPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sector / Category Breakdown Pie Chart */}
      <div className={`${cardBg} border p-5 rounded-2xl lg:col-span-1 transition-colors`}>
        <h3 className={`text-xs font-semibold ${headingColor} mb-4 tracking-wider uppercase`}>Sector Breakdown</h3>
        {sectorPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No sector data</div>
        ) : (
          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sectorPieData.map((entry, index) => (
                    <Cell key={`sector-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
