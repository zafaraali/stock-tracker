import { BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

const topics = [
  ['Dashboard', 'The Dashboard summarizes your portfolio in the selected display currency. Review total value, cost basis, realized and unrealized gains, and recorded cash. Dashboard sections can be shown, hidden, or reordered from Settings → Appearance → Portfolio overview.'],
  ['Holdings', 'Holdings are the positions you currently own. Add a ticker, quantity, purchase price, and optional target allocation. Prices, notes, and targets can be updated from each holding. Yahoo Finance and Google Finance buttons open the relevant ticker or currency pair for independent research.'],
  ['Cash and transactions', 'Manage cash from Transactions by recording a deposit or withdrawal. Dividends, buys, sells, fees, and other cash movements can be recorded there as well. Recorded cash contributes to total portfolio value but stays separate from holding cost basis.'],
  ['Watchlist, dividends, and performance', 'Watchlist is for ideas you are monitoring without adding them to the portfolio. Dividends shows recorded income and estimated future income. Performance compares portfolio changes with contributions and market history when enough data is available.'],
  ['Currency and market data', 'The currency selector changes how values are displayed; it does not change underlying transactions or holdings. Refresh market data when you want the latest available prices. Historical estimates and stale prices are labeled so you can distinguish them from fresh data.'],
  ['Settings and backups', 'Settings controls theme, density, motion, visible tabs, named holdings lists, and data tools. Your data is stored locally in this browser. Export a JSON backup regularly, use CSV for spreadsheet workflows, and review imported or restored data before confirming it.'],
];

export function HelpView() {
  return (
    <div className="help-view space-y-6" aria-labelledby="help-introduction">
      <section className="help-hero rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="help-hero-icon rounded-xl bg-indigo-500/15 p-3 text-indigo-400" aria-hidden="true"><BookOpen className="h-6 w-6" /></div>
          <div><h2 id="help-introduction" className="text-xl font-semibold">How ApexFinance works</h2><p className="supporting-text mt-2">A practical guide to tracking holdings, cash, transactions, performance, and your saved portfolio data.</p></div>
        </div>
      </section>
      <div className="help-topic-grid">
        {topics.map(([title, body]) => <section key={title} className="help-topic rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><h2 className="text-base font-semibold">{title}</h2><p className="supporting-text mt-2">{body}</p></section>)}
      </div>
      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" /><div><h2 className="text-base font-semibold">Important data notes</h2><p className="supporting-text mt-2">ApexFinance is a personal tracking tool, not a brokerage or financial adviser. Market prices, exchange rates, dividend estimates, and historical comparisons may be delayed, estimated, or unavailable. Verify important figures with your broker or a trusted market-data source.</p></div></div></section>
      <p className="supporting-text flex flex-wrap items-center gap-2 text-sm">Need market context? Open <a className="inline-flex items-center gap-1 text-indigo-400 hover:underline" href="https://finance.yahoo.com/" target="_blank" rel="noopener noreferrer">Yahoo Finance <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a> or <a className="inline-flex items-center gap-1 text-indigo-400 hover:underline" href="https://www.google.com/finance/" target="_blank" rel="noopener noreferrer">Google Finance <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>.</p>
    </div>
  );
}
