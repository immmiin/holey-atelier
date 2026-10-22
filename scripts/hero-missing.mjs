// Hero + MISSING checks at one viewport: the hero fills the fold, the washer is the big visual,
// and MISSING tabs tear by click/tap and by drag, fall, and land.
// Usage: node scripts/hero-missing.mjs <outDir> <width> <height>   (BASE=… for a deployed site)
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'hm-shots';
const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const mobile = W < 760;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: mobile });
const page = await ctx.newPage();
const errors = [], problems = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const check = (ok, msg) => !ok && problems.push(msg);

// ---------------------------------------------------------------- hero
await page.goto(BASE + '/');
await page.waitForTimeout(2800);
await page.screenshot({ path: `${out}/hero.png` });
const hero = await page.evaluate(() => {
  const r = (s) => document.querySelector(s).getBoundingClientRect();
  const title = r('.hero2__title'), mach = r('.machine'), text = r('.hero2__text'), lead = r('.hero2__lead');
  const lh = parseFloat(getComputedStyle(document.querySelector('.hero2__title')).lineHeight);
  const ctas = [...document.querySelectorAll('.hero2__ctas a, .hero2__ctas button')].map((b) => b.getBoundingClientRect().bottom);
  return {
    lines: Math.round(title.height / lh),
    fontPx: parseFloat(getComputedStyle(document.querySelector('.hero2__title')).fontSize),
    machine: { left: mach.left, right: mach.right, top: mach.top, bottom: mach.bottom + 16, w: mach.width, h: mach.height },
    textLeft: text.left,
    leadW: lead.width,
    ctaBottom: Math.max(...ctas)
  };
});
check(hero.lines <= 3, `headline ${hero.lines} lines`);
check(hero.fontPx >= 56 || mobile, `headline ${hero.fontPx}px (< 56)`);
check(hero.leadW <= 421, `sub-copy ${Math.round(hero.leadW)}px wide (> 420)`);
if (!mobile) {
  const vh = hero.machine.h / H;
  check(vh >= 0.6 && vh <= 0.75, `washer is ${(vh * 100).toFixed(0)}vh tall`);
  check(hero.machine.bottom <= H + 1, `washer below the fold (${Math.round(hero.machine.bottom)})`);
  check(hero.ctaBottom <= H, `CTAs below the fold (${Math.round(hero.ctaBottom)})`);
  // dead zones: the composition spans the container, with no huge empty strips at the sides
  const left = hero.textLeft, right = W - hero.machine.right;
  check(left <= Math.max(90, (W - Math.min(W * 0.75, 1440) ) / 2 + 90, (W - 1280) / 2 + 90) && right <= Math.max(160, (W - 1280) / 2 + 160), `side margins ${Math.round(left)} / ${Math.round(right)}`);
} else {
  const ratio = hero.machine.w / W;
  check(ratio >= 0.8 && ratio <= 0.9, `phone washer ${(ratio * 100).toFixed(0)}vw wide`);
  check(hero.machine.top >= hero.ctaBottom - 1, 'phone washer is not below the CTAs');
}
check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), 'sideways scroll');

// ---------------------------------------------------------------- MISSING
await page.evaluate(() => document.querySelector('#missing').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/missing.png` });
const layout = await page.evaluate(() => {
  const p = document.querySelector('.poster').getBoundingClientRect();
  const s = document.querySelector('.missing__side').getBoundingClientRect();
  const pe = document.querySelector('.poster');
  return { posterH: pe.offsetHeight, posterW: pe.offsetWidth, posterL: p.left, sideL: s.left, sideR: s.right, sideMid: s.top + s.height / 2, posterMid: p.top + p.height / 2 };
});
if (!mobile) {
  check(layout.posterH >= 500 && layout.posterH <= 640, `poster ${Math.round(layout.posterH)}px tall`);
  check(layout.sideL - (layout.posterL + layout.posterW) < 140, 'text block is far from the poster');
  check(Math.abs(layout.sideMid - layout.posterMid) < 80, 'text block not vertically centred with the poster');
  const leftGap = layout.posterL, rightGap = W - layout.sideR;
  check(Math.abs(leftGap - rightGap) < 160, `composition off-centre (${Math.round(leftGap)} / ${Math.round(rightGap)})`);
} else {
  check(layout.posterW / W >= 0.84 && layout.posterW / W <= 0.92, `phone poster ${Math.round((layout.posterW / W) * 100)}vw`);
}
// nothing on top of the tabs
const blocker = await page.evaluate(() => {
  const t = document.querySelectorAll('.tab__paper')[1].getBoundingClientRect();
  const el = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
  return el?.closest('.tab__paper') ? null : `${el?.tagName}.${el?.className}`;
});
check(!blocker, `something covers the tabs: ${blocker}`);
const left0 = Number(await page.locator('.missing__count strong').innerText());

// 1) click / tap a tab: it tears off at once
const t1 = await page.locator('.tab__paper').nth(1).boundingBox();
if (mobile) await page.touchscreen.tap(t1.x + t1.width / 2, t1.y + t1.height / 2);
else await page.mouse.click(t1.x + t1.width / 2, t1.y + t1.height / 2);
await page.waitForTimeout(330);
await page.screenshot({ path: `${out}/click-tear-midfall.png` });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/click-tear-landed.png` });
check((await page.locator('.tab__piece').count()) === 1, 'click did not tear a tab');

// 2) drag another down: resistance, then it gives past ~40 px
const t2 = await page.locator('.tab__paper').nth(4).boundingBox();
await page.mouse.move(t2.x + t2.width / 2, t2.y + 18);
await page.mouse.down();
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(t2.x + t2.width / 2 + i, t2.y + 18 + i * 7);
  await page.waitForTimeout(20);
}
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/drag-tear-midfall.png` });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/drag-tear-landed.png` });
check((await page.locator('.tab__piece').count()) === 2, 'drag did not tear a tab');
check((await page.locator('.tab__stub').count()) === 2, 'torn slots show no ragged edge');
const left1 = Number(await page.locator('.missing__count strong').innerText());
check(left1 === left0 - 2, `counter ${left0} → ${left1}`);
// landed: resting at the bottom of the section
const rest = await page.evaluate(() => {
  const sec = document.querySelector('#missing').getBoundingClientRect();
  return [...document.querySelectorAll('.tab__piece')].map((el) => Math.round(sec.bottom - el.getBoundingClientRect().bottom));
});
check(rest.every((d) => d >= 0 && d < 40), `tabs not resting on the floor: ${rest.join(',')}`);
// and they don't land on top of the notice board text
const covered = await page.evaluate(() => {
  const side = document.querySelector('.missing__side').getBoundingClientRect();
  return [...document.querySelectorAll('.tab__piece')].some((el) => el.getBoundingClientRect().top < side.bottom - 4 && el.getBoundingClientRect().bottom > side.top);
});
check(!covered, 'a landed tab covers the notice board');

// 3) tear the rest: "All tabs taken."
for (let k = 0; k < 6; k++) {
  const b = await page.locator('.tab__paper').first().boundingBox();
  if (!b) break;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(260);
}
await page.waitForTimeout(1500);
check(/All tabs taken\. Still no one called\./.test(await page.locator('.missing__side').innerText()), 'no "All tabs taken" message');
await page.screenshot({ path: `${out}/all-taken.png` });

console.log(`${W}x${H} errors=${errors.length} problems=${problems.length} washer=${Math.round(hero.machine.h)}px font=${hero.fontPx}px poster=${Math.round(layout.posterH)}px`);
problems.forEach((p) => console.log('  PROBLEM', p));
errors.slice(0, 6).forEach((e) => console.log('  ERR', e));
await browser.close();
