// Desktop container check: for every section of every page, the min left / max right of the
// visible content (text, images, buttons, canvases, svgs, video). Usage: node scripts/qa-edges.mjs [w] [h]
// Pass: left = 50 ±4 and right = 1390 ±4 at 1440×900 (the container is 1360 + clamp(20px, 3.5vw, 56px)).
import { chromium } from 'playwright';

const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const pages = process.argv.slice(4).length ? process.argv.slice(4) : ['/', '/about', '/faq', '/shop', '/atelier', '/archive'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H } });
const pad = Math.min(56, Math.max(20, W * 0.035));
const content = Math.min(1360, W - 2 * pad);
const L = (W - content) / 2, R = W - L;
let fails = 0;
console.log(`${W}x${H}  target left ${L.toFixed(0)} / right ${R.toFixed(0)}  (±4)\n`);
console.log('page       section                         left    right   ok');

for (const route of pages) {
  await p.goto(BASE + route);
  await p.waitForTimeout(2200);
  const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hgt; y += H * 0.7) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(140);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(900);
  const rows = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('#main > *, #main > * > section, #main > * > header, footer.foot')].filter(
      (s) => s.matches('section, footer, header, div') && !s.querySelector(':scope > section') && s.getBoundingClientRect().height > 40
    );
    const vis = (el) => {
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.05) return false;
      if (el.closest('[aria-hidden="true"]:not(canvas):not(svg), .sr-only, .skip-link, [data-bleed]')) return false;
      return true;
    };
    return secs.map((sec) => {
      let l = Infinity, r = -Infinity, lw = '', rw = '';
      const tag = (el) => `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(/\s+/)[0]}`;
      const add = (rc, el) => {
        if (rc.width < 1 || rc.height < 1) return;
        if (rc.left < l) (l = rc.left), (lw = tag(el));
        if (rc.right > r) (r = rc.right), (rw = tag(el));
      };
      // every visible box (cards, posters, media, controls…), except full-bleed backgrounds (≥ 98% of the viewport)
      for (const el of sec.querySelectorAll('*')) {
        if (el.closest('svg') && el.closest('svg') !== el) continue;
        const rc = el.getBoundingClientRect();
        if (rc.width >= window.innerWidth * 0.98 || !vis(el)) continue;
        add(rc, el);
      }
      const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || !n.parentElement || !vis(n.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const rc of range.getClientRects()) add(rc, n.parentElement);
      }
      const name = (sec.id ? '#' + sec.id : '') || '.' + String(sec.className).split(/\s+/)[0];
      return { name, l: Math.round(l), r: Math.round(r), lw, rw };
    });
  });
  for (const row of rows) {
    if (!Number.isFinite(row.l)) continue;
    const ok = Math.abs(row.l - L) <= 4 && Math.abs(row.r - R) <= 4;
    if (!ok) fails++;
    console.log(`${route.padEnd(10)} ${row.name.slice(0, 30).padEnd(31)} ${String(row.l).padStart(5)}  ${String(row.r).padStart(6)}   ${ok ? 'PASS' : 'FAIL'}${!ok && process.env.DEBUG ? `   ← ${row.lw} | ${row.rw}` : ''}`);
  }
}
console.log(`\nfailing sections: ${fails}`);
await b.close();
