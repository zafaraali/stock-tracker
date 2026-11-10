/* global localStorage, document, innerWidth, getComputedStyle, console */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Offline verification' } }));
    await page.addInitScript(theme => {
      localStorage.setItem('st_pro_data_v2', JSON.stringify({
        mode: 'personal', theme, currency: 'USD',
        holdings: [{ id: 'large', symbol: 'TEST', name: 'Large value position', shares: 1000000, avgCost: 80, currentPrice: 100, currency: 'USD', category: 'Tech' }, ...Array.from({ length: 6 }, (_, index) => ({ id: `small-${index}`, symbol: `SMALL${index}`, name: 'Small position', shares: 1, avgCost: 8, currentPrice: 10, currency: 'USD', category: `Category ${index}` }))],
        transactions: [], watchlist: [], snapshots: [],
      }));
      localStorage.removeItem('apex-active-section');
    }, theme);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://127.0.0.1:5180/');
      await page.getByRole('heading', { name: 'Portfolio overview' }).waitFor();
      assert((await page.locator('.top-holdings').innerText()).replace(/\s/g, ' ').includes('+USD $20,000,000.00'), 'Top holdings gain differs from native cost basis');
      const hideSummary = page.getByRole('button', { name: 'Hide details', exact: true });
      await hideSummary.click();
      assert(!await page.locator('#summary-metrics').isVisible(), 'Summary does not collapse');
      assert(await page.locator('.summary-balance').isVisible(), 'Balance hidden with summary metrics');
      await page.getByRole('button', { name: 'Show details', exact: true }).click();
      const help = page.locator('.metric-help').first();
      await help.locator('summary').click();
      assert(await help.locator('p').isVisible(), 'Financial explanation unavailable');
      const assetLegend = page.getByLabel('Asset allocation percentages', { exact: true });
      assert(await assetLegend.locator('.chart-legend-row:visible').count() === 5, 'Legend is not compact');
      await page.getByRole('button', { name: 'Show all 7 assets', exact: true }).click();
      assert(await assetLegend.locator('.chart-legend-row:visible').count() === 7, 'Show all assets does not expand');
      await page.getByRole('button', { name: 'Show fewer assets', exact: true }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme}/${width}: horizontal overflow`);
      const centers = page.locator('.chart-donut-center');
      for (let i = 0; i < await centers.count(); i++) {
        assert(await centers.nth(i).evaluate(el => {
          const center = el.getBoundingClientRect();
          return [...el.children].every(child => { const r = child.getBoundingClientRect(); return r.left >= center.left && r.right <= center.right && r.top >= center.top && r.bottom <= center.bottom; });
        }), `${theme}/${width}: donut center overflow`);
      }
      const legend = page.locator('.chart-legend-row').first();
      await legend.focus();
      assert(await legend.getAttribute('aria-pressed') === 'true', 'Keyboard focus does not highlight chart legend');
      await legend.press('Escape');
      assert(await legend.getAttribute('aria-pressed') === 'false', 'Escape does not clear chart highlight');
      await legend.press('Enter');
      assert(await legend.getAttribute('aria-pressed') === 'true', 'Enter does not activate chart legend');
      if (width < 1024) {
        await page.getByRole('button', { name: 'Open navigation menu' }).click();
        await page.getByRole('dialog', { name: 'Mobile navigation' }).getByRole('link', { name: 'Holdings', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
        await page.reload();
        assert(await page.getByRole('button', { name: 'Hide controls', exact: true }).isVisible(), 'Desktop controls state not persisted');
        await page.getByRole('link', { name: 'Holdings', exact: true }).click();
      }
      await page.getByRole('heading', { name: 'Holdings', exact: true }).waitFor();
      const addPosition = page.getByRole('button', { name: 'Add holding', exact: true });
      await addPosition.hover();
      assert(await addPosition.evaluate(el => getComputedStyle(el).color === 'rgb(255, 255, 255)'), `${theme}/${width}: primary hover text contrast`);
      await page.getByLabel('Report actions').click();
      const print = page.getByRole('button', { name: 'Print report' });
      const bounds = await print.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, `${theme}/${width}: print menu offscreen`);
      await page.getByRole('heading', { name: 'Holdings', exact: true }).click();
      assert(!await print.isVisible(), 'Print menu remains open after outside click');
      await page.getByLabel('Report actions').click();
      await page.keyboard.press('Escape');
      assert(!await print.isVisible(), 'Print menu remains open after Escape');
      await page.getByLabel('Filter holdings', { exact: true }).fill('NO-MATCH');
      await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
      assert(await page.getByLabel('Filter holdings', { exact: true }).inputValue() === '');
      await page.emulateMedia({ media: 'print' });
      assert(await page.locator('.holdings-desktop-table').isVisible(), 'Print table hidden');
      assert(!await page.locator('.holdings-mobile-cards').isVisible(), 'Duplicate mobile cards in print');
      assert(await page.locator('.financial-table').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Print table clips columns');
      if (width === 390) await page.screenshot({ path: `test-results/ui-${theme}-print.png`, fullPage: true });
      await page.emulateMedia({ media: 'screen' });
      if (width === 390) {
        await page.screenshot({ path: `test-results/ui-${theme}-mobile.png`, fullPage: true });
      }
      console.log(`PASS ${theme} ${width}px: layout, drawer/controls, print menu, local filter`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
