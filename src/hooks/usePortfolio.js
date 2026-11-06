import { useState, useEffect, useMemo } from 'react';
import { INITIAL_HOLDINGS, INITIAL_WATCHLIST, INITIAL_TRANSACTIONS, CURRENCY_RATES } from '../data/mockData';

export function usePortfolio() {
  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('st_pro_holdings');
    return saved ? JSON.parse(saved) : INITIAL_HOLDINGS;
  });

  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('st_pro_watchlist');
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('st_pro_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('st_pro_currency') || 'USD';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('st_pro_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('st_pro_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('st_pro_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('st_pro_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('st_pro_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('st_pro_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const rate = CURRENCY_RATES[currency]?.rate || 1.0;
  const symbol = CURRENCY_RATES[currency]?.symbol || '$';

  const portfolioSummary = useMemo(() => {
    let totalValueUSD = 0;
    let totalCostUSD = 0;
    let annualDividendUSD = 0;
    let totalTargetPercent = 0;
    const categoryMap = {};

    const items = holdings.map(h => {
      const currentPriceUSD = h.currentPrice !== undefined ? Number(h.currentPrice) : Number(h.avgCost);
      const valUSD = h.shares * currentPriceUSD;
      const costUSD = h.shares * h.avgCost;
      const gainUSD = valUSD - costUSD;
      const gainPercent = costUSD > 0 ? (gainUSD / costUSD) * 100 : 0;
      
      const divYield = h.dividendYield ? Number(h.dividendYield) : 0;
      const itemAnnualDivUSD = valUSD * (divYield / 100);

      totalValueUSD += valUSD;
      totalCostUSD += costUSD;
      annualDividendUSD += itemAnnualDivUSD;
      totalTargetPercent += Number(h.targetPercent || 0);

      const cat = h.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + valUSD;

      return {
        ...h,
        currentPriceUSD,
        currentPrice: currentPriceUSD * rate,
        totalValue: valUSD * rate,
        totalCost: costUSD * rate,
        gainLoss: gainUSD * rate,
        gainLossPercent: gainPercent,
        annualDividend: itemAnnualDivUSD * rate
      };
    });

    const itemsWithRebalance = items.map(item => {
      const actualPercent = totalValueUSD > 0 ? (item.totalValue / (totalValueUSD * rate)) * 100 : 0;
      const targetPct = Number(item.targetPercent || 0);
      const targetValueUSD = totalValueUSD * (targetPct / 100);
      const diffUSD = (item.totalValue / rate) - targetValueUSD;
      const actionShares = item.currentPriceUSD > 0 ? Math.abs(diffUSD) / item.currentPriceUSD : 0;

      let action = 'HOLD';
      if (actualPercent > targetPct + 0.5) action = 'SELL';
      else if (actualPercent < targetPct - 0.5) action = 'BUY';

      return {
        ...item,
        actualPercent,
        targetPercent: targetPct,
        rebalanceAction: action,
        rebalanceDiffValue: Math.abs(diffUSD) * rate,
        rebalanceShares: Number(actionShares.toFixed(2))
      };
    });

    const totalGainUSD = totalValueUSD - totalCostUSD;
    const totalGainPercent = totalCostUSD > 0 ? (totalGainUSD / totalCostUSD) * 100 : 0;

    const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
      name: cat,
      value: categoryMap[cat] * rate,
      percent: totalValueUSD > 0 ? (categoryMap[cat] / totalValueUSD) * 100 : 0
    }));

    return {
      items: itemsWithRebalance,
      totalValue: totalValueUSD * rate,
      totalCost: totalCostUSD * rate,
      totalGainLoss: totalGainUSD * rate,
      totalGainLossPercent: totalGainPercent,
      annualDividend: annualDividendUSD * rate,
      portfolioYield: totalValueUSD > 0 ? (annualDividendUSD / totalValueUSD) * 100 : 0,
      totalTargetPercent,
      categoryBreakdown
    };
  }, [holdings, rate]);

  const addHolding = (newHolding) => {
    const sym = newHolding.symbol.toUpperCase();
    const shares = Number(newHolding.shares);
    const avgCost = Number(newHolding.avgCost);
    const currentPrice = newHolding.currentPrice !== '' && newHolding.currentPrice !== undefined ? Number(newHolding.currentPrice) : avgCost;

    const item = {
      id: 'h-' + Date.now(),
      symbol: sym,
      name: newHolding.name || sym + ' Corp',
      shares,
      avgCost,
      currentPrice,
      category: newHolding.category || 'Tech',
      dividendYield: newHolding.dividendYield !== '' && newHolding.dividendYield !== undefined ? Number(newHolding.dividendYield) : 0,
      targetPercent: newHolding.targetPercent !== '' && newHolding.targetPercent !== undefined ? Number(newHolding.targetPercent) : 0,
      notes: newHolding.notes || '',
      currency: newHolding.currency || 'USD',
      buyDate: newHolding.buyDate || new Date().toISOString().split('T')[0]
    };

    setHoldings(prev => [...prev, item]);

    const tx = {
      id: 'tx-' + Date.now(),
      holdingId: item.id,
      date: item.buyDate,
      type: 'BUY',
      symbol: sym,
      shares,
      price: avgCost,
      total: shares * avgCost
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const updateHoldingPrice = (id, newCurrentPrice) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, currentPrice: Number(newCurrentPrice) } : h));
  };

  const updateHoldingNotes = (id, notes) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, notes } : h));
  };

  const updateHoldingTarget = (id, targetPercent) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, targetPercent: Number(targetPercent) } : h));
  };

  const removeHolding = (id) => {
    const removedHolding = holdings.find(h => h.id === id);
    setHoldings(prev => prev.filter(h => h.id !== id));
    if (removedHolding) {
      setTransactions(prev => prev.filter(tx =>
        tx.holdingId
          ? tx.holdingId !== id
          : tx.symbol?.toUpperCase() !== removedHolding.symbol.toUpperCase()
      ));
    }
  };

  // Watchlist actions
  const addWatchlistItem = (item) => {
    const newItem = {
      id: 'w-' + Date.now(),
      symbol: item.symbol.toUpperCase(),
      name: item.name || item.symbol.toUpperCase() + ' Corp',
      currentPrice: Number(item.currentPrice),
      targetBuyPrice: Number(item.targetBuyPrice || item.currentPrice),
      category: item.category || 'Tech',
      notes: item.notes || ''
    };
    setWatchlist(prev => [...prev, newItem]);
  };

  const updateWatchlistPrice = (id, currentPrice) => {
    setWatchlist(prev => prev.map(w => w.id === id ? { ...w, currentPrice: Number(currentPrice) } : w));
  };

  const removeWatchlistItem = (id) => {
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  const exportJSON = () => {
    const payload = { holdings, watchlist, transactions, currency, theme, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pro_portfolio_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Symbol', 'Name', 'Category', 'Shares', 'Avg Cost (USD)', 'Current Price', 'Target %', 'Dividend Yield %', 'Annual Dividend', 'Total Value', 'Gain/Loss ($)', 'Gain/Loss (%)', 'Notes'];
    const rows = portfolioSummary.items.map(item => [
      item.symbol,
      `"${item.name || ''}"`,
      item.category,
      item.shares,
      item.avgCost.toFixed(2),
      item.currentPriceUSD.toFixed(2),
      item.targetPercent + '%',
      (item.dividendYield || 0).toFixed(2) + '%',
      item.annualDividend.toFixed(2),
      item.totalValue.toFixed(2),
      item.gainLoss.toFixed(2),
      item.gainLossPercent.toFixed(2) + '%',
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `pro_portfolio_holdings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.holdings) setHoldings(data.holdings);
        if (data.watchlist) setWatchlist(data.watchlist);
        if (data.transactions) setTransactions(data.transactions);
        if (data.currency) setCurrency(data.currency);
        if (data.theme) setTheme(data.theme);
        alert('Pro portfolio data imported successfully!');
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return {
    holdings,
    watchlist,
    transactions,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    symbol,
    rate,
    portfolioSummary,
    addHolding,
    updateHoldingPrice,
    updateHoldingNotes,
    updateHoldingTarget,
    removeHolding,
    addWatchlistItem,
    updateWatchlistPrice,
    removeWatchlistItem,
    exportJSON,
    exportCSV,
    importJSON
  };
}
