// Home clothesline: the live labor counter must not intersect any price tag (or sock), and sits
// ≥ 40px below the lowest tag (desktop). Also prints the MISSING acceptance numbers.
// Usage: node scripts/qa-overlap.mjs   (BASE=…)
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
// phones show the one-sock picker (no tags to collide with), so only the clothesline widths are checked
const sizes = [[1440, 900], [1280, 800], [1024, 768]];
const b = await chromium.launch();
let bad = 0;
for (const [W, H] of sizes) {
  const mobile = W < 768;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: mobile, hasTouch: mobile });
  await p.goto(BASE + '/');
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('#line').scrollIntoView());
  await p.waitForTimeout(3500); // the socks drop in and settle
  const r = await p.evaluate(() => {
    const c = document.querySelector('.teaser__counter').getBoundingClientRect();
    const hit = [];
    let lowest = -Infinity;
    for (const el of document.querySelectorAll('#line .cl__tag, #line .cl__img')) {
      const t = el.getBoundingClientRect();
      if (el.classList.contains('cl__tag')) lowest = Math.max(lowest, t.bottom);
      if (t.right > c.left && t.left < c.right && t.bottom > c.top && t.top < c.bottom) hit.push(el.closest('.cl__sock')?.querySelector('.cl__tag-name')?.textContent);
    }
    return { hit, gap: Math.round(c.top - lowest), counter: [c.left, c.right].map(Math.round), mid: Math.round((c.left + c.right) / 2) };
  });
  const ok = r.hit.length === 0 && (mobile || r.gap >= 38);
  if (!ok) bad++;
  console.log(`${W}x${H}  counter ${r.counter.join('–')} (centre ${r.mid}, page centre ${W / 2})  gap below lowest tag ${r.gap}px  intersections: ${r.hit.length ? r.hit.join(', ') : 'none'}  ${ok ? 'PASS' : 'FAIL'}`);

  if (!mobile) {
    await p.evaluate(() => document.querySelector('#missing').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(1600);
    const m = await p.evaluate(() => {
      const pad = Math.min(56, Math.max(20, innerWidth * 0.035));
      const L = (innerWidth - Math.min(1360, innerWidth - 2 * pad)) / 2;
      const R = innerWidth - L;
      const po = document.querySelector('.poster').getBoundingClientRect();
      const side = document.querySelector('.missing__side').getBoundingClientRect();
      const h = document.querySelector('.missing__side .h3');
      const lines = Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
      return { L, R, posterL: po.left, posterH: po.height, sideR: side.right, h2: parseFloat(getComputedStyle(h).fontSize), lines, body: getComputedStyle(document.querySelector('.missing__side .lead')).fontSize, count: getComputedStyle(document.querySelector('.missing__count')).fontSize };
    });
    const mok = Math.abs(m.posterL - m.L) <= 4 && m.sideR >= m.R - 80 && m.lines <= 2;
    if (!mok) bad++;
    console.log(`           MISSING poster left ${Math.round(m.posterL)} (container ${Math.round(m.L)})  poster box h ${Math.round(m.posterH)}  text right ${Math.round(m.sideR)} (≥ ${Math.round(m.R - 80)})  H2 ${m.h2.toFixed(0)}px on ${m.lines} lines  body ${m.body}  counter ${m.count}  ${mok ? 'PASS' : 'FAIL'}`);
  }
  await p.close();
}
console.log(`\nfailures: ${bad}`);
await b.close();
