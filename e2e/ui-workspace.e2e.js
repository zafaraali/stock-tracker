import { test, expect } from '@playwright/test';

const holdings = Array.from({ length: 25 }, (_, index) => ({
  id: `holding-${index}`, symbol: `TEST${String(index).padStart(2, '0')}`,
  name: 'International diversified investment company with a very long holding name',
  shares: 1000000, avgCost: 100, currentPrice: 1234567.89, currency: 'USD',
  dividendYield: 3, targetPercent: 4, category: 'International investments', notes: 'LongUnbrokenNote'.repeat(20),
}));

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.addInitScript(data => localStorage.setItem('st_pro_data_v2', JSON.stringify(data)), {
    holdings, transactions: [{ id: 'dividend-1', holdingId: 'holding-0', symbol: 'TEST00', type: 'DIVIDEND', total: 1234567.89, date: '2026-01-01', currency: 'USD', cashImpact: false }], watchlist: [{ id: 'idea-1', symbol: 'IDEA', name: 'An international company with a very long company name', currentPrice: 1234567.89, targetBuyPrice: 1000000, currency: 'USD', category: 'International investments', notes: 'LongUnbrokenWatchlistNote'.repeat(15) }], snapshots: [], mode: 'personal', currency: 'USD', theme: 'dark',
  });
  await page.goto('/holdings');
});

test('More stays aligned and supports keyboard opening and dismissal', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop disclosure');
  const more = page.locator('.desktop-controls-toggle');
  const closed = await more.boundingBox();
  await more.focus();
  await page.keyboard.press('m');
  await expect(page.locator('#desktop-portfolio-controls')).toBeVisible();
  const open = await more.boundingBox();
  expect(Math.abs(closed.x + closed.width - open.x - open.width)).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('combobox', { name: 'Display currency' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
});

test('drawer fills the viewport after scrolling, rotates, traps focus and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const drawer = page.locator('#mobile-navigation-drawer');
  await expect(drawer).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await expect(drawer).toHaveCSS('transform', 'none');
  await expect(drawer.getByRole('link').first()).toHaveCSS('animation-name', 'none');
  await expect(drawer.getByLabel('Show keyboard shortcuts')).toHaveCount(0);
  const bounds = await drawer.boundingBox();
  expect(Math.abs(bounds.y)).toBeLessThan(1);
  const viewportHeight = await page.evaluate(() => {
    const probe = document.createElement('div'); probe.style.height = '100dvh'; document.body.appendChild(probe);
    const height = probe.getBoundingClientRect().height; probe.remove(); return height;
  });
  expect(Math.abs(bounds.height - viewportHeight)).toBeLessThan(1);
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await drawer.getByRole('button', { name: /Open settings/ }).scrollIntoViewIfNeeded();
  await expect(drawer.getByRole('button', { name: /Open settings/ })).toBeVisible();
  await drawer.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await expect(page).toHaveURL(/dashboard/);
});

test('inspector and context menu preserve row keyboard navigation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop keyboard workspace');
  const first = page.locator('tr[data-holding-id="holding-0"]');
  await first.locator('td').nth(1).click();
  await expect(page.locator('.holding-inspector h2')).toHaveText('TEST00');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.holding-inspector h2')).toHaveText('TEST01');
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('tr[data-holding-id="holding-1"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.holding-inspector')).toHaveCount(0);
});

test('large balances and enlarged text fit narrow screens in every main view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const section of ['dashboard', 'holdings', 'history', 'watchlist', 'dividends', 'performance', 'rebalance', 'help']) {
      await page.goto(`/${section}`);
      await page.locator('main').waitFor();
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { message: `${section} fits at ${width}px with enlarged text` }).toBe(true);
    }
  }
});


test('populated mobile tables fit without internal horizontal scrolling', async ({ page }) => {
  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 844 });
    for (const section of ['history', 'watchlist', 'dividends', 'rebalance']) {
      await page.goto('/' + section);
      await expect(page.locator('.responsive-table tbody tr').first()).toBeVisible();
      await expect.poll(() => page.locator('main .overflow-x-auto').evaluateAll(elements => elements.filter(el => el.getClientRects().length).every(el => el.scrollWidth <= el.clientWidth + 1)), { message: section + ' table fits at ' + width }).toBe(true);
    }
  }
});
