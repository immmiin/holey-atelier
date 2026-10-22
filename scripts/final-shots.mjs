// The whole site at one viewport, with checks + screenshots for every feature.
// Usage: node scripts/final-shots.mjs <outDir> <width> <height>   (BASE=… for a deployed site)
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'final-shots';
const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const mobile = W < 760;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [], problems = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name, clip) => page.screenshot({ path: `${out}/${name}.png`, ...(clip ? { clip } : {}) });
const check = (ok, msg) => !ok && problems.push(msg);
const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const stats = () => page.evaluate(async () => (await fetch('/api/stats', { cache: 'no-store' })).json().catch(() => null));
const around = (b, pad = 60) => ({
  x: Math.max(0, b.x - pad),
  y: Math.max(0, b.y - pad),
  width: Math.min(W - Math.max(0, b.x - pad), b.width + pad * 2),
  height: Math.min(H - Math.max(0, b.y - pad), b.height + pad * 2)
});

// ---------------------------------------------------------------- home: hero + washer
await page.goto(BASE + '/');
await page.waitForTimeout(2600);
await shot('01-hero');
const before = await stats();
check((await page.locator('.peek-hint').count()) === 1, 'no "peek through the hole" hint');

// peek: the headline
const title = await page.locator('.hero2__peek').boundingBox();
await page.mouse.move(title.x + title.width * 0.25, title.y + title.height * 0.2);
await page.waitForTimeout(700);
await shot('02-peek-headline', around(title, 30));
// peek: the washer window
const glass = await page.locator('.porthole__glass').boundingBox();
await page.mouse.move(glass.x + glass.width * 0.5, glass.y + glass.height * 0.55);
await page.waitForTimeout(700);
await shot('03-peek-washer', around(glass, 40));

// spin the drum
const cx = glass.x + glass.width / 2, cy = glass.y + glass.height / 2, R = glass.width * 0.33;
await page.mouse.move(cx + R, cy);
await page.mouse.down();
for (let i = 0; i <= 80; i++) {
  const a = (i / 80) * Math.PI * 6;
  await page.mouse.move(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  await page.waitForTimeout(8);
}
await page.mouse.up();
await page.waitForTimeout(250);
await shot('04-washer-spinning', around(glass, 80));
await page.locator('.washer__out').waitFor({ timeout: 25000 });
await page.waitForTimeout(900);
const returned = await page.locator('.washer__returned').count();
check(returned === 1, `washer returned ${returned} socks`);
check(/1 sock returned/.test(await page.locator('.washer__msg').innerText()), 'washer message missing');
await shot('05-washer-done');
// peek: the empty space beside the returned sock
const gap = await page.locator('.washer__gap').boundingBox();
await page.mouse.move(gap.x + gap.width / 2, gap.y + gap.height / 2);
await page.waitForTimeout(700);
await shot('06-peek-missing-twin', around(gap, 90));

// ---------------------------------------------------------------- the line, $9 tags
await page.evaluate(() => document.querySelector('.teaser').scrollIntoView());
await page.waitForTimeout(1600);
await shot('07-line');
const tag = page.locator('.teaser .cl__tag-text').nth(1);
const tb = await tag.boundingBox();
await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
await page.waitForTimeout(700);
await shot('08-peek-tag', around(tb, 50));
check((await page.locator('.teaser .cl__sock').count()) === 6, 'line does not have 6 socks');
check((await page.locator('.shopgrid, .pile').count()) === 0, 'the card grid is still on home');
check(await page.locator('.teaser .labor').count().then((n) => n === 1), 'no labor counter by the line');

await page.evaluate(() => document.querySelector('.laundry-sec').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1200);
await shot('09-video');

// ---------------------------------------------------------------- MISSING: tear a tab
await page.evaluate(() => document.querySelector('#missing').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1200);
const tab = await page.locator('.tab__paper').nth(2).boundingBox();
await page.mouse.move(tab.x + tab.width / 2, tab.y + 20);
await page.mouse.down();
for (let i = 1; i <= 14; i++) {
  await page.mouse.move(tab.x + tab.width / 2 + i * 2, tab.y + 20 + i * 9);
  await page.waitForTimeout(16);
}
await page.mouse.up();
await page.waitForTimeout(1600);
check((await page.locator('.tab__piece').count()) === 1, 'tab did not tear off');
check((await page.locator('.tab__stub').count()) === 1, 'no torn stub left on the poster');
await shot('10-missing-torn');

await page.evaluate(() => document.querySelector('.rv').scrollIntoView());
await page.waitForTimeout(1200);
await shot('11-receipts-reviews');
check(!(await hscroll()), 'home scrolls sideways');

// ---------------------------------------------------------------- footer holes
await page.evaluate(() => document.querySelector('.punch').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);
const logo = await page.locator('.punch__logo').boundingBox();
for (let i = 0; i < 3; i++) await page.mouse.click(logo.x + logo.width * (0.3 + i * 0.2), logo.y + logo.height * 0.5);
await page.waitForTimeout(400);
check(/You made 3 holes\. Value \+\$0\.03\./.test(await page.locator('.punch__count').innerText()), 'footer hole count wrong');
await shot('12-footer-holes');

// ---------------------------------------------------------------- empty cart, 404
await page.locator('.basket-btn').first().click();
await page.waitForTimeout(900);
check(/Your basket has a hole in it/.test(await page.locator('.bdrawer__panel').innerText()), 'empty cart copy');
await shot('13-empty-cart');
await page.keyboard.press('Escape');
await page.goto(BASE + '/this-sock-does-not-exist');
await page.waitForTimeout(1500);
check(/went missing in the wash/i.test(await page.locator('main').innerText()), '404 copy');
await shot('14-404');

// ---------------------------------------------------------------- the Atelier → 60% → basket → checkout
await page.goto(BASE + '/atelier?sock=toe-jam');
await page.waitForFunction(() => window.__holey?.phase === 'pull', null, { timeout: 15000 });
await page.waitForTimeout(1200);
await shot('15-atelier-picked');
const navB = await page.evaluate(() => document.querySelector('header.nav').getBoundingClientRect().bottom);
const roomTop = await page.evaluate(() => document.querySelector('.atl__room').getBoundingClientRect().top);
check(roomTop >= navB - 1, 'nav overlaps the Atelier');
const dbg = () =>
  page.evaluate(() => {
    const d = window.__holey.debug();
    const r = window.__holey.canvas.getBoundingClientRect();
    const c = (p) => ({ x: p.x + r.left, y: p.y + r.top });
    return { ...d, grabPoint: c(d.grabPoint), anchor: c(d.anchor) };
  });
for (let n = 0; n < 60; n++) {
  const d0 = await dbg();
  if (d0.p >= 0.6) break;
  const g = d0.grabPoint;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(Math.min(W - 4, g.x + (mobile ? 9 : 13) * i), Math.min(H - 4, g.y + (mobile ? 11 : 15) * i));
    await page.waitForTimeout(16);
    if ((await dbg()).p >= 0.6) break;
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
}
await page.waitForTimeout(900);
await shot('16-atelier-60');
await page.locator('.tag-basket').click();
await page.locator('.atl__added').waitFor();
await page.waitForTimeout(1200);
await shot('17-added');
await page.locator('.atl__added').getByRole('button', { name: 'Checkout' }).click();
await page.waitForURL('**/checkout');
await page.waitForTimeout(1200);
await shot('18-checkout');
await page.getByRole('button', { name: /Place order/ }).click();
await page.locator('.rprint__actions').waitFor({ timeout: 25000 });
// wait for the Archive to confirm the serial (Copy link becomes available)
await page.waitForFunction(() => !document.querySelector('.rprint__actions button:nth-child(2)')?.disabled, null, { timeout: 15000 }).catch(() => problems.push('serial never confirmed'));
await page.waitForTimeout(800);
await shot('19-receipt-top');
await page.locator('.rprint').screenshot({ path: `${out}/20-receipt-and-payslip.png` });
const order = await page.evaluate(() => JSON.parse(sessionStorage.getItem('holey-last-order-v2')));
check(!order.local && /^HOL-\d{4,}$/.test(order.id), `order serial not confirmed: ${order.id}`);
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save receipt' }).click()]);
await dl.saveAs(`${out}/21-${dl.suggestedFilename()}`);

// the shared page, the Archive, the counters
await page.goto(`${BASE}/r/${order.id}`);
await page.waitForSelector('.share__piece', { timeout: 15000 }).catch(() => problems.push('/r page did not render'));
await page.waitForTimeout(1500);
await shot('22-shared-receipt');
await page.goto(BASE + '/archive');
await page.waitForSelector('.arc__item', { timeout: 15000 });
await page.waitForTimeout(2200);
await shot('23-archive');
const first = await page.locator('.arc__serial').first().innerText();
check(first === order.id, `archive top is ${first}, not ${order.id}`);
const after = await stats();
check(before && after && after.totalOrders === before.totalOrders + 1, `orders ${before?.totalOrders} → ${after?.totalOrders}`);
check(before && after && after.totalLaborSec > before.totalLaborSec, 'labor did not increase');
check(after?.wagesPaid === 0, 'wages paid is not $0');
check(!(await hscroll()), 'archive scrolls sideways');

console.log(`${W}x${H} errors=${errors.length} problems=${problems.length} order=${order.id}`);
problems.forEach((p) => console.log('  PROBLEM', p));
errors.slice(0, 8).forEach((e) => console.log('  ERR', e));
await browser.close();
