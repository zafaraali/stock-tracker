/* global localStorage, document, innerWidth, getComputedStyle, requestAnimationFrame */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:5180';
const output = 'test-results/ui-audit';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const findings = [];
try {
  for (const theme of ['dark', 'light']) for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 640, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => findings.push({ theme, width, error: error.message }));
    await page.route('**/api/**', route => {
      const url = route.request().url();
      if (url.includes('/market-quote/')) {
        const canadian = url.includes('BBB');
        return route.fulfill({ json: { chart: { result: [{ meta: { regularMarketPrice: canadian ? 50 : 100, regularMarketTime: Math.floor(Date.now() / 1000), currency: canadian ? 'CAD' : 'USD' }, timestamp: [3, 2, 1].map(days => Math.floor(Date.now() / 1000) - days * 86400), indicators: { quote: [{ close: [80, 90, 100] }] } }] } } });
      }
      if (url.includes('/market-fundamentals')) return route.fulfill({ json: { quoteResponse: { result: [{ regularMarketPrice: 100, trailingAnnualDividendRate: 2 }] } } });
      return route.fulfill({ status: 503, json: {} });
    });
    await page.addInitScript(theme => {
      if (localStorage.getItem('st_pro_data_v2')) return;
      const date = days => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      localStorage.setItem('st_pro_data_v2', JSON.stringify({ mode: 'personal', theme, currency: 'USD', holdings: [
        { id: 'a', symbol: 'AAA', name: 'North American Technology Corporation with a long name', shares: 12.125, avgCost: 80, currentPrice: 100, currency: 'USD', category: 'Tech', targetPercent: 60, dividendYield: 2, notes: 'A long-term holding with a deliberately long investment thesis. '.repeat(5) },
        { id: 'b', symbol: 'BBB.TO', name: 'Canadian Income ETF', shares: 30, avgCost: 45, currentPrice: 50, currency: 'CAD', category: 'ETF', targetPercent: 40, dividendYield: 3 }
      ], transactions: [{ id: 'd', type: 'DEPOSIT', currency: 'USD', total: 5000, date: date(10) }], watchlist: [{ id: 'w', symbol: 'MSFT', name: 'Microsoft Corporation', currentPrice: 100, targetBuyPrice: 90, currency: 'USD', category: 'Tech', notes: 'Wait for a suitable entry.' }], snapshots: [3, 2].map(days => ({ date: date(days), valueUSD: 7000, netContributionsUSD: 5000 })) }));
    }, theme);
    for (const tab of ['dashboard', 'holdings', 'history', 'watchlist', 'dividends', 'performance', 'rebalance']) {
      await page.goto(`${base}/?audit=${tab}#/${tab}`, { waitUntil: 'domcontentloaded' });
      await page.locator('#tab-content h2').first().waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, wide: [...document.querySelectorAll('main *')].filter(el => { const rect = el.getBoundingClientRect(); return rect.width && (rect.right > innerWidth + 1 || rect.left < -1) && getComputedStyle(el).position !== 'absolute' && !el.closest('.overflow-x-auto'); }).slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 60) })) }));
      if (layout.overflow) findings.push({ theme, width, tab, ...layout });
      const cdp = await context.newCDPSession(page);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(`${output}/${theme}-${width}-${tab}.png`, Buffer.from(shot.data, 'base64'));
      await cdp.detach();
      if (width === 320) {
        if (['holdings', 'history', 'watchlist'].includes(tab)) await page.locator('.filter-panel > summary').click();
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) findings.push({ theme, width, tab, error: 'Horizontal overflow at 200% text size' });
      }
      console.log('CHECK', theme, width, tab, JSON.stringify(layout));
    }
    await page.goto(`${base}/?audit=dialogs#/holdings`, { waitUntil: 'domcontentloaded' });
    await page.locator('#tab-content h2').first().waitFor();
    await page.getByRole('button', { name: 'Add holding', exact: true }).click();
    const cdp = await context.newCDPSession(page);
    const dialogShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`${output}/${theme}-${width}-holding-dialog.png`, Buffer.from(dialogShot.data, 'base64'));
    await page.locator('.modal-panel').getByRole('button', { name: 'Close dialog', exact: true }).click();
    if (width < 1024) await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    else await page.getByRole('button', { name: 'Portfolio controls', exact: true }).click();
    await page.getByRole('button', { name: /^Open settings/ }).click();
    const settingsShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`${output}/${theme}-${width}-settings.png`, Buffer.from(settingsShot.data, 'base64'));
    await cdp.detach();
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    await page.getByRole('button', { name: 'Download encrypted backup', exact: true }).click();
    const passwordDialog = page.locator('dialog[open]');
    await passwordDialog.waitFor();
    assert.equal(await passwordDialog.locator('input').first().getAttribute('type'), 'password');
    await passwordDialog.getByRole('button', { name: 'Show password', exact: true }).click();
    await page.keyboard.press('Escape');
    await passwordDialog.waitFor({ state: 'detached' });
    await context.close();
  }
  console.log('FINDINGS', JSON.stringify(findings));
  if (findings.length) process.exitCode = 1;
} catch (error) { console.error('AUDIT ERROR', error.message); process.exitCode = 1; }
finally { await browser.close(); }
