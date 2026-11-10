import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CashPanel } from './PortfolioTools';

const summary = { cashValue: 0, cashBalances: {} };
it('does not present unrecorded cash as a confirmed zero balance', () => {
  const html = renderToStaticMarkup(<CashPanel summary={summary} currencyCode="CAD" onRecord={() => {}} />);
  expect(html).toContain('Not recorded');
  expect(html).toContain('Set opening balance');
  expect(html).not.toContain('CAD $0.00');
});
it('shows zero when the ledger contains cash records with a zero balance', () => {
  const html = renderToStaticMarkup(<CashPanel summary={summary} currencyCode="CAD" hasCashRecords onRecord={() => {}} />);
  expect(html).toContain('CAD $0.00');
  expect(html).toContain('Recorded cash balance is zero.');
  expect(html).not.toContain('Set opening balance');
});
