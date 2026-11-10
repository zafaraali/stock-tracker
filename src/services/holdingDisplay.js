export function holdingDisplay(item, mode, currencyCode) {
  const native = mode === 'native';
  const gain = native ? item.nativeGainLoss ?? item.gainLoss : item.gainLoss;
  return {
    currency: native ? item.currency || 'USD' : currencyCode,
    value: native ? item.nativeTotalValue ?? item.totalValue : item.totalValue,
    gain,
    percent: native ? item.gainLossPercent : item.totalCost > 0 ? gain / item.totalCost * 100 : 0,
    price: native ? item.nativeCurrentPrice ?? item.currentPrice : item.currentPrice,
    cost: native ? item.nativeAvgCost ?? item.avgCost : item.avgCost,
    annualDividend: native ? (item.nativeTotalValue ?? item.totalValue) * Number(item.dividendYield || 0) / 100 : item.annualDividend,
  };
}
