import { test, expect } from '@playwright/test';

const holding = { id: 'test-position', symbol: 'TEST', name: 'Test asset', shares: 0, avgCost: 0, currentPrice: 100, currency: 'USD', targetPercent: 100 };
const personal = { holdings: [holding], transactions: [], watchlist: [], snapshots: [], mode: 'personal', currency: 'USD', theme: 'dark' };
test.beforeEach(async ({ page }) => {
  await page.route('**/api/market-quote**', route => route.fulfill({ json: { chart: { result: [{ meta: { regularMarketPrice: 100, regularMarketTime: Date.now() / 1000, currency: 'USD' } }] } } }));
  await page.route('**/api/market-search**', route => route.fulfill({ json: { quotes: [] } }));
  await page.route('**/api/market-fundamentals**', route => route.fulfill({ json: { quoteResponse: { result: [{ regularMarketPrice: 100, trailingAnnualDividendRate: 0 }] } } }));
  await page.route('**/api/fx-rates**', route => route.fulfill({ json: ['EUR', 'GBP', 'CAD', 'JPY'].map(quote => ({ date: '2026-11-06', quote, rate: 1 })) }));
});

async function seed(page, data = personal) {
  await page.addInitScript(value => { localStorage.setItem('st_pro_data_v2', JSON.stringify(value)); }, data);
  await page.goto('/');
}

async function saveEntry(page, type, values) {
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('combobox', { name: 'Type', exact: true }).selectOption(type);
  for (const [label, value] of Object.entries(values)) await modal.getByLabel(label, { exact: true }).fill(value);
  await modal.getByRole('button', { name: 'Save transaction' }).click();
  await expect(modal).not.toBeVisible();
}

test('first run offers empty and labeled demo portfolios; demo can be cleared', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start empty', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Explore demo' }).click();
  await expect(page.getByText('Demo portfolio', { exact: true })).toBeVisible();
  await expect(page.getByText('Apple Inc.', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Demo portfolio', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear all data', exact: true }).click();
  await expect(page.getByText('Demo portfolio', { exact: true })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Available cash' })).toBeVisible();
  await expect(page.getByText('Apple Inc.', { exact: true })).not.toBeVisible();
});

test('cash, fees, splits, sale validation, and deletion undo work together', async ({ page }) => {
  // Seed once, then remove the init script before reload so undo persistence is tested.
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('st_pro_data_v2', JSON.stringify(value)), personal);
  await page.reload();
  await page.getByRole('button', { name: 'Record deposit' }).click();
  await page.getByRole('dialog').getByLabel('Amount (USD)', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.locator('[aria-labelledby="cash-title"]')).toContainText('$1,000.00');
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Investment gain since tracking began:')).toContainText('$0.00');
  await page.getByRole('button', { name: 'Transactions', exact: true }).click();
  await saveEntry(page, 'BUY', { Shares: '2', 'Price (USD)': '100', 'Commission / fees (USD)': '5' });
  await expect(page.locator('[aria-labelledby="cash-title"]')).toContainText('$795.00');
  await saveEntry(page, 'SPLIT', { 'New shares per old share': '2' });
  await saveEntry(page, 'SELL', { Shares: '1', 'Price (USD)': '60', 'Commission / fees (USD)': '1' });
  await expect(page.locator('[aria-labelledby="cash-title"]')).toContainText('$854.00');
  await page.getByRole('button', { name: 'Delete DEPOSIT transaction' }).click();
  await expect(page.getByRole('alert')).toContainText('Insufficient USD cash');
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await page.getByRole('button', { name: 'Delete SELL transaction' }).click();
  await expect(page.locator('[aria-labelledby="cash-title"]')).toContainText('$795.00');
  await page.reload();
  await page.getByText('Recently deleted (1)', { exact: false }).click();
  await page.getByRole('button', { name: 'Undo Transaction', exact: true }).click();
  await expect(page.locator('[aria-labelledby="cash-title"]')).toContainText('$854.00');
  await page.getByRole('button', { name: 'Holdings', exact: true }).click();
  await expect(page.locator('td[data-label="Shares"]')).toHaveText('3');
});

test('dialogs trap keyboard focus, close with Escape, and restore the trigger', async ({ page }) => {
  await seed(page);
  const trigger = page.getByRole('button', { name: 'Open settings' });
  await trigger.click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Delete all saved data' }).focus();
  await page.keyboard.press('Tab');
  await expect(modal.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const width of [320, 390]) {
  test(`mobile ${width}px supports light mode and all views without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await seed(page, { ...personal, holdings: [{ ...holding, shares: 10, avgCost: 100 }], transactions: [{ id: 'buy', holdingId: holding.id, symbol: 'TEST', type: 'BUY', date: '2026-01-01', shares: 10, price: 100, total: 1000 }], watchlist: [{ id: 'watch', symbol: 'TEST', name: 'Test asset', currentPrice: 100, targetBuyPrice: 90 }] });
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    for (const name of ['Holdings', 'Watchlist', 'Rebalance', 'History', 'Dashboard']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByText('Loading view...')).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    await expect(page.locator('.recharts-pie-sector')).toHaveCount(2);
    await expect(page.getByText('Starting value + net contributions', { exact: false }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/mobile-${width}-light.png`, fullPage: true });
    await page.getByRole('button', { name: 'Record withdrawal' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Amount (USD)', { exact: true }).fill('10');
    await page.getByRole('button', { name: 'Save transaction' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Insufficient USD cash');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}
