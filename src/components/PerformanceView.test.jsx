import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerformanceView } from './PerformanceView';

it('offers setup guidance even after the initial empty snapshot is saved', () => {
  const html = renderToStaticMarkup(<PerformanceView performance={[{ date: '2026-01-01', periodReturn: 0 }]} transactions={[]} summary={{ items: [], totalValue: 0 }} rate={1} onManageHoldings={() => {}} />);
  expect(html).toContain('Add holdings to track performance');
  expect(html).toContain('Add holding');
  expect(html).not.toContain('Portfolio return');
});

it('offers an opening deposit when holdings exist but return tracking has not started', () => {
  const html = renderToStaticMarkup(<PerformanceView performance={[]} transactions={[]} summary={{ items: [{ symbol: 'AAPL' }], totalValue: 100 }} rate={1} onRecordDeposit={() => {}} />);
  expect(html).toContain('Record deposit');
  expect(html).toContain('starting snapshot');
});
