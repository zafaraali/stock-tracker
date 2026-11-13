import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CashPanel } from './PortfolioTools';

const summary = { cashValue: 0, cashBalances: {} };
it('does not present unrecorded cash as a confirmed zero balance', () => {
  const html = renderToStaticMarkup(<CashPanel summary={summary} currencyCode="CAD" onRecord={() => {}} />);
  expect(html).toContain('Not recorded');
  expect(html).toContain('Set opening balance');
  expect(html).not.toContain('CAD $0.00');
  expect(html).toContain('disabled=""');
  expect(html).toContain('Record an opening balance before withdrawing cash.');
});
it('shows FX links and a transaction shortcut for recorded cash', () => {
  const html = renderToStaticMarkup(<CashPanel summary={{ cashValue: 22.75, cashBalances: { CAD: 22.75 } }} currencyCode="CAD" hasCashRecords onRecord={() => {}} onViewTransactions={() => {}} />);
  expect(html).toContain('CAD/USD');
  expect(html).toContain('finance.yahoo.com/quote/CADUSD%3DX');
  expect(html).toContain('google.com/finance/quote/CAD-USD');
  expect(html).toContain('View transactions');
  expect(html).toContain('ticker-full');
  expect(html).toContain('ticker-short');
});
it('shows zero when the ledger contains cash records with a zero balance', () => {
  const html = renderToStaticMarkup(<CashPanel summary={summary} currencyCode="CAD" hasCashRecords onRecord={() => {}} />);
  expect(html.replace(/<[^>]*>/g, '')).toContain('CAD $0.00');
  expect(html).toContain('Recorded cash balance is zero.');
  expect(html).not.toContain('Set opening balance');
  expect(html).not.toContain('disabled=""');
});
