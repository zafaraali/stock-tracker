import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioInsights } from './PortfolioInsights';

const summary = { items: [{ id: 'one', symbol: 'TEST', totalCost: 100, gainLossPercent: 0, actualPercent: 100, targetPercent: 0 }], cashValue: 0, totalValue: 100, annualDividend: 0, portfolioYield: 0, categoryBreakdown: [], totalTargetPercent: 0 };

it('does not warn about allocation drift until targets are configured', () => {
  const html = renderToStaticMarkup(<PortfolioInsights summary={summary} />);
  expect(html).toContain('Allocation targets not configured');
  expect(html).not.toContain('Targets off by');
  expect(html).not.toContain('over its target');
});

it('still warns when configured targets do not total 100 percent', () => {
  const html = renderToStaticMarkup(<PortfolioInsights summary={{ ...summary, totalTargetPercent: 50, items: [{ ...summary.items[0], targetPercent: 50 }] }} />);
  expect(html).toContain('Targets off by 50.0%');
});
