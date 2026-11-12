import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).first().click();
});

test('overview dismissals last only for the local day, independently', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 12, 23, 59, 50) });
  await page.getByRole('button', { name: 'Dismiss Customize overview for today', exact: true }).click();
  await expect(page.getByText('Customize overview', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dismiss Data quality for today', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss Data quality for today', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss What changed for today', exact: true }).click();
  await page.reload();
  await expect(page.locator('.daily-dismissible')).toHaveCount(0);
  await page.clock.fastForward(11000);
  await expect(page.locator('.daily-dismissible')).toHaveCount(3);
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
