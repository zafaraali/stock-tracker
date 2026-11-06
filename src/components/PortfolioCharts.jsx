import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PORTFOLIO_HISTORY } from '../data/mockData';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export function PortfolioCharts({ summary, symbol }) {
  const pieData = summary.items.map(item => ({
    name: item.symbol,
    value: item.totalValue
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* Portfolio Growth Chart */}
      <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
        <h3 className="text-xs font-semibold text-slate-400 mb-4 tracking-wider uppercase">Portfolio Value Growth</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PORTFOLIO_HISTORY}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${symbol}${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                formatter={(val) => [`${symbol}${val.toLocaleString()}`, 'Portfolio Value']}
              />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Allocation Pie Chart */}
      <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
        <h3 className="text-xs font-semibold text-slate-400 mb-4 tracking-wider uppercase">Asset Allocation Breakdown</h3>
        {pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No holdings added yet</div>
        ) : (
          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val) => [`${symbol}${Number(val).toFixed(2)}`, 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
