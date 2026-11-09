import { isTseSymbol, toYahooSymbol } from '../services/marketApi';

const googleQuote = symbol => {
  const normalized = String(symbol || '').trim().toUpperCase();
  const yahooSymbol = toYahooSymbol(normalized);
  if (isTseSymbol(normalized)) {
    const exchange = yahooSymbol.endsWith('.V') ? 'CVE' : 'TSE';
    return `${yahooSymbol.replace(/\.(TO|V)$/, '')}:${exchange}`;
  }
  return normalized;
};

export function TickerLinks({ symbol }) {
  const yahooSymbol = toYahooSymbol(symbol);
  const googleSymbol = googleQuote(symbol);
  if (!yahooSymbol || !googleSymbol) return null;

  return (
    <span className="ticker-links" aria-label={`${symbol} market links`}>
      <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}`} target="_blank" rel="noreferrer" title={`Open ${symbol} on Yahoo Finance`}>Y</a>
      <a href={`https://www.google.com/finance/quote/${encodeURIComponent(googleSymbol)}`} target="_blank" rel="noreferrer" title={`Open ${symbol} on Google Finance`}>G</a>
    </span>
  );
}
