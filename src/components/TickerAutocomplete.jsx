import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { searchMarketSymbols, isTseSymbol } from '../services/marketApi';

const TICKERS = [
  ['AAPL', 'Apple Inc.', 'Tech', 'USD'], ['AMZN', 'Amazon.com Inc.', 'Retail', 'USD'], ['GOOGL', 'Alphabet Inc.', 'Tech', 'USD'],
  ['META', 'Meta Platforms Inc.', 'Tech', 'USD'], ['MSFT', 'Microsoft Corp.', 'Tech', 'USD'], ['NVDA', 'NVIDIA Corp.', 'Semi', 'USD'],
  ['TSLA', 'Tesla Inc.', 'EV', 'USD'], ['AVGO', 'Broadcom Inc.', 'Semi', 'USD'], ['AMD', 'Advanced Micro Devices', 'Semi', 'USD'],
  ['NFLX', 'Netflix Inc.', 'Tech', 'USD'], ['VTI', 'Vanguard Total Stock Market ETF', 'ETF', 'USD'],
  ['VOO', 'Vanguard S&P 500 ETF', 'ETF', 'USD'], ['QQQ', 'Invesco QQQ Trust', 'ETF', 'USD'],
  ['SPY', 'SPDR S&P 500 ETF Trust', 'ETF', 'USD'], ['SCHD', 'Schwab U.S. Dividend Equity ETF', 'Dividend', 'USD'],
  ['O', 'Realty Income Corp', 'Dividend', 'USD'], ['KO', 'Coca-Cola Co.', 'Dividend', 'USD'],
  ['JPM', 'JPMorgan Chase & Co.', 'Other', 'USD'], ['XOM', 'Exxon Mobil Corp.', 'Other', 'USD'],
  ['BTC', 'Bitcoin (USD)', 'Crypto', 'USD'], ['ETH', 'Ethereum (USD)', 'Crypto', 'USD'],
  // Canadian / Toronto Stock Exchange (TSE / TSX)
  ['SHOP.TO', 'Shopify Inc.', 'Tech', 'CAD'], ['RY.TO', 'Royal Bank of Canada', 'Other', 'CAD'],
  ['TD.TO', 'Toronto-Dominion Bank', 'Other', 'CAD'], ['ENB.TO', 'Enbridge Inc.', 'Dividend', 'CAD'],
  ['CNR.TO', 'Canadian National Railway', 'Other', 'CAD'], ['BNS.TO', 'Bank of Nova Scotia', 'Dividend', 'CAD'],
  ['BMO.TO', 'Bank of Montreal', 'Dividend', 'CAD'], ['ATD.TO', 'Alimentation Couche-Tard Inc.', 'Retail', 'CAD'],
  ['XEQT.TO', 'iShares Core Equity ETF Portfolio', 'ETF', 'CAD'], ['VEQT.TO', 'Vanguard All-Equity ETF Portfolio', 'ETF', 'CAD'],
  ['VFV.TO', 'Vanguard S&P 500 Index ETF', 'ETF', 'CAD'], ['TEC.TO', 'TD Global Technology ETF', 'ETF', 'CAD'],
  ['VDY.TO', 'Vanguard FTSE Canadian High Dividend Yield ETF', 'Dividend', 'CAD'], ['XIU.TO', 'iShares S&P/TSX 60 Index ETF', 'ETF', 'CAD']
].map(([symbol, name, category, currency]) => ({ symbol, name, category, currency }));

export function TickerAutocomplete({ value, onChange, onSelect, placeholder = 'Search ticker or company...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const containerRef = useRef(null);
  const listId = useId();

  const localSuggestions = useMemo(() => {
    const raw = value.trim().toLowerCase();
    if (!raw) return [];
    const clean = raw.replace(/^(?:tse|tsx):/, '').replace(/:(?:tse|tsx)$/, '');
    return TICKERS.filter(item => {
      const sym = item.symbol.toLowerCase();
      const name = item.name.toLowerCase();
      return (
        `${sym} ${name}`.includes(raw) ||
        (clean && (sym.includes(clean) || name.includes(clean)))
      );
    }).slice(0, 8);
  }, [value]);

  useEffect(() => {
    const query = value.trim();
    if (!query) {
      setRemoteSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      searchMarketSymbols(query, controller.signal)
        .then(setRemoteSuggestions)
        .catch(error => {
          if (error.name !== 'AbortError') setRemoteSuggestions([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  const suggestions = useMemo(() => {
    const merged = [...remoteSuggestions, ...localSuggestions];
    return merged.filter((item, index, items) => items.findIndex(candidate => candidate.symbol === item.symbol) === index).slice(0, 8);
  }, [localSuggestions, remoteSuggestions]);

  useEffect(() => {
    const handleOutsideClick = event => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectSuggestion = suggestion => {
    const isCad = isTseSymbol(suggestion.symbol) || suggestion.currency === 'CAD';
    onSelect({
      ...suggestion,
      currency: isCad ? 'CAD' : (suggestion.currency || 'USD')
    });
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = event => {
    if (!isOpen || !suggestions.length) {
      if (event.key === 'ArrowDown' && value.trim()) setIsOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={event => {
          onChange(event.target.value.toUpperCase());
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-label="Ticker symbol"
        aria-activedescendant={isOpen && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listId}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white uppercase"
        required
      />
      {isOpen && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full mt-1 z-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {suggestions.map((suggestion, index) => (
            <li id={`${listId}-${index}`} key={suggestion.symbol} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className={`ticker-option w-full px-3 py-2 text-left transition flex items-center justify-between ${index === activeIndex ? 'bg-indigo-600/20' : ''}`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="font-bold text-white shrink-0">{suggestion.symbol}</span>
                  {(isTseSymbol(suggestion.symbol) || suggestion.currency === 'CAD') && (
                    <span className="inline-flex items-center whitespace-nowrap text-[9px] font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full shrink-0">TSE · CAD</span>
                  )}
                  <span className="text-xs text-slate-400 truncate">{suggestion.name}</span>
                </div>
                <span className="text-[10px] text-indigo-300 ml-2 shrink-0">{suggestion.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
