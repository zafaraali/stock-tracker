import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioInsights } from './PortfolioInsights';

it('uses actual return signs and colors even when every holding is losing', () => {
  const html = renderToStaticMarkup(<PortfolioInsights summary={{ items: [{ id: 'loss', symbol: 'LOSS', gainLossPercent: -12.5 }], totalValue: 100, cashValue: 0, cashAllocation: 0, categoryBreakdown: [], totalTargetPercent: 100 }} />);
  expect(html).toContain('class="text-rose-400">-12.5%');
  expect(html).not.toContain('+-');
});

it('renders flat returns neutrally without a plus sign', () => {
  const html = renderToStaticMarkup(<PortfolioInsights summary={{ items: [{ id: 'flat', symbol: 'FLAT', gainLossPercent: 0 }], totalValue: 100, cashValue: 0, cashAllocation: 0, categoryBreakdown: [], totalTargetPercent: 100 }} />);
  expect(html).toContain('class="text-slate-400">0.0%');
  expect(html).not.toContain('+0.0%');
});
