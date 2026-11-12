import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).first().click();
});

test('overview tools stay available without close icons', async ({ page }) => {
  for (const label of ['Customize overview', 'Data quality', 'What changed?']) await expect(page.locator('.overview-tools summary').filter({ hasText: label })).toBeVisible();
  await expect(page.locator('.overview-tools .daily-dismiss-button')).toHaveCount(0);
  await expect(page.locator('.overview-tools button[aria-label^="Dismiss"]')).toHaveCount(0);
});

test('green is first and default, and compact view persists and reduces page height', async ({ page }) => {
  await expect(page.locator('.app-shell')).toHaveClass(/accent-green/);
  const originalHeight = await page.locator('main').evaluate(element => element.scrollHeight);
  if (!await page.getByRole('button', { name: /^Open settings/ }).isVisible()) await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
  await page.getByRole('button', { name: /^Open settings/ }).click();
  const accent = page.getByRole('combobox', { name: 'Accent color' });
  await expect(accent).toHaveValue('green');
  await expect(accent.locator('option').first()).toHaveText('Green (default)');
  await page.getByRole('combobox', { name: 'View density' }).selectOption('compact');
  await expect(page.locator('.app-shell')).toHaveClass(/density-compact/);
  await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();
  expect(await page.locator('main').evaluate(element => element.scrollHeight)).toBeLessThan(originalHeight);
  await page.reload();
  await expect(page.locator('.app-shell')).toHaveClass(/density-compact/);
  if (!await page.getByRole('button', { name: /^Open settings/ }).isVisible()) await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
  await page.getByRole('button', { name: /^Open settings/ }).click();
  await page.getByRole('combobox', { name: 'View density' }).selectOption('default');
  await expect(page.locator('.app-shell')).toHaveClass(/density-default/);
});

test('launch screen fades after startup and footer credits Zafar Ali', async ({ page }) => {
  await expect(page.locator('#launch-screen')).toHaveCount(0);
  await expect(page.locator('footer')).toContainText('Zafar Ali');
  await expect(page.getByRole('navigation', { name: 'Finance resources', exact: true }).getByRole('link')).toHaveCount(5);
  await page.getByRole('button', { name: 'Hide controls', exact: true }).click();
  await expect(page.locator('#desktop-portfolio-controls')).toBeHidden();
  await page.reload();
  await expect(page.locator('#desktop-portfolio-controls')).toBeVisible();
});

test('dashboard closes individual cards until reload and protects portfolio summary', async ({ page }) => {
  const close = name => page.getByRole('button', { name: `Close ${name} until reload`, exact: true });
  await expect(close('Portfolio summary')).toHaveCount(0);
  await close('Asset Allocation').click();
  await expect(page.getByRole('heading', { name: 'Asset Allocation', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sector Breakdown', exact: true })).toBeVisible();
  for (const name of ['Available cash', 'Sector Breakdown', 'Portfolio insights', 'Top holdings']) await close(name).click();
  await expect(page.locator('#portfolio-summary')).toBeVisible();
  await page.getByRole('link', { name: 'Holdings', exact: true }).click();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(close('Available cash')).toHaveCount(0);
  await page.reload();
  for (const name of ['Available cash', 'Asset Allocation', 'Sector Breakdown', 'Portfolio insights', 'Top holdings']) await expect(close(name)).toBeVisible();
});

test('new portfolios default to dark mode and launch animation holds an extra second', async ({ page }) => {
  await expect(page.locator('.app-shell')).not.toHaveClass(/theme-light/);
  await expect(page.locator('#launch-screen')).toBeVisible();
  await expect(page.locator('#launch-screen')).toHaveCount(0, { timeout: 3000 });
});

test('mobile header keeps visibility beside logo and refresh in drawer', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator('#launch-screen')).toHaveCount(0);
  await expect(page.locator('.navbar-mobile-refresh')).toHaveCount(0);
  await expect(page.locator('.navbar-current')).toHaveCount(0);
  const brand = await page.getByRole('button', { name: 'Go to dashboard', exact: true }).boundingBox();
  const visibility = await page.getByRole('button', { name: 'Hide balances', exact: true }).boundingBox();
  const drawer = await page.getByRole('button', { name: 'Open navigation menu', exact: true }).boundingBox();
  expect(visibility.x - (brand.x + brand.width)).toBeLessThan(16);
  expect(Math.abs(drawer.y - visibility.y)).toBeLessThan(8);
  expect(await page.locator('body').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  const refresh = page.locator('#mobile-navigation-drawer').getByRole('button', { name: 'Refresh live market prices', exact: true });
  await expect(refresh).toBeEnabled();
  await Promise.all([page.waitForRequest(request => request.url().includes('/api/market-quote')), refresh.click()]);
  await page.locator('#mobile-navigation-drawer').getByRole('button', { name: 'Close navigation menu', exact: true }).click();
  const defaultHeight = await page.locator('main').evaluate(element => element.scrollHeight);
  await page.evaluate(() => localStorage.setItem('apex-view-density', JSON.stringify('compact')));
  await page.reload();
  await expect(page.locator('.app-shell')).toHaveClass(/density-compact/);
  expect(await page.locator('main').evaluate(element => element.scrollHeight)).toBeLessThan(defaultHeight);
});

test('optional navigation tabs can be hidden and restored across desktop and mobile', async ({ page }) => {
  await page.getByRole('link', { name: 'Watchlist', exact: true }).click();
  if (!await page.getByRole('button', { name: /^Open settings/ }).isVisible()) await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
  await page.getByRole('button', { name: /^Open settings/ }).click();
  for (const name of ['Dashboard', 'Holdings']) {
    await expect(page.getByRole('checkbox', { name: `Show ${name} tab` })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: `Show ${name} tab` })).toBeDisabled();
  }
  for (const name of ['Transactions', 'Watchlist', 'Dividends', 'Performance', 'Rebalance']) await page.getByRole('checkbox', { name: `Show ${name} tab`, exact: true }).uncheck();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();
  await expect(page.locator('.desktop-section-links a')).toHaveCount(2);
  const tabs = await page.locator('.desktop-section-links').boundingBox();
  const visibility = await page.getByRole('button', { name: 'Hide balances', exact: true }).boundingBox();
  expect(tabs.x - (visibility.x + visibility.width)).toBeLessThanOrEqual(20);
  await page.reload();
  await expect(page.locator('.desktop-section-links a')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  await expect(page.locator('#mobile-navigation-drawer a[href^="#/"]')).toHaveCount(2);
  await page.getByRole('button', { name: /^Open settings/ }).click();
  await page.getByRole('checkbox', { name: 'Show Watchlist tab', exact: true }).check();
  await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Watchlist', exact: true })).toBeVisible();
});
