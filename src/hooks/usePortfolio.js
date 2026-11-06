import { useState, useEffect, useMemo } from 'react';
import { INITIAL_HOLDINGS, INITIAL_WATCHLIST, INITIAL_TRANSACTIONS, CURRENCY_RATES } from '../data/mockData';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function migratePortfolioData(holdings, transactions) {
  const migratedTransactions = transactions.map(transaction => {
    if (transaction.holdingId) return transaction;
    const candidates = holdings.filter(holding => holding.symbol?.toUpperCase() === transaction.symbol?.toUpperCase());
    const matchingDate = candidates.find(holding => holding.buyDate === transaction.date);
    return candidates.length
      ? { ...transaction, holdingId: (matchingDate || candidates[0]).id }
      : transaction;
  });

  holdings.forEach(holding => {
    const hasTrades = migratedTransactions.some(transaction =>
      transaction.holdingId === holding.id && ['BUY', 'SELL'].includes(transaction.type)
    );
    if (!hasTrades && Number(holding.shares) > 0) {
      migratedTransactions.push({
        id: `opening-${holding.id}`,
        holdingId: holding.id,
        date: holding.buyDate || today(),
        type: 'BUY',
        symbol: holding.symbol,
        shares: Number(holding.shares),
        price: Number(holding.avgCost),
        total: Number(holding.shares) * Number(holding.avgCost)
      });
    }
  });

  return { holdings, transactions: migratedTransactions };
}

const compareTrades = (a, b) => String(a.date || '').localeCompare(String(b.date || '')) ||
  (a.type === b.type ? String(a.id).localeCompare(String(b.id)) : a.type === 'BUY' ? -1 : 1);

function loadPortfolioData() {
  const savedHoldings = localStorage.getItem('st_pro_holdings');
  const savedTransactions = localStorage.getItem('st_pro_transactions');
  const holdings = savedHoldings ? JSON.parse(savedHoldings) : INITIAL_HOLDINGS;
  const transactions = savedTransactions ? JSON.parse(savedTransactions) : INITIAL_TRANSACTIONS;
  return migratePortfolioData(holdings, transactions);
}

function rebuildHoldings(holdings, transactions) {
  const tradesByHolding = new Map();
  transactions.forEach(transaction => {
    if (!transaction.holdingId || !['BUY', 'SELL'].includes(transaction.type)) return;
    const trades = tradesByHolding.get(transaction.holdingId) || [];
    trades.push(transaction);
    tradesByHolding.set(transaction.holdingId, trades);
  });

  return holdings.map(holding => {
    const trades = tradesByHolding.get(holding.id);
    if (!trades?.length) return { ...holding, shares: 0, avgCost: 0 };

    let shares = 0;
    let costBasis = 0;
    [...trades].sort(compareTrades)
      .forEach(trade => {
        const quantity = Number(trade.shares);
        const price = Number(trade.price);
        if (trade.type === 'BUY') {
          shares += quantity;
          costBasis += quantity * price;
        } else {
          const sold = Math.min(quantity, shares);
          const averageCost = shares > 0 ? costBasis / shares : 0;
          shares -= sold;
          costBasis -= sold * averageCost;
        }
      });
    shares = Math.max(0, shares);
    return {
      ...holding,
      shares,
      avgCost: shares > 0 ? costBasis / shares : 0
    };
  });
}

function getRealizedGains(transactions) {
  const ledgers = new Map();
  const gains = {};
  [...transactions].filter(transaction => ['BUY', 'SELL'].includes(transaction.type))
    .sort(compareTrades)
    .forEach(transaction => {
      if (!transaction.holdingId) return;
      const position = ledgers.get(transaction.holdingId) || { shares: 0, cost: 0 };
      const shares = Number(transaction.shares);
      const price = Number(transaction.price);
      if (transaction.type === 'BUY') {
        position.shares += shares;
        position.cost += shares * price;
      } else {
        const sold = Math.min(shares, position.shares);
        const averageCost = position.shares > 0 ? position.cost / position.shares : 0;
        gains[transaction.id] = (price - averageCost) * sold;
        position.shares -= sold;
        position.cost -= sold * averageCost;
      }
      ledgers.set(transaction.holdingId, position);
    });
  return Object.values(gains).reduce((total, gain) => total + gain, 0);
}

export function usePortfolio() {
  const [portfolioData, setPortfolioData] = useState(() => {
    const data = loadPortfolioData();
    return { ...data, holdings: rebuildHoldings(data.holdings, data.transactions) };
  });
  const holdings = portfolioData.holdings;
  const transactions = portfolioData.transactions;

  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('st_pro_watchlist');
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST;
  });

  const [snapshots, setSnapshots] = useState(() => {
    const saved = localStorage.getItem('st_pro_snapshots');
    return saved ? JSON.parse(saved) : [];
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
    localStorage.setItem('st_pro_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

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
      realizedGainLoss: getRealizedGains(transactions) * rate,
      annualDividend: annualDividendUSD * rate,
      dividendsReceived: transactions
        .filter(transaction => transaction.type === 'DIVIDEND')
        .reduce((total, transaction) => total + Number(transaction.total || 0), 0) * rate,
      portfolioYield: totalValueUSD > 0 ? (annualDividendUSD / totalValueUSD) * 100 : 0,
      totalTargetPercent,
      categoryBreakdown
    };
  }, [holdings, rate, transactions]);

  useEffect(() => {
    if (!holdings.length && !snapshots.length) return;
    const date = today();
    const valueUSD = rate > 0 ? portfolioSummary.totalValue / rate : portfolioSummary.totalValue;
    setSnapshots(previous => {
      const existing = previous.find(snapshot => snapshot.date === date);
      if (existing && existing.valueUSD === valueUSD) return previous;
      return existing
        ? previous.map(snapshot => snapshot.date === date ? { ...snapshot, valueUSD } : snapshot)
        : [...previous, { date, valueUSD }].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, [holdings.length, portfolioSummary.totalValue, rate, snapshots.length]);

  const addHolding = (newHolding) => {
    const sym = newHolding.symbol.toUpperCase();
    const shares = Number(newHolding.shares);
    const avgCost = Number(newHolding.avgCost);
    const currentPrice = newHolding.currentPrice !== '' && newHolding.currentPrice !== undefined ? Number(newHolding.currentPrice) : avgCost;
    const dividendYield = Number(newHolding.dividendYield || 0);
    const targetPercent = Number(newHolding.targetPercent || 0);
    if (!sym || !Number.isFinite(shares) || shares <= 0 ||
      !Number.isFinite(avgCost) || avgCost <= 0 || !Number.isFinite(currentPrice) || currentPrice <= 0 ||
      !Number.isFinite(dividendYield) || dividendYield < 0 || dividendYield > 100 ||
      !Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      alert('Enter valid shares and prices greater than zero, and percentages between 0 and 100.');
      return;
    }

    const item = {
      id: 'h-' + Date.now(),
      symbol: sym,
      name: newHolding.name || sym + ' Corp',
      shares,
      avgCost,
      currentPrice,
      category: newHolding.category || 'Tech',
      dividendYield,
      targetPercent,
      notes: newHolding.notes || '',
      currency: newHolding.currency || 'USD',
      buyDate: newHolding.buyDate || new Date().toISOString().split('T')[0]
    };

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
    setPortfolioData(previous => {
      const nextTransactions = [tx, ...previous.transactions];
      return {
        transactions: nextTransactions,
        holdings: rebuildHoldings([...previous.holdings, item], nextTransactions)
      };
    });
  };

  const updateHoldingPrice = (id, newCurrentPrice) => {
    if (!Number.isFinite(Number(newCurrentPrice)) || Number(newCurrentPrice) <= 0) {
      alert('Current price must be greater than zero.');
      return;
    }
    setPortfolioData(prev => ({
      ...prev,
      holdings: prev.holdings.map(h => h.id === id ? { ...h, currentPrice: Number(newCurrentPrice) } : h)
    }));
  };

  const updateHoldingNotes = (id, notes) => {
    setPortfolioData(prev => ({
      ...prev,
      holdings: prev.holdings.map(h => h.id === id ? { ...h, notes } : h)
    }));
  };

  const updateHoldingTarget = (id, targetPercent) => {
    if (!Number.isFinite(Number(targetPercent)) || Number(targetPercent) < 0 || Number(targetPercent) > 100) {
      alert('Target allocation must be between 0 and 100%.');
      return;
    }
    setPortfolioData(prev => ({
      ...prev,
      holdings: prev.holdings.map(h => h.id === id ? { ...h, targetPercent: Number(targetPercent) } : h)
    }));
  };

  const removeHolding = (id) => {
    if (!window.confirm('Delete this holding and all its transactions?')) return;
    setPortfolioData(previous => {
      const remainingHoldings = previous.holdings.filter(holding => holding.id !== id);
      const remainingTransactions = previous.transactions.filter(transaction =>
        transaction.holdingId ? transaction.holdingId !== id : !previous.holdings.some(
          holding => holding.id === id && holding.symbol?.toUpperCase() === transaction.symbol?.toUpperCase()
        )
      );
      return { holdings: remainingHoldings, transactions: remainingTransactions };
    });
  };

  const saveTransaction = (transaction) => {
    setPortfolioData(previous => {
      const holding = previous.holdings.find(item => item.id === transaction.holdingId);
      const updated = {
        ...transaction,
        symbol: holding?.symbol || transaction.symbol,
        total: transaction.type === 'DIVIDEND'
          ? Number(transaction.total)
          : Number(transaction.shares) * Number(transaction.price)
      };
      const nextTransactions = transaction.id
        ? previous.transactions.map(item => item.id === transaction.id ? updated : item)
        : [{ ...updated, id: `tx-${Date.now()}` }, ...previous.transactions];
      return {
        transactions: nextTransactions,
        holdings: rebuildHoldings(previous.holdings, nextTransactions)
      };
    });
  };

  const deleteTransaction = (id) => {
    if (!window.confirm('Delete this transaction? Holdings will be recalculated from the remaining trades.')) return;
    setPortfolioData(previous => {
      const nextTransactions = previous.transactions.filter(transaction => transaction.id !== id);
      return {
        transactions: nextTransactions,
        holdings: rebuildHoldings(previous.holdings, nextTransactions)
      };
    });
  };

  const deleteAllData = () => {
    if (!window.confirm('Delete all holdings, transactions, snapshots, watchlist items, and preferences? This cannot be undone.')) return;
    setPortfolioData({ holdings: [], transactions: [] });
    setWatchlist([]);
    setSnapshots([]);
    setCurrency('USD');
    setTheme('dark');
  };

  // Watchlist actions
  const addWatchlistItem = (item) => {
    const currentPrice = Number(item.currentPrice);
    const targetBuyPrice = Number(item.targetBuyPrice || item.currentPrice);
    if (!item.symbol?.trim() || !Number.isFinite(currentPrice) || currentPrice <= 0 ||
      !Number.isFinite(targetBuyPrice) || targetBuyPrice <= 0) {
      alert('Enter a ticker and current/target prices greater than zero.');
      return;
    }
    const newItem = {
      id: 'w-' + Date.now(),
      symbol: item.symbol.toUpperCase(),
      name: item.name || item.symbol.toUpperCase() + ' Corp',
      currentPrice,
      targetBuyPrice,
      category: item.category || 'Tech',
      notes: item.notes || ''
    };
    setWatchlist(prev => [...prev, newItem]);
  };

  const updateWatchlistPrice = (id, currentPrice) => {
    if (!Number.isFinite(Number(currentPrice)) || Number(currentPrice) <= 0) {
      alert('Current price must be greater than zero.');
      return;
    }
    setWatchlist(prev => prev.map(w => w.id === id ? { ...w, currentPrice: Number(currentPrice) } : w));
  };

  const removeWatchlistItem = (id) => {
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  const exportJSON = () => {
    const payload = { holdings, watchlist, transactions, snapshots, currency, theme, exportedAt: new Date().toISOString() };
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
        if (data.holdings) {
          const imported = migratePortfolioData(data.holdings, data.transactions || []);
          setPortfolioData({
            holdings: rebuildHoldings(imported.holdings, imported.transactions),
            transactions: imported.transactions
          });
          setSnapshots(data.snapshots || []);
        }
        if (data.watchlist) setWatchlist(data.watchlist);
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
    snapshots,
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
    saveTransaction,
    deleteTransaction,
    deleteAllData,
    addWatchlistItem,
    updateWatchlistPrice,
    removeWatchlistItem,
    exportJSON,
    exportCSV,
    importJSON
  };
}
