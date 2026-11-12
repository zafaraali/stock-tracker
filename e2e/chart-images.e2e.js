import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const now = Math.floor(Date.now() / 1000);
    return route.fulfill({ json: route.request().url().includes('range=10y') ? { chart: { result: [{ timestamp: [now - 86400 * 730, now - 86400 * 365, now - 86400], indicators: { quote: [{ close: [100, 115, 130] }] } }] } } : {} });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).first().click();
  await expect(page.locator('#launch-screen')).toHaveCount(0);
});

async function saveImage(page, label, filename, testInfo) {
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: `Save ${label} as image`, exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(filename);
  const path = testInfo.outputPath(filename);
  await download.saveAs(path);
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.length).toBeGreaterThan(5000);
}

test('allocation charts download PNGs, align icons and keep cash content clear', async ({ page }, testInfo) => {
  for (const [label, filename] of [['Asset Allocation', 'apexfinance-asset-allocation.png'], ['Sector Breakdown', 'apexfinance-sector-breakdown.png']]) await saveImage(page, label, filename, testInfo);
  for (const density of ['default', 'compact']) {
    await page.evaluate(value => localStorage.setItem('apex-view-density', JSON.stringify(value)), density);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    for (const label of ['Asset Allocation', 'Sector Breakdown']) {
      const save = await page.getByRole('button', { name: `Save ${label} as image`, exact: true }).boundingBox();
      const close = await page.getByRole('button', { name: `Close ${label} until reload`, exact: true }).boundingBox();
      expect(save.y).toBeCloseTo(close.y, 0);
      expect(close.x - (save.x + save.width)).toBeGreaterThanOrEqual(8);
    }
    const cash = page.locator('[aria-labelledby="cash-title"]');
    const close = await cash.getByRole('button', { name: 'Close Available cash until reload' }).boundingBox();
    for (const child of await cash.locator(':scope > div').all()) {
      const bounds = await child.boundingBox();
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(close.x);
    }
  }
});

test('image exports respect hidden monetary amounts', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Hide balances', exact: true }).click();
  await page.evaluate(() => {
    window.exportText = [];
    const original = window.CanvasRenderingContext2D.prototype.fillText;
    window.CanvasRenderingContext2D.prototype.fillText = function (...args) { window.exportText.push(args[0]); return original.apply(this, args); };
  });
  await saveImage(page, 'Asset Allocation', 'apexfinance-asset-allocation.png', testInfo);
  const text = await page.evaluate(() => window.exportText);
  expect(text.some(value => value.includes('Amount hidden'))).toBe(true);
  expect(text.some(value => value.includes('$'))).toBe(false);
});

test('performance image includes the selected range', async ({ page }, testInfo) => {
  await page.getByRole('link', { name: 'Performance', exact: true }).click();
  const save = page.getByRole('button', { name: 'Save Performance graph as image', exact: true });
  await expect(save).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: '3Y', exact: true }).click();
  await saveImage(page, 'Performance graph', 'apexfinance-performance-3y.png', testInfo);
});

test('compact donut centre labels fit inside the hole on desktop and phone', async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem('apex-view-density', JSON.stringify('compact')));
  await page.reload();
  await expect(page.locator('#launch-screen')).toHaveCount(0);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const wrap of await page.locator('.chart-donut-wrap').all()) {
      const circle = await wrap.boundingBox();
      const radius = Math.min(circle.width, circle.height) * .72 / 2;
      for (const label of await wrap.locator('.chart-donut-center > span, .chart-donut-center > strong').all()) {
        const box = await label.boundingBox();
        const centerX = circle.x + circle.width / 2;
        const centerY = circle.y + circle.height / 2;
        for (const x of [box.x, box.x + box.width]) for (const y of [box.y, box.y + box.height]) expect(Math.hypot(x - centerX, y - centerY)).toBeLessThan(radius - 2);
      }
    }
    await page.locator('.chart-card').first().screenshot({ path: testInfo.outputPath(`compact-donut-${width}.png`) });
  }
});

test('accent changes update favicon, controls and performance chart in light and dark mode', async ({ page }) => {
  await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
  await page.getByRole('button', { name: /^Open settings/ }).click();
  for (const [accent, color] of [['red', '#8f3f4b'], ['blue', '#345f83']]) {
    await page.getByRole('combobox', { name: 'Accent color', exact: true }).selectOption(accent);
    const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(decodeURIComponent(favicon)).toContain(`fill="${color}"`);
    const expected = await page.locator('.brand-logo').evaluate(element => window.getComputedStyle(element).backgroundColor);
    expect(await page.locator('.skip-link').evaluate(element => window.getComputedStyle(element).backgroundColor)).toBe(expected);
    expect(await page.getByRole('checkbox', { name: 'Show Watchlist tab' }).evaluate(element => window.getComputedStyle(element).accentColor)).toBe(expected);
    if (accent === 'red') await page.getByRole('dialog').getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  }
  await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();
  await page.getByRole('link', { name: 'Performance', exact: true }).click();
  await expect(page.locator('.recharts-area-curve').first()).toBeVisible();
  const accent = await page.locator('.brand-accent').evaluate(element => window.getComputedStyle(element).color);
  expect(await page.locator('.recharts-area-curve').first().evaluate(element => window.getComputedStyle(element).stroke)).toBe(accent);
  await page.reload();
  await expect.poll(async () => decodeURIComponent(await page.locator('link[rel="icon"]').getAttribute('href'))).toContain('fill="#345f83"');
});
