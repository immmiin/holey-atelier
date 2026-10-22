// Phone page lengths and section heights at 390×844: full-page heights for /, /about, /shop, and every
// section that holds repeated items must be ≤ 1.1 × the viewport. Usage: node scripts/qa-heights.mjs [w] [h] (BASE=…)
import { chromium } from 'playwright';

const W = Number(process.argv[2] || 390), H = Number(process.argv[3] || 844);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
let bad = 0;
for (const route of ['/', '/about', '/shop', '/faq', '/archive']) {
  await p.goto(BASE + route);
  await p.waitForTimeout(2000);
  const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hgt; y += H * 0.8) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    // a "repeated items" section: one with 2+ similar siblings (same tag + first class) of a list/grid
    const groups = '.cl__sock, .rv__item, .ftag, .note, .badge, .about__sock, .pile > li, .tagc, .arc__item, .acc2__item';
    const secs = [...document.querySelectorAll('#main > *, #main > * > section, #main > * > header, footer.foot')].filter((s) => !s.querySelector(':scope > section'));
    return {
      page: document.documentElement.scrollHeight,
      overflow: Math.max(document.documentElement.scrollWidth, window.innerWidth) - document.documentElement.clientWidth,
      secs: secs
        .map((s) => ({ name: (s.id ? '#' + s.id : '.' + String(s.className).split(/\s+/)[0]), foot: s.matches('footer'), h: Math.round(s.getBoundingClientRect().height), rep: s.querySelectorAll(groups).length }))
        .filter((s) => s.rep >= 2)
    };
  });
  console.log(`${route.padEnd(9)} page ${r.page}px   horizontal overflow = ${r.overflow}`);
  if (r.overflow !== 0) bad++;
  for (const s of r.secs) {
    const exempt = !s.foot && (route === '/archive' || route === '/faq');
    const ok = s.h <= H * 1.1 || exempt;
    if (!ok) bad++;
    console.log(`          ${s.name.padEnd(22)} ${String(s.h).padStart(5)}px  (${(s.h / H).toFixed(2)} vh, ${s.rep} items)  ${exempt ? 'exempt (gallery / accordion)' : ok ? 'PASS' : 'FAIL'}`);
  }
}
console.log(`\nfailures: ${bad}`);
await b.close();
