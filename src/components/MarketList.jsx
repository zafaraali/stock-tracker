import React, { useState } from 'react';
import { Search, Star, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function MarketList({ stocks, symbol, rate, watchlist, toggleWatchlist }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStocks = stocks.filter(s =>
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl mb-16 sm:mb-8">
      
      {/* Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Live Market Quotes</h2>
          <p className="text-xs text-slate-400">Streaming real-time market prices & watchlists</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStocks.map((st) => {
          const isPos = st.change >= 0;
          const isStarred = watchlist.includes(st.symbol);
          const currentPriceConverted = st.price * rate;

          return (
            <div key={st.symbol} className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl transition shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-base text-white">{st.symbol}</span>
                    <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{st.category}</span>
                  </div>
                  <button
                    onClick={() => toggleWatchlist(st.symbol)}
                    className={`p-1.5 rounded-lg transition ${isStarred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="text-xs text-slate-400 truncate mb-3">{st.name}</div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mt-auto">
                  <div className="text-lg font-bold text-white">
                    {symbol}{currentPriceConverted.toFixed(2)}
                  </div>
                  <div className={`flex items-center text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {isPos ? '+' : ''}{st.changePercent.toFixed(2)}%
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-900 flex justify-between text-[11px] text-slate-500">
                  <span>P/E: {st.pe}</span>
                  <span>Cap: {st.marketCap}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
