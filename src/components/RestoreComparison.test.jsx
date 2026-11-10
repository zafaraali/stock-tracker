import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RestoreComparison } from './RestoreComparison';
import { PrivacyContext } from './OverviewControls';

const current = { holdings: [{ id: 'one', symbol: 'TEST', shares: 10 }] };
const incoming = { holdings: [{ id: 'one', symbol: 'TEST', shares: 15 }] };
it('shows concrete before and after values for replaced records', () => {
  const html = renderToStaticMarkup(<RestoreComparison current={current} incoming={incoming} />);
  expect(html.replace(/<[^>]*>/g, '')).toContain('Shares10 → 15');
});
it('keeps before and after values masked in privacy mode', () => {
  const html = renderToStaticMarkup(<PrivacyContext.Provider value><RestoreComparison current={current} incoming={incoming} /></PrivacyContext.Provider>);
  expect(html).toContain('•••• → ••••'); expect(html).not.toContain('15');
});
