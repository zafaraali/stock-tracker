import { isTseSymbol, toYahooSymbol } from '../services/marketApi';

const currencyPair = currency => {
  const code = String(currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return code === 'CAD' ? 'CAD/USD' : `${code}/CAD`;
};

const googleQuote = symbol => {
  const normalized = String(symbol || '').trim().toUpperCase();
  const yahooSymbol = toYahooSymbol(normalized);
  if (isTseSymbol(normalized)) {
    const exchange = yahooSymbol.endsWith('.V') ? 'CVE' : 'TSE';
    return `${yahooSymbol.replace(/\.(TO|V)$/, '')}:${exchange}`;
  }
  return normalized;
};

export function TickerLinks({ symbol, currency }) {
  const pair = currencyPair(currency);
  const yahooSymbol = pair ? `${pair.replace('/', '')}=X` : toYahooSymbol(symbol);
  const googleSymbol = pair ? pair.replace('/', '-') : googleQuote(symbol);
  if (!yahooSymbol || !googleSymbol) return null;

  return (
    <span className="ticker-links" aria-label={`${symbol} market links`}>
      {pair && <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap mr-2">{pair}</span>}
      <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}`} target="_blank" rel="noreferrer" title={`Open ${symbol} on Yahoo Finance`}>Y</a>
      <a href={`https://www.google.com/finance/quote/${encodeURIComponent(googleSymbol)}`} target="_blank" rel="noreferrer" title={`Open ${symbol} on Google Finance`}>G</a>
    </span>
  );
}
