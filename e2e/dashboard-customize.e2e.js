import { test, expect } from '@playwright/test';

test('dashboard cards retain their dragged order and pie details stay clear of charts', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).first().click();
  await page.getByText('Customize overview', { exact: true }).click();
  const cards = page.locator('.overview-order-card');
  await cards.filter({ hasText: 'Portfolio summary' }).dragTo(cards.filter({ hasText: 'Allocation charts' }));
  await expect(cards.nth(2)).toContainText('Portfolio summary');
  await page.reload();
  await page.getByText('Customize overview', { exact: true }).click();
  await expect(cards.nth(2)).toContainText('Portfolio summary');
  for (const card of await page.locator('.chart-card').filter({ has: page.locator('.chart-donut-wrap') }).all()) {
    await expect(card.locator('.chart-detail-slot')).toBeHidden();
    await card.locator('.chart-legend-row').first().hover();
    const donut = await card.locator('.chart-donut-wrap').boundingBox();
    const detail = await card.locator('.chart-hover-card').boundingBox();
    expect(detail.y).toBeGreaterThanOrEqual(donut.y + donut.height);
  }
});
