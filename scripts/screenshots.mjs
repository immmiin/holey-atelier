// Screenshot the running dev server at 375 / 768 / 1440.
// Usage: node scripts/screenshots.mjs [baseUrl] [paths...]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.argv[2] || 'http://localhost:5173';
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/shop', '/socks/heel-yeah', '/about', '/faq', '/checkout', '/nope'];
const widths = (process.env.WIDTHS || '1440,768,375').split(',').map(Number);
const full = process.env.FULL !== '0';
const out = 'screenshots';
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 812 : 900 }, deviceScaleFactor: 1, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${w}] ${page.url()} ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${w}] ${page.url()} ${e.message}`));
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const name = (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '_')) + `-${w}`;
    if (full) {
      // walk the page so scroll-triggered things settle, then capture it all
      const H = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += 500) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log('shot', name);
  }
  await ctx.close();
}
await browser.close();
if (errors.length) {
  console.log('\nCONSOLE ERRORS:\n' + [...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else console.log('\nNo console errors.');
