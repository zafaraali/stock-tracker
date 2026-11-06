import { useState, useEffect, useMemo } from 'react';
import { INITIAL_STOCKS, INITIAL_HOLDINGS, CURRENCY_RATES } from '../data/mockData';

export function usePortfolio() {
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('st_manual_stocks');
    return saved ? JSON.parse(saved) : INITIAL_STOCKS;
  });

  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('st_manual_holdings');
    return saved ? JSON.parse(saved) : INITIAL_HOLDINGS;
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('st_manual_currency') || 'USD';
  });

  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('st_manual_watchlist');
    return saved ? JSON.parse(saved) : ['AAPL', 'MSFT', 'NVDA', 'BTC'];
  });

  useEffect(() => {
    localStorage.setItem('st_manual_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('st_manual_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('st_manual_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('st_manual_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const rate = CURRENCY_RATES[currency]?.rate || 1.0;
  const symbol = CURRENCY_RATES[currency]?.symbol || '$';

  const portfolioSummary = useMemo(() => {
    let totalValueUSD = 0;
    let totalCostUSD = 0;

    const items = holdings.map(h => {
      const stockInfo = stocks.find(s => s.symbol.toUpperCase() === h.symbol.toUpperCase()) || { name: h.symbol };
      const currentPriceUSD = h.currentPrice !== undefined ? h.currentPrice : h.avgCost;
      
      const valUSD = h.shares * currentPriceUSD;
      const costUSD = h.shares * h.avgCost;
      const gainUSD = valUSD - costUSD;
      const gainPercent = costUSD > 0 ? (gainUSD / costUSD) * 100 : 0;

      totalValueUSD += valUSD;
      totalCostUSD += costUSD;

      return {
        ...h,
        currentPriceUSD,
        currentPrice: currentPriceUSD * rate,
        totalValue: valUSD * rate,
        totalCost: costUSD * rate,
        gainLoss: gainUSD * rate,
        gainLossPercent: gainPercent,
        name: stockInfo.name || h.symbol
      };
    });

    const totalGainUSD = totalValueUSD - totalCostUSD;
    const totalGainPercent = totalCostUSD > 0 ? (totalGainUSD / totalCostUSD) * 100 : 0;

    return {
      items,
      totalValue: totalValueUSD * rate,
      totalCost: totalCostUSD * rate,
      totalGainLoss: totalGainUSD * rate,
      totalGainLossPercent: totalGainPercent
    };
  }, [holdings, stocks, rate]);

  const addHolding = (newHolding) => {
    const sym = newHolding.symbol.toUpperCase();
    const item = {
      id: 'h-' + Date.now(),
      symbol: sym,
      shares: Number(newHolding.shares),
      avgCost: Number(newHolding.avgCost),
      currentPrice: newHolding.currentPrice !== '' && newHolding.currentPrice !== undefined ? Number(newHolding.currentPrice) : Number(newHolding.avgCost),
      currency: newHolding.currency || 'USD',
      buyDate: newHolding.buyDate || new Date().toISOString().split('T')[0]
    };
    setHoldings(prev => [...prev, item]);

    if (!stocks.some(s => s.symbol.toUpperCase() === sym)) {
      setStocks(prev => [...prev, {
        symbol: sym,
        name: sym + ' Corp',
        category: 'Custom'
      }]);
    }
  };

  const updateHoldingPrice = (id, newCurrentPrice) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, currentPrice: Number(newCurrentPrice) } : h));
  };

  const removeHolding = (id) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  const toggleWatchlist = (sym) => {
    setWatchlist(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const exportJSON = () => {
    const payload = { stocks, holdings, watchlist, currency, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manual_portfolio_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Symbol', 'Shares', 'Avg Cost (USD)', 'Current Price (USD)', 'Total Value', 'Gain/Loss ($)', 'Gain/Loss (%)'];
    const rows = portfolioSummary.items.map(item => [
      item.symbol,
      item.shares,
      item.avgCost.toFixed(2),
      item.currentPriceUSD.toFixed(2),
      item.totalValue.toFixed(2),
      item.gainLoss.toFixed(2),
      item.gainLossPercent.toFixed(2) + '%'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `manual_portfolio_holdings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.stocks) setStocks(data.stocks);
        if (data.holdings) setHoldings(data.holdings);
        if (data.watchlist) setWatchlist(data.watchlist);
        if (data.currency) setCurrency(data.currency);
        alert('Data imported successfully!');
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return {
    stocks,
    holdings,
    currency,
    setCurrency,
    symbol,
    rate,
    watchlist,
    portfolioSummary,
    addHolding,
    updateHoldingPrice,
    removeHolding,
    toggleWatchlist,
    exportJSON,
    exportCSV,
    importJSON
  };
}
