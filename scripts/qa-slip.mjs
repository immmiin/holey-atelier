// "Spin complete" must be on the FIRST screen the moment the door opens: spin for real (no manual
// scrolling), then the card must be fully inside the viewport (in the machine over the drum, or — if
// the drum strip is too narrow — under the washer with the page scrolled to it), overlapping neither
// the open door, the H badge nor the polaroid; text ≥ 13 / 22 / 15px.  BASE=… node scripts/qa-slip.mjs [outDir]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import { spin } from './qa-spin.mjs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/slip';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
let bad = 0;
const hit = (a, c) => a && c && a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom;
for (const [name, opts] of [['1440x900', { viewport: { width: 1440, height: 900 } }], ['1280x800', { viewport: { width: 1280, height: 800 } }], ['390x844', { ...devices['iPhone 13'] }]]) {
  const p = await (await b.newContext(opts)).newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(2800);
  const y0 = await p.evaluate(() => scrollY);
  await spin(p); // returns ~1.2s after the door opens
  await p.waitForTimeout(1600); // the card is in (and, if it's below the washer, scrolled to)
  await p.screenshot({ path: `${out}/${name}-after-open.png` });
  const r = await p.evaluate(() => {
    const B = (s) => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none') return null; const q = e.getBoundingClientRect(); return { left: q.left, top: q.top, right: q.right, bottom: q.bottom }; };
    const w = document.querySelector('.washer');
    const c = document.querySelector('.washer__out');
    const fs = (s) => parseFloat(getComputedStyle(c.querySelector(s)).fontSize);
    return {
      mode: [...w.classList].find((k) => k.startsWith('slip-')), card: B('.washer__out'), door: B('.porthole__glass'), badge: B('.hero2__sticker img'), polaroid: B('.hero2__polaroid'), nav: B('.nav'),
      vw: document.documentElement.clientWidth, vh: innerHeight, scrollY, opacity: getComputedStyle(c).opacity,
      sizes: { eyebrow: fs('.washer__eyebrow'), headline: fs('.washer__msg'), pill: fs('.washer__where'), again: fs('.washer__again') }
    };
  });
  const c = r.card;
  const inView = c.left >= 0 && c.right <= r.vw && c.top >= (r.nav?.bottom ?? 0) && c.bottom <= r.vh;
  const hits = ['door', 'badge', 'polaroid'].filter((k) => hit(c, r[k]));
  const sizesOk = r.sizes.eyebrow >= 13 && r.sizes.headline >= 22 && r.sizes.pill >= 15 && r.sizes.again >= 15;
  const ok = inView && !hits.length && sizesOk && +r.opacity === 1;
  if (!ok) bad++;
  const f = (v) => Math.round(v);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: card ${r.mode} — box ${f(c.left)},${f(c.top)} → ${f(c.right)},${f(c.bottom)} vs viewport ${r.vw}×${r.vh} (below the nav at ${f(r.nav?.bottom ?? 0)}): ${inView ? 'fully in view' : 'NOT fully in view'}; scrolled ${f(y0)} → ${f(r.scrollY)} by the page; overlaps ${hits.length ? hits.join(', ') : 'nothing (door, H badge, polaroid)'}; text eyebrow ${r.sizes.eyebrow} / headline ${r.sizes.headline} / actions ${r.sizes.pill}, ${r.sizes.again}px`);
}
console.log(`\nfailures: ${bad}`);
await b.close();
