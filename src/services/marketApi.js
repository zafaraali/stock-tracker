// Keep the request same-origin in the browser through the Vite/hosting proxy.
const MARKET_API_URL = import.meta.env.VITE_MARKET_API_URL || '/api/market-quote/';
const MARKET_SEARCH_URL = import.meta.env.VITE_MARKET_SEARCH_URL || '/api/market-search';

export function isTseSymbol(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  return (
    normalized.endsWith('.TO') ||
    normalized.endsWith('.V') ||
    normalized.startsWith('TSE:') ||
    normalized.startsWith('TSX:') ||
    normalized.endsWith(':TSE') ||
    normalized.endsWith(':TSX') ||
    normalized.startsWith('TSXV:')
  );
}

export function toYahooSymbol(symbol) {
  let normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) return '';
  if (normalized === 'BTC') return 'BTC-USD';

  if (normalized.startsWith('TSE:') || normalized.startsWith('TSX:')) {
    normalized = normalized.replace(/^(?:TSE|TSX):/, '') + '.TO';
  } else if (normalized.endsWith(':TSE') || normalized.endsWith(':TSX')) {
    normalized = normalized.replace(/:(?:TSE|TSX)$/, '') + '.TO';
  } else if (normalized.startsWith('TSXV:')) {
    normalized = normalized.replace(/^TSXV:/, '') + '.V';
  }

  return normalized;
}

export function detectSymbolCurrency(symbol) {
  return isTseSymbol(symbol) ? 'CAD' : 'USD';
}

export async function fetchMarketQuote(symbol, signal) {
  const yahooSymbol = toYahooSymbol(symbol);
  if (!yahooSymbol) throw new Error('A ticker symbol is required.');

  const response = await fetch(
    `${MARKET_API_URL}${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`,
    { signal }
  );
  if (!response.ok) throw new Error(`Market data request failed (${response.status}).`);

  const payload = await response.json();
  const meta = payload.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice ?? meta?.previousClose);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`No current price was returned for ${symbol}.`);

  const rawCurrency = meta?.currency ? String(meta.currency).toUpperCase() : null;
  const currency = rawCurrency || detectSymbolCurrency(symbol || yahooSymbol);

  return {
    symbol: String(symbol).trim().toUpperCase(),
    yahooSymbol,
    price,
    updatedAt: Number.isFinite(meta?.regularMarketTime) ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    currency
  };
}

export async function searchMarketSymbols(query, signal) {
  const response = await fetch(`${MARKET_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`, { signal });
  if (!response.ok) throw new Error(`Market search failed (${response.status}).`);

  const payload = await response.json();
  return (payload.quotes || [])
    .filter(item => item.symbol && ['EQUITY', 'ETF', 'CRYPTOCURRENCY'].includes(item.quoteType))
    .map(item => {
      const sym = item.symbol.toUpperCase();
      const isTse = isTseSymbol(sym) || ['TOR', 'TSX', 'VAN', 'NEO'].includes(item.exchange);
      return {
        symbol: sym,
        name: item.longname || item.shortname || item.symbol,
        category: item.quoteType === 'ETF' ? 'ETF' : item.quoteType === 'CRYPTOCURRENCY' ? 'Crypto' : 'Other',
        currency: isTse ? 'CAD' : 'USD',
        exchange: item.exchDisp || item.exchange || ''
      };
    });
}
