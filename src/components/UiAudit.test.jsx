import { it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HistoryView } from './HistoryView';
import { PortfolioCharts } from './PortfolioCharts';

it('shows a transaction amount once when display and native currencies match', () => {
  const html = renderToStaticMarkup(<HistoryView transactions={[{ id: 'd', date: '2026-01-01', type: 'DEPOSIT', total: 5000, currency: 'USD' }]} holdings={[]} currencyCode="USD" rate={1} historicalFx={{}} />);
  const amountCell = html.match(/<td data-label="Amount"[^>]*>(.*?)<\/td>/)[1];
  expect((amountCell.match(/class="money"/g) || [])).toHaveLength(1);
});
it('preserves the native amount when a transaction is converted for display', () => {
  const html = renderToStaticMarkup(<HistoryView transactions={[{ id: 'd', date: '2026-01-01', type: 'DEPOSIT', total: 5000, currency: 'CAD', fxRate: 1.4 }]} holdings={[]} currencyCode="USD" rate={1} historicalFx={{}} />);
  const amountCell = html.match(/<td data-label="Amount"[^>]*>(.*?)<\/td>/)[1];
  expect((amountCell.match(/class="money"/g) || [])).toHaveLength(2);
  expect(amountCell).toContain('CAD'); expect(amountCell).toContain('USD');
});
it('labels a cash-inclusive sector breakdown as portfolio allocation', () => {
  const summary = { items: [], cashValue: 500, categoryBreakdown: [{ name: 'Cash', value: 500 }] };
  const html = renderToStaticMarkup(<PortfolioCharts summary={summary} theme="light" showPerformanceChart={false} />);
  expect(html).not.toContain('of holdings');
  expect(html).toContain('of portfolio');
  expect(html).not.toContain('Largest sector:');
});
