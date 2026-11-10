// Keep the request same-origin in the browser through the Vite/hosting proxy.
const MARKET_API_URL = import.meta.env.VITE_MARKET_API_URL || '/api/market-quote/';
const MARKET_SEARCH_URL = import.meta.env.VITE_MARKET_SEARCH_URL || '/api/market-search';
const MARKET_FUNDAMENTALS_URL = import.meta.env.VITE_MARKET_FUNDAMENTALS_URL || '/api/market-fundamentals';

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

export function inferSymbolMetadata(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  const currency = detectSymbolCurrency(normalized);
  const exchange = isTseSymbol(normalized) ? (normalized.includes('.V') || normalized.startsWith('TSXV:') ? 'TSXV' : 'TSX') : '';
  const assetType = /^(BTC|ETH|SOL|ADA|DOGE)(-|$)/.test(normalized) ? 'Crypto' : /(^|\.)[A-Z]{2,5}(\.TO|\.V)$/.test(normalized) ? 'Stock' : 'Stock';
  const category = /^(VTI|VOO|QQQ|SPY|SCHD|XEQT|VEQT|VFV|TEC|VDY|XIU)(\.|$)/.test(normalized) ? 'ETF'
    : assetType === 'Crypto' ? 'Crypto'
      : /^(AAPL|AMZN|GOOGL|META|MSFT|NFLX|SHOP)(\.|$)/.test(normalized) ? 'Tech'
        : /^(NVDA|AMD|AVGO)(\.|$)/.test(normalized) ? 'Semi'
          : /^(TSLA)(\.|$)/.test(normalized) ? 'EV'
            : /^(O|KO|JPM|XOM|ENB|BNS|BMO|VDY)(\.|$)/.test(normalized) ? 'Dividend' : 'Other';
  const nasdaqSymbols = new Set(['AAPL', 'AMZN', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA', 'AVGO', 'AMD', 'NFLX', 'VTI', 'QQQ']);
  const nyseSymbols = new Set(['O', 'KO', 'JPM', 'XOM', 'SPY', 'VOO', 'SCHD']);
  return { currency, exchange: exchange || (nasdaqSymbols.has(normalized) ? 'NASDAQ' : nyseSymbols.has(normalized) ? 'NYSE' : ''), assetType, category };
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

export async function fetchHistoricalMarketData(symbol, signal) {
  const yahooSymbol = toYahooSymbol(symbol);
  if (!yahooSymbol) throw new Error('A ticker symbol is required.');
  // Fetch extra history so a five-year chart can include the exact cutoff
  // trading day instead of Yahoo's rolling 5y response boundary.
  const response = await fetch(`${MARKET_API_URL}${encodeURIComponent(yahooSymbol)}?range=10y&interval=1d&events=history`, { signal });
  if (!response.ok) throw new Error(`Historical market data request failed (${response.status}).`);
  const result = (await response.json()).chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  // Use the displayed closing price rather than adjusted close so the chart
  // matches VOO's quoted price return on Google Finance and Yahoo Finance.
  const closes = result?.indicators?.quote?.[0]?.close || result?.indicators?.adjclose?.[0]?.adjclose || [];
  return timestamps.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString().slice(0, 10), close: Number(closes[index]) }))
    .filter(point => Number.isFinite(point.close) && point.close > 0);
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
        assetType: item.quoteType === 'ETF' ? 'ETF' : item.quoteType === 'CRYPTOCURRENCY' ? 'Crypto' : 'Stock',
        currency: isTse ? 'CAD' : 'USD',
        exchange: item.exchDisp || item.exchange || '',
        dividendYield: Number.isFinite(Number(item.dividendYield)) ? Number(item.dividendYield) : null
      };
    });
}

export async function fetchMarketFundamentals(symbol, signal) {
  const yahooSymbol = toYahooSymbol(symbol);
  try {
    const response = await fetch(`${MARKET_FUNDAMENTALS_URL}?symbol=${encodeURIComponent(yahooSymbol)}`, { signal });
    if (response.ok) {
      const quote = (await response.json()).quoteResponse?.result?.[0];
      const price = Number(quote?.regularMarketPrice);
      const annualDividend = Number(quote?.trailingAnnualDividendRate);
      const reportedYield = Number(quote?.dividendYield);
      const dividendYield = Number.isFinite(annualDividend) && annualDividend > 0 && price > 0
        ? (annualDividend / price) * 100
        : Number.isFinite(reportedYield) && reportedYield > 0 ? reportedYield * 100 : 0;
      if (dividendYield > 0) return { dividendYield, source: 'provider' };
    }
  } catch (error) {
    if (error.name === 'AbortError') throw error;
  }

  const chartResponse = await fetch(`${MARKET_API_URL}${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d&events=div`, { signal });
  if (!chartResponse.ok) throw new Error(`Dividend data request failed (${chartResponse.status}).`);
  const chart = (await chartResponse.json()).chart?.result?.[0];
  const price = Number(chart?.meta?.regularMarketPrice ?? chart?.meta?.previousClose);
  const dividends = Object.values(chart?.events?.dividends || {}).map(event => Number(event.amount)).filter(amount => Number.isFinite(amount) && amount > 0);
  const annualDividend = dividends.reduce((total, amount) => total + amount, 0);
  return { dividendYield: price > 0 ? (annualDividend / price) * 100 : 0, source: 'historical' };
}
