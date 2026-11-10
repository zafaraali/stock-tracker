export function buildRebalancePreview(summary, { fractional = false, fee = 0 } = {}) {
  const trades = [], unavailable = [];
  const required = {};
  if (!Number.isFinite(fee) || fee < 0) return { trades, unavailable: ['Enter a nonnegative fee.'], required };
  for (const item of summary.items) {
    const difference = summary.totalValue * Number(item.targetPercent || 0) / 100 - item.totalValue;
    if (Math.abs(Number(item.actualPercent) - Number(item.targetPercent || 0)) <= .5) continue;
    const nativePrice = Number(item.nativeCurrentPrice ?? item.currentPrice);
    if (!(item.currentPrice > 0) || !(nativePrice > 0) || !Number.isFinite(difference)) { unavailable.push(item.symbol); continue; }
    const exactShares = Math.abs(difference) / item.currentPrice;
    const maximum = difference < 0 ? Math.min(exactShares, Number(item.shares || 0)) : exactShares;
    const precision = fractional ? 1e6 : 1;
    const shares = Math.floor((maximum + Number.EPSILON) * precision) / precision;
    if (!(shares > 0)) { unavailable.push(`${item.symbol}: below ${fractional ? 'six-decimal' : 'whole-share'} trade size`); continue; }
    const action = difference > 0 ? 'BUY' : 'SELL';
    const nativeValue = shares * nativePrice;
    required[item.currency] = (required[item.currency] || 0) + (action === 'BUY' ? nativeValue : -nativeValue) + fee;
    trades.push({ id: item.id, symbol: item.symbol, currency: item.currency, action, shares, exactShares, nativeValue, fee, roundingResidual: Math.max(0, Math.abs(difference) - shares * item.currentPrice) });
  }
  return { trades, unavailable, required };
}
