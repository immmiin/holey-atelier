// Full Atelier flow on the home page:
// home → pick a sock (depth check) → pull to ~50% and 100% → add to basket → receipt
// → certificate → save PNG → basket shows the item → checkout reprints the receipt.
// Usage: node scripts/atelier-flow.mjs <outDir> [width height]   (dev server on :5199, or BASE=...)
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'atelier-shots';
const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
const BASE = process.env.BASE || 'http://localhost:5199/';
const mobile = W < 760;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, acceptDownloads: true, hasTouch: mobile });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const fail = (msg) => {
  console.log('FAIL', msg);
  process.exitCode = 1;
};

await page.goto(BASE);
await page.waitForTimeout(1800);
await shot('01-home');
await page.evaluate(() => document.getElementById('atelier').scrollIntoView());
await page.waitForTimeout(1500);
await shot('02-line');

// pick the first sock
const img = page.locator('#atelier .cl__sock').nth(0).locator('.cl__img');
const b = await img.boundingBox();
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(350);
await shot('03-lifting');
await page.waitForFunction(() => window.__holey?.phase === 'pull', null, { timeout: 15000 });
await page.waitForTimeout(1200);
await shot('04-picked');
const depth = await page.evaluate(() => {
  const socks = [...document.querySelectorAll('#atelier .cl__sock')];
  const other = getComputedStyle(socks[2].querySelector('.cl__body'));
  const pickedImg = getComputedStyle(socks[0].querySelector('.cl__img'));
  const floor = getComputedStyle(document.querySelector('.atl__floor'));
  const m = new DOMMatrix(other.transform);
  return { otherScale: +m.a.toFixed(3), otherFilter: other.filter, otherOpacity: other.opacity, pickedFilter: pickedImg.filter, floorOpacity: floor.opacity, stage: window.__holey.L.imgW / window.__holey.L.smallW };
});
console.log('depth', JSON.stringify(depth));
if (Math.abs(depth.otherScale - 0.85) > 0.02 || !/blur/.test(depth.otherFilter) || !/saturate/.test(depth.otherFilter) || Math.abs(+depth.otherOpacity - 0.7) > 0.05)
  fail('receding socks are not 0.85× / blurred / desaturated / 70%');
if (+depth.floorOpacity < 0.99) fail('floor plane did not fade in');
if (depth.stage < 1.55) fail(`picked sock only ${depth.stage.toFixed(2)}× the line socks`);

// pull hand-over-hand
const dbg = () =>
  page.evaluate(() => {
    const d = window.__holey.debug();
    const r = window.__holey.canvas.getBoundingClientRect();
    const c = (p) => ({ x: p.x + r.left, y: p.y + r.top });
    return { ...d, grabPoint: c(d.grabPoint), anchor: c(d.anchor) };
  });
let pulls = 0, viol = 0, shot50 = false;
const pullTo = async (target) => {
  while (true) {
    const d0 = await dbg();
    if (d0.finished || d0.p >= target) return;
    if (++pulls > 80) throw new Error('too many pulls');
    const g = d0.grabPoint;
    await page.mouse.move(g.x, g.y);
    await page.mouse.down();
    let dx = g.x - d0.anchor.x, dy = g.y - d0.anchor.y;
    const l = Math.hypot(dx, dy) || 1;
    dx = (dx / l) * 0.4 + 0.5;
    dy = (dy / l) * 0.4 + 0.75;
    const l2 = Math.hypot(dx, dy);
    dx /= l2;
    dy /= l2;
    const dist = mobile ? 240 : 330;
    for (let i = 1; i <= 18; i++) {
      await page.mouse.move(Math.min(W - 4, g.x + dx * dist * (i / 18)), Math.min(H - 4, g.y + dy * dist * (i / 18)));
      await page.waitForTimeout(16);
      const d = await dbg();
      if (!d.anchorOnFabric || !d.ropeAttached) viol++;
      if (d.finished) break;
    }
    await page.mouse.up();
    await page.waitForTimeout(200);
    const d = await dbg();
    if (!shot50 && d.p >= 0.5) {
      shot50 = true;
      await page.waitForTimeout(700);
      await shot('05-pull-50');
    }
  }
};
await pullTo(1);
await page.waitForTimeout(1500);
await shot('06-pull-100');

// basket → receipt
await page.locator('.tag-basket').click();
await page.getByRole('button', { name: 'Get certificate' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
await shot('07-receipt');
await page.locator('.atl-layer .rc-paper').screenshot({ path: `${out}/07b-receipt-paper.png` });

// certificate → PNG
await page.getByRole('button', { name: 'Get certificate' }).click();
await page.waitForTimeout(1900);
await shot('08-certificate');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as image' }).click()]);
const png = `${out}/09-${dl.suggestedFilename()}`;
await dl.saveAs(png);

// the basket has it, at the distressed price
await page.getByRole('button', { name: 'Back to receipt' }).click();
await page.getByRole('button', { name: 'View basket' }).click();
await page.waitForTimeout(1200);
await shot('10-basket');
const basket = await page.locator('.bdrawer__panel').innerText();
if (!/Hand-distressed, 100% hole/.test(basket) || !/\$99\.00/.test(basket)) fail('basket line is missing the note or price: ' + basket.replace(/\s+/g, ' ').slice(0, 200));

// checkout reprints the Atelier receipt
await page.locator('.bdrawer__checkout').click();
await page.waitForURL('**/checkout');
await page.waitForTimeout(3200);
await page.locator('.co__atelier').scrollIntoViewIfNeeded().catch(() => fail('no Atelier receipt at checkout'));
await page.waitForTimeout(2500);
await shot('11-checkout');

const scroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
console.log(`pulls=${pulls} violations=${viol} png=${fs.statSync(png).size}B hScroll=${scroll} errors=${errors.length}`);
if (viol) fail('thread came off the fabric');
errors.slice(0, 10).forEach((e) => console.log('ERR', e));
await browser.close();
