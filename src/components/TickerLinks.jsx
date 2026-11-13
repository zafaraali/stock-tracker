import { inferSymbolMetadata, isTseSymbol, toYahooSymbol } from '../services/marketApi';

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
  const exchange = inferSymbolMetadata(normalized).exchange || 'NASDAQ';
  return `${normalized}:${exchange}`;
};

export function TickerLinks({ symbol, currency }) {
  const pair = currencyPair(currency);
  const yahooSymbol = pair ? `${pair.replace('/', '')}=X` : toYahooSymbol(symbol);
  const googleSymbol = pair ? pair.replace('/', '-') : googleQuote(symbol);
  if (!yahooSymbol || !googleSymbol) return null;

  return (
    <span className="ticker-links" aria-label={`${symbol} market links`}>
      {pair && <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap mr-2">{pair}</span>}
      <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}`} target="_blank" rel="noreferrer" aria-label={`Open ${symbol} on Yahoo`} title={`Open ${symbol} on Yahoo`}><span className="ticker-short">Y</span><span className="ticker-full">Yahoo</span></a>
      <a href={`https://www.google.com/finance/quote/${encodeURIComponent(googleSymbol)}`} target="_blank" rel="noreferrer" aria-label={`Open ${symbol} on Google`} title={`Open ${symbol} on Google`}><span className="ticker-short">G</span><span className="ticker-full">Google</span></a>
    </span>
  );
}
