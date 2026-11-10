import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Money } from './Money';
import { PrivacyContext } from './OverviewControls';
import { dataQualityIssues } from './DataQuality';
import { changeSinceSnapshot } from './WhatChanged';
import { backupIsDue } from '../services/backupReminder';

it('removes monetary values from private-mode rendered content', () => {
  const html = renderToStaticMarkup(<PrivacyContext.Provider value><Money amount="USD $123,456.00" /></PrivacyContext.Provider>);
  expect(html).not.toContain('123,456');
  expect(html).toContain('Amount hidden');
});
it('finds incomplete cost, currency, and price data without changing records', () => {
  const holdings = [{ id: 'one', symbol: 'TEST', avgCost: 0 }];
  expect(dataQualityIssues(holdings)[0].issues).toHaveLength(3);
  expect(holdings[0]).not.toHaveProperty('currency');
});
it('separates external flows from portfolio value change', () => {
  const result = changeSinceSnapshot({ snapshots: [{ date: '2026-01-01', valueUSD: 100, netContributionsUSD: 100 }], transactions: [{ type: 'DEPOSIT', date: '2026-01-02', currency: 'USD', total: 50 }], holdings: [], summary: { totalValue: 160 }, rate: 1, historicalFx: {}, netContributionsUSD: 150, today: '2026-01-02' });
  expect(result).toMatchObject({ valueChange: 60, deposits: 50, withdrawals: 0, netFlows: 50, otherChange: 10 });
});
it('does not compare against a snapshot from the current day', () => {
  expect(changeSinceSnapshot({ snapshots: [{ date: '2026-01-02', valueUSD: 100, netContributionsUSD: 100 }], today: '2026-01-02', rate: 1 })).toBeNull();
});
it('keeps reminders off unless explicitly enabled', () => {
  expect(backupIsDue(0, null)).toBe(false);
  expect(backupIsDue(7, null)).toBe(true);
  expect(backupIsDue(7, { at: 100 }, 101)).toBe(false);
});
