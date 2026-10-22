// Screenshot set for the mobile overhaul: first screen + full page for each route, the Atelier
// (line, picked, 50%), cart, checkout and receipt. Usage: node scripts/mobile-shots.mjs <out> <w> <h>
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'mobile-shots';
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const mobile = W < 768;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));

for (const [name, route] of [['home', '/'], ['about', '/about'], ['faq', '/faq'], ['shop', '/shop'], ['archive', '/archive']]) {
  await p.goto(BASE + route);
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${out}/${name}-first.png` });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += H * 0.8) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(120);
  }
  await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });
}

// the Atelier
await p.goto(BASE + '/atelier');
await p.waitForTimeout(2000);
await p.screenshot({ path: `${out}/atelier-line.png` });
const sock = await p.locator('.atp .cl__sock').nth(4).locator('.cl__img').boundingBox();
if (mobile) await p.touchscreen.tap(sock.x + sock.width / 2, sock.y + sock.height / 2);
else await p.mouse.click(sock.x + sock.width / 2, sock.y + sock.height / 2);
await p.waitForFunction(() => window.__holey?.phase === 'pull', null, { timeout: 15000 });
await p.waitForTimeout(1300);
await p.screenshot({ path: `${out}/atelier-picked.png` });
await p.evaluate(() => window.__holey.setProgress(0.5));
await p.waitForTimeout(1800);
await p.screenshot({ path: `${out}/atelier-50.png` });
await p.locator(mobile ? '.atl__bar-add' : '.tag-basket').click();
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/atelier-added.png` });

// cart → checkout → receipt
await p.locator('.basket-btn').first().click();
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/cart.png` });
await p.locator('.bdrawer__checkout').click();
await p.waitForURL('**/checkout');
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/checkout.png` });
await p.screenshot({ path: `${out}/checkout-full.png`, fullPage: true });
await p.getByRole('button', { name: /Place order/ }).click();
await p.locator('.rprint__actions').waitFor({ timeout: 25000 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/receipt.png` });
await p.screenshot({ path: `${out}/receipt-full.png`, fullPage: true });

console.log(`${W}x${H} shots done, errors=${errors.length}`);
errors.slice(0, 5).forEach((e) => console.log('  ERR', e));
await b.close();
