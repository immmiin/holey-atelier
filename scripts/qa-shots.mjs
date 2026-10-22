// QA screenshots: hero (before + after a spin), clothesline, MISSING, receipts, footer, /about, /faq,
// /atelier, /archive at 1440×900, 1280×800 and 390×844. Usage: node scripts/qa-shots.mjs [outDir]  (BASE=…)
import { chromium } from 'playwright';
import fs from 'node:fs';
import { spin } from './qa-spin.mjs';

const out = process.argv[2] || 'qa';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const b = await chromium.launch();
const saved = [];

for (const [W, H] of [[1440, 900], [1280, 800], [390, 844]]) {
  const mobile = W < 768;
  const dir = `${out}/${W}x${H}`;
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  const shot = async (name, full = false) => {
    const path = `${dir}/${name}.png`;
    await p.screenshot({ path, fullPage: full });
    saved.push(path);
  };
  const settle = async () => {
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += H * 0.7) {
      await p.evaluate((yy) => window.scrollTo(0, yy), y);
      await p.waitForTimeout(160);
    }
    await p.waitForTimeout(1200);
  };
  const at = async (sel, name) => {
    await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
    await p.evaluate(() => window.scrollBy(0, -60));
    await p.waitForTimeout(2600);
    await shot(name);
  };

  await p.goto(BASE + '/');
  await p.waitForTimeout(2800);
  await shot('home-hero-before');
  if (mobile) {
    // a phone spins with a finger: drag circles on the drum
    const g = await p.locator('.porthole__glass').boundingBox();
    const cx = g.x + g.width / 2, cy = g.y + g.height / 2, r = g.width * 0.3;
    for (let round = 0; round < 3 && !(await p.locator('.washer.is-open').count()); round++) {
      const cdp = await ctx.newCDPSession(p);
      const pts = [];
      for (let a = 0; a <= Math.PI * 6; a += 0.25) pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
      for (const [x, y] of pts) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
        await p.waitForTimeout(8);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      for (let t = 0; t < 40 && !(await p.locator('.washer.is-open').count()); t++) await p.waitForTimeout(250);
    }
    await p.waitForTimeout(1200);
  } else {
    await spin(p);
  }
  await p.evaluate(() => document.querySelector('.hero2').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(500);
  await shot('home-hero-after-spin');
  await settle();
  await at('#line', 'home-clothesline');
  await at('#missing', 'home-missing');
  await at('.rv', 'home-receipts');
  await at('footer.foot', 'home-footer');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await shot('home-full', true);

  for (const route of ['/about', '/faq', '/atelier', '/archive']) {
    await p.goto(BASE + route);
    await p.waitForTimeout(2600);
    const name = route.slice(1);
    await shot(`${name}-first`);
    if (route !== '/atelier') {
      await settle();
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(400);
      await shot(`${name}-full`, true);
    }
  }
  await ctx.close();
}
console.log(saved.join('\n'));
await b.close();
