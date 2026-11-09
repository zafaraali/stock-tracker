# ApexFinance Pro Manual Portfolio & Rebalancing Suite

A comprehensive, fully offline-ready React + Vite stock tracking, dividend, and portfolio rebalancing suite styled with Tailwind CSS.

## Pro Features Included:

- **Manual Price Entry & Inline Editing**: Instant price updates whenever you check Google Finance.
- **Sector Breakdown & Dashboards**: Visual allocation charts across Tech, Crypto, Dividend, and ETFs.
- **Dividend & Yield Tracker**: Estimated annual passive income calculation.
- **Investment Journal / Notes**: Record your thesis or strategy per holding.
- **Target Allocation & Rebalancing Calculator**: Define target percentages and get precise BUY/SELL share recommendations.
- **Transaction History Audit Trail**: Chronological trade ledger for tracking execution prices and costs.
- **Multi-Currency & TSE / Canadian Market Support**: Native support for Toronto Stock Exchange (TSE/TSX) securities in CAD (`.TO`, `.V`, `TSE:`, `TSX:`), alongside USD, EUR, GBP, CAD, and JPY portfolio display conversions + JSON/CSV backup tools.
- **Live Market Refresh**: Current prices refresh on launch, from the refresh button, and every five minutes using ticker-only requests to Yahoo Finance. Preserves native currency (CAD for TSE, USD for US markets) and provides saved/manual prices as a fallback.
- **Validation & Tests**: Backup schema validation, resilient local storage loading, ESLint, and portfolio calculation tests.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Run checks**:
   ```bash
   npm run lint
   npm test
   ```

 The development server proxies `/api/market-quote/*` and `/api/market-search` to Yahoo Finance to avoid browser CORS restrictions. Production hosting must provide the same proxies, or set `VITE_MARKET_API_URL` and `VITE_MARKET_SEARCH_URL` to same-origin market-data routes.

## Deploy to Cloudflare Workers

The repository includes `wrangler.jsonc` for deploying the Vite output as Cloudflare Workers Static Assets. Run:

```bash
npm run build
npx wrangler deploy
```

The `not_found_handling` setting preserves client-side routes by serving the SPA entry point for unknown paths.

## Data reliability and exchange rates

- All trade changes, including edits and deletions of earlier buys, validate the resulting ledger before applying changes. A sale cannot exceed the shares available on its date.
- Portfolio data saves as one browser-storage record (`st_pro_data_v2`) to keep holdings and transactions together. Existing saved data migrates automatically. Unreadable data is preserved and automatic portfolio saving pauses until you restore a validated backup or choose to replace it with the recovered portfolio. Storage failures display an export-backup reminder.
- JSON restores validate financial values, dates, unique IDs, and holding references, then show a preview before replacing the current portfolio.
- Current portfolio prices use dated daily exchange rates from [Frankfurter](https://frankfurter.dev/). Transaction proceeds, dividends, and cost basis use historical transaction-date rates, using the preceding published rate for weekends and holidays. Realized gains include currency movements. Display currency conversions use the current reference rate. These are portfolio estimates, not jurisdiction-specific tax calculations.
- Exchange rates are cached locally. Offline or unavailable historical rates fall back to explicitly labeled estimates. JSON exports include the cached exchange-rate data. Requests to Frankfurter contain currencies and dates only.
- Each asset shows its price source and market/manual timestamp. Failed refreshes preserve prices and mark them as saved. Charts and secondary views load on demand.
