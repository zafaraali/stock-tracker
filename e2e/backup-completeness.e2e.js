import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const accounts = [{ id: 'one', name: 'Long term', currency: 'USD' }, { id: 'two', name: 'Income', currency: 'USD' }];
const holdings = [{ id: 'h1', accountId: 'one', symbol: 'AAA', name: 'Alpha', shares: 2, avgCost: 100, currentPrice: 120, currency: 'USD', category: 'Tech', notes: 'Keep these notes', targetPercent: 60, dividendYield: 2 }, { id: 'h2', accountId: 'two', symbol: 'BBB', name: 'Beta', shares: 1, avgCost: 50, currentPrice: 60, currency: 'USD', category: 'Income', notes: 'Second list', targetPercent: 40 }];
const data = { holdings, transactions: [{ id: 'b1', accountId: 'one', holdingId: 'h1', symbol: 'AAA', type: 'BUY', date: '2026-01-01', shares: 2, price: 100, total: 200, currency: 'USD', cashImpact: false }, { id: 'b2', accountId: 'two', holdingId: 'h2', symbol: 'BBB', type: 'BUY', date: '2026-01-01', shares: 1, price: 50, total: 50, currency: 'USD', cashImpact: false }, { id: 'd1', accountId: 'one', type: 'DEPOSIT', date: '2026-01-01', total: 1000, currency: 'USD' }], accounts, selectedAccountId: 'one', watchlist: [{ id: 'w1', accountId: 'two', symbol: 'CCC', currentPrice: 75, currency: 'USD', targetBuyPrice: 70, notes: 'Watch me' }], snapshots: [{ date: '2026-01-01', valueUSD: 1250, netContributionsUSD: 1250 }], mode: 'personal', theme: 'dark', accent: 'blue', currency: 'USD', trash: [{ id: 'deleted', label: 'Deleted holding', holdings: [], transactions: [], watchlist: [] }] };

async function settings(page) {
  if (!await page.getByRole('button', { name: /^Open settings/ }).isVisible()) await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
  await page.getByRole('button', { name: /^Open settings/ }).click();
  await page.getByRole('button', { name: 'Data', exact: true }).click();
}

async function downloadBackup(page, testInfo, filename) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download complete JSON backup', exact: true }).click();
  const download = await event;
  const path = testInfo.outputPath(filename);
  await download.saveAs(path);
  return JSON.parse(await readFile(path, 'utf8'));
}

test('full backup restores all lists, records, trash and saved preferences', async ({ page }, testInfo) => {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/');
  await page.evaluate(value => {
    localStorage.setItem('st_pro_data_v2', JSON.stringify(value));
    localStorage.setItem('apex-view-density', JSON.stringify('compact'));
    localStorage.setItem('apex-hidden-tabs', JSON.stringify(['watchlist', 'rebalance']));
    localStorage.setItem('apex-holdings-page-size', '50');
    localStorage.setItem('apex-overview-layout', JSON.stringify({ order: ['cash', 'summary', 'charts', 'insights', 'holdings'], hidden: ['insights'] }));
  }, data);
  await page.reload();
  await settings(page);
  const backup = await downloadBackup(page, testInfo, 'before.json');
  expect(backup.holdings).toHaveLength(2);
  expect(backup.transactions).toHaveLength(3);
  expect(backup.accounts).toHaveLength(2);
  expect(backup.watchlist[0].notes).toBe('Watch me');
  expect(backup.trash).toEqual(data.trash);
  expect(backup.preferences['apex-view-density']).toBe('compact');
  expect(backup.preferences['apex-hidden-tabs']).toEqual(['watchlist', 'rebalance']);
  expect(backup.preferences['apex-overview-layout'].order[0]).toBe('cash');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('st_pro_data_v2', JSON.stringify({ holdings: [], transactions: [], watchlist: [], snapshots: [], mode: 'personal' }));
  });
  await page.reload();
  await settings(page);
  await page.locator('.recovery-tools > summary').click();
  await page.getByLabel('Choose JSON backup', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  const review = page.getByRole('dialog', { name: 'Review backup restore', exact: true });
  await review.getByRole('checkbox').check();
  await review.getByRole('button', { name: 'Replace portfolio', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/density-compact/);
  await expect(page.locator('.app-shell')).toHaveClass(/accent-blue/);
  await expect(page.locator('.desktop-section-links a[href="#/watchlist"]')).toHaveCount(0);
  await page.reload();
  await settings(page);
  const restored = await downloadBackup(page, testInfo, 'after.json');
  for (const key of ['holdings', 'transactions', 'accounts', 'watchlist', 'trash', 'historicalFx', 'fxData', 'currency', 'theme', 'accent', 'selectedAccountId']) expect(restored[key]).toEqual(backup[key]);
  for (const key of ['apex-view-density', 'apex-hidden-tabs', 'apex-holdings-page-size', 'apex-overview-layout']) expect(restored.preferences[key]).toEqual(backup.preferences[key]);
  expect(restored.snapshots).toEqual(expect.arrayContaining(backup.snapshots));
});

test('back to top appears after scrolling and returns to the top', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Back to top', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 700));
  const button = page.getByRole('button', { name: 'Back to top', exact: true });
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(button).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(button).toBeVisible();
  await page.reload();
  await expect(page.locator('#launch-screen')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
