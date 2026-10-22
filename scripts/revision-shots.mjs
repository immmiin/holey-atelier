// Screenshot set + layout checks for the whole site at one viewport.
// Usage: node scripts/revision-shots.mjs <outDir> <width> <height>   (BASE=… to point elsewhere)
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'shots';
const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const mobile = W < 760;
fs.mkdirSync(out, { recursive: true });
const browser = await browserLaunch();
async function browserLaunch() {
  return chromium.launch();
}
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, acceptDownloads: true, hasTouch: mobile });
const page = await ctx.newPage();
const errors = [];
const problems = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const check = (ok, msg) => !ok && problems.push(msg);
const rect = (sel) => page.locator(sel).first().evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
});
const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

// ------------------------------------------------------------ home
await page.goto(BASE + '/');
await page.waitForTimeout(2600);
await shot('01-hero');
const hero = await page.evaluate(() => {
  const t = document.querySelector('.hero2__title').getBoundingClientRect();
  const ctas = [...document.querySelectorAll('.hero2__ctas a, .hero2__ctas button')].map((b) => b.getBoundingClientRect().bottom);
  const mach = document.querySelector('.machine').getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(document.querySelector('.hero2__title')).lineHeight);
  return { titleW: t.width, titleLines: Math.round(t.height / lh), ctaBottom: Math.max(...ctas), machineBottom: mach.bottom + 16 };
});
check(hero.titleLines <= 3, `hero headline is ${hero.titleLines} lines`);
check(mobile || hero.titleW <= W * 0.56, `hero headline ${Math.round(hero.titleW)}px wide (>${Math.round(W * 0.55)})`);
check(hero.ctaBottom <= H, `hero CTAs below the fold (${Math.round(hero.ctaBottom)} > ${H})`);
check(hero.machineBottom <= H + 2, `washer below the fold (${Math.round(hero.machineBottom)} > ${H})`);

await page.evaluate(() => document.querySelector('.teaser').scrollIntoView());
await page.waitForTimeout(1600);
await shot('02-teaser');
const teaser = await rect('.teaser');
check(mobile || teaser.height <= H * 0.9 + 1, `teaser is ${Math.round(teaser.height)}px tall (> 90vh)`);

await page.evaluate(() => document.querySelector('.laundry-sec').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1600);
await shot('03-video');
const vid = await page.evaluate(() => {
  const v = document.querySelector('.laundry video');
  return v ? { muted: v.hasAttribute('muted'), inline: v.hasAttribute('playsinline'), loop: v.loop, poster: !!v.poster } : null;
});
check(!vid || (vid.muted && vid.inline && vid.loop && vid.poster), 'video is missing muted/playsinline/loop/poster');
await page.evaluate(() => document.querySelector('.shopgrid').scrollIntoView());
await page.waitForTimeout(1400);
await shot('04-shop-grid');
check(!(await hscroll()), 'home scrolls sideways');

// ------------------------------------------------------------ the Atelier
await page.goto(BASE + '/atelier');
await page.waitForTimeout(2200);
await shot('05-atelier-line');
const navB = await page.evaluate(() => document.querySelector('header.nav').getBoundingClientRect().bottom);
const room = await rect('.atl__room');
check(room.top >= navB - 1, `nav overlaps the Atelier (${navB} > ${room.top})`);

const img = page.locator('.atp .cl__sock').nth(0).locator('.cl__img');
const b = await img.boundingBox();
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForFunction(() => window.__holey?.phase === 'pull', null, { timeout: 15000 });
await page.waitForTimeout(1300);
await shot('06-picked');
const depth = await page.evaluate(() => {
  const socks = [...document.querySelectorAll('.atp .cl__sock')];
  const other = getComputedStyle(socks[2].querySelector('.cl__body'));
  const m = new DOMMatrix(other.transform);
  const L = window.__holey.L;
  const ropeY = L.lineYAt(L.pinX);
  const sockH = window.__holey.sockH;
  return { scale: +m.a.toFixed(3), filter: other.filter, opacity: +other.opacity, fill: sockH / (L.baseY - ropeY) };
});
check(Math.abs(depth.scale - 0.75) < 0.02 && /blur\(3px\)/.test(depth.filter) && /saturate\(0\.6\)/.test(depth.filter) && Math.abs(depth.opacity - 0.65) < 0.03, `recede off: ${JSON.stringify(depth)}`);
check(depth.fill >= 0.6 && depth.fill <= 0.72, `picked sock fills ${(depth.fill * 100).toFixed(0)}% of line→floor`);
const tagOK = async (label) => {
  const t = await rect('.atl__tag .tag-card');
  const minEdge = mobile ? 8 : 31;
  check(t.left >= minEdge && W - t.right >= minEdge && t.top >= navB - 1 && t.bottom <= H, `${label}: tag clipped/too close ${JSON.stringify(t)}`);
};
await tagOK('picked');

const dbg = () =>
  page.evaluate(() => {
    const d = window.__holey.debug();
    const r = window.__holey.canvas.getBoundingClientRect();
    const c = (p) => ({ x: p.x + r.left, y: p.y + r.top });
    return { ...d, grabPoint: c(d.grabPoint), anchor: c(d.anchor) };
  });
let pulls = 0, viol = 0, shot50 = false;
while (true) {
  const d0 = await dbg();
  if (d0.finished) break;
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
  const dist = mobile ? 240 : 320;
  for (let i = 1; i <= 18; i++) {
    await page.mouse.move(Math.min(W - 4, g.x + dx * dist * (i / 18)), Math.min(H - 4, g.y + dy * dist * (i / 18)));
    await page.waitForTimeout(16);
    const d = await dbg();
    if (!d.anchorOnFabric || !d.ropeAttached) viol++;
    if (d.finished) break;
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
  if (!shot50 && (await dbg()).p >= 0.5) {
    shot50 = true;
    await page.waitForTimeout(800);
    await shot('07-pull-50');
    await tagOK('50%');
  }
}
await page.waitForTimeout(1500);
await shot('08-pull-100');
check(viol === 0, `thread came off the fabric ${viol}×`);

await page.locator('.tag-basket').click();
await page.locator('.atl__added').waitFor({ timeout: 8000 });
await page.waitForTimeout(1300);
await shot('09-added-toast');
const toast = await page.locator('.atl__added').innerText();
check(/Added\.\s*Labor \d+:\d\d · Your wage \$0\.00/.test(toast), `toast text: ${toast}`);
const badge = await page.evaluate(() => document.querySelector('.basket-btn')?.textContent || '');
check(/1/.test(badge), `cart badge: "${badge}"`);

// the cart
await page.locator('.basket-btn').first().click();
await page.waitForTimeout(1200);
await shot('10-cart');
const cartText = await page.locator('.bdrawer__panel').innerText();
check(/Hand-distressed, 100% hole/.test(cartText) && /\$99\.00/.test(cartText), 'cart line missing note/price');
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// checkout → receipt
await page.locator('.atl__added').getByRole('button', { name: 'Checkout' }).click();
await page.waitForURL('**/checkout');
await page.waitForTimeout(1500);
await shot('11-checkout');
check(!(await hscroll()), 'checkout scrolls sideways');
await page.getByRole('button', { name: /Place order/ }).click();
await page.locator('.rprint__actions').waitFor({ timeout: 20000 });
await page.waitForTimeout(600);
await shot('12-receipt');
await page.locator('.rprint').screenshot({ path: `${out}/12b-receipt-strip.png` });
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save receipt' }).click()]);
const png = `${out}/13-${dl.suggestedFilename()}`;
await dl.saveAs(png);
const emptyCart = await page.evaluate(() => document.querySelector('.basket-btn')?.textContent || '');
check(!/\d/.test(emptyCart), 'cart not cleared after placing the order');
await page.getByRole('button', { name: 'Back to the line' }).click();
await page.waitForURL('**/atelier');

console.log(`${W}x${H} pulls=${pulls} png=${fs.statSync(png).size}B errors=${errors.length} problems=${problems.length}`);
problems.forEach((p) => console.log('  PROBLEM', p));
errors.slice(0, 8).forEach((e) => console.log('  ERR', e));
await browser.close();
