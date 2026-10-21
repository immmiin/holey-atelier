// Viewport screenshots down a page, like a person scrolling.
// Usage: node scripts/shoot-scroll.mjs <url> <name> [width] [step]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const [, , url = 'http://localhost:5173/', name = 'page', width = '1440', step = '850'] = process.argv;
const W = Number(width);
await fs.mkdir('screenshots/scroll', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: W, height: W < 700 ? 812 : 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < H; y += Number(step)) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `screenshots/scroll/${name}-${W}-${String(i++).padStart(2, '0')}.png` });
}
console.log(name, 'height', H, 'shots', i, errors.length ? '\nERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
