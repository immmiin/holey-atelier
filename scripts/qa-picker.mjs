// Phone line-up picker (iPhone 13): spacing under the paragraph → counter → "Laundry Day.", the
// 3-column counter, and the drag / release / flick interaction (screenshots at rest, mid-drag, after
// a flick).   BASE=… node scripts/qa-picker.mjs [outDir]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/m/picker';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const rows = [];
const check = (label, got, ok) => rows.push({ label, got, ok });
const near = (v, want, tol = 1) => Math.abs(v - want) <= tol;

await p.goto(BASE + '/');
await p.waitForTimeout(2500);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 400) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(120); }
await p.evaluate(() => { const l = document.querySelector('#line .tpick'); scrollTo(0, l.getBoundingClientRect().top + scrollY - 260); });
await p.waitForTimeout(2800); // reveals + counter count-up

const state = () => p.evaluate(() => {
  const s = document.querySelector('.tpick__sock');
  const m = new DOMMatrix(getComputedStyle(s).transform);
  const line = document.querySelector('.tpick__line').getBoundingClientRect();
  const posts = [...document.querySelectorAll('.tpick__rope circle')].map((c) => c.getBoundingClientRect());
  const peg = document.querySelector('.tpick__peg circle').getBoundingClientRect();
  return { x: +m.e.toFixed(1), dip: +m.f.toFixed(1), tilt: +(Math.atan2(m.b, m.a) * 180 / Math.PI).toFixed(1), opacity: +getComputedStyle(s).opacity, name: document.querySelector('.tpick__name').textContent, on: document.querySelector('.tpick__swatch.is-on').getAttribute('aria-label'), lineL: posts[0].left + posts[0].width / 2, lineR: posts[1].left + posts[1].width / 2, pegX: peg.left + peg.width / 2, pegY: peg.top + peg.height / 2, ropeY: line.top + 12 };
});

const g = await p.evaluate(() => {
  const R = (s) => document.querySelector(s).getBoundingClientRect();
  const lead = R('.teaser__side .lead'), post = document.querySelector('.tpick__rope circle').getBoundingClientRect();
  const img = R('.tpick__sock img'), sw = R('.tpick__swatches'), info = R('.tpick__info'), act = R('.tpick__actions'), counter = R('.teaser__counter'), cap = R('.laundry-sec__cap');
  const c = document.querySelector('.teaser__counter');
  const cells = [...c.children].filter((e) => getComputedStyle(e).display !== 'none');
  const tops = [...new Set(cells.map((e) => Math.round(e.getBoundingClientRect().top)))];
  return {
    leadToLine: post.top - lead.bottom, sockToSw: sw.top - img.bottom, swToInfo: info.top - sw.bottom, infoToAct: act.top - info.bottom, actToCounter: counter.top - act.bottom, counterToCap: cap.top - counter.bottom,
    cells: cells.map((e) => ({ value: e.querySelector('b')?.textContent, vfs: parseFloat(getComputedStyle(e.querySelector('b')).fontSize), vfw: getComputedStyle(e.querySelector('b')).fontWeight, label: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data.trim()).join(''), lfs: parseFloat(getComputedStyle(e).fontSize), upper: getComputedStyle(e).textTransform, red: getComputedStyle(e.querySelector('b')).color })),
    rows: tops.length, dots: [...c.querySelectorAll('[aria-hidden="true"]')].some((e) => getComputedStyle(e).display !== 'none'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
});
const r = Math.round;
check('paragraph → clothesline (post tops)', `${r(g.leadToLine)}px`, near(g.leadToLine, 24));
const s0 = await state();
check('line → sock: pin grip vs line', `${(s0.pegY - (s0.ropeY + s0.dip)).toFixed(1)}px off the line (pin centred at x ${r(s0.pegX)})`, Math.abs(s0.pegY - (s0.ropeY + s0.dip)) <= 1.5);
check('sock → swatches', `${r(g.sockToSw)}px`, near(g.sockToSw, 20));
check('swatches → name/price', `${r(g.swToInfo)}px`, near(g.swToInfo, 16));
check('name/price → buttons', `${r(g.infoToAct)}px`, near(g.infoToAct, 16));
check('buttons → labor counter', `${r(g.actToCounter)}px`, near(g.actToCounter, 24));
check('labor counter → "Laundry Day."', `${r(g.counterToCap)}px`, near(g.counterToCap, 56));
check('counter: 3 stats in one row', g.cells.map((c) => `${c.value} / ${c.label} (${c.vfs}px ${c.vfw} over ${c.lfs}px ${c.upper})`).join(' · '),
  g.cells.length === 3 && g.rows === 1 && g.cells.every((c) => c.vfs === 18 && c.lfs === 12 && c.upper === 'uppercase' && +c.vfw >= 700));
check('counter: no stray "·" / wrapping sentence', g.dots ? 'visible' : 'none', !g.dots);
check('home horizontal overflow', `${g.overflow}px`, g.overflow === 0);
await p.screenshot({ path: `${out}/1-rest.png` });

// drag right by 90px and hold
const img = await p.locator('.tpick__sock img').boundingBox();
const cx = img.x + img.width / 2, cy = img.y + img.height * 0.4;
await p.mouse.move(cx, cy);
await p.mouse.down();
for (let i = 1; i <= 12; i++) { await p.mouse.move(cx + i * 7.5, cy); await p.waitForTimeout(16); }
const d = await state();
await p.screenshot({ path: `${out}/2-mid-drag.png` });
check('mid-drag: pin follows (x offset), clamped to the line', `x +${d.x}px, pin at ${r(d.pegX)} between posts ${r(d.lineL)}–${r(d.lineR)}`, d.x > 60 && d.pegX > d.lineL && d.pegX < d.lineR);
check('mid-drag: line dips at the pin', `${d.dip}px (rest ${s0.dip}px)`, d.dip > s0.dip);
check('mid-drag: tilt in the drag direction (≤ 12°)', `${d.tilt}°`, d.tilt > 0 && d.tilt <= 12.01);
// release: back to centre, swing, settle
const t0 = Date.now();
await p.mouse.up();
let settled = null, maxSwing = 0, sign = 0, crossings = 0;
for (let i = 0; i < 120; i++) {
  const s = await state();
  maxSwing = Math.max(maxSwing, Math.abs(s.tilt));
  const sg = Math.sign(s.tilt);
  if (sg && sign && sg !== sign) crossings++;
  if (sg) sign = sg;
  if (Math.abs(s.x) < 0.3 && Math.abs(s.tilt) < 0.2) { settled = Date.now() - t0; break; }
  await p.waitForTimeout(20);
}
check('release: springs back to centre and swings, settles', `settled in ${settled}ms, ${crossings} swing crossing(s), max ${maxSwing.toFixed(1)}°`, settled !== null && settled <= 1500 && crossings >= 1);

// flick left → next sock
await p.waitForTimeout(300);
const before = await state();
await p.mouse.move(cx, cy);
await p.mouse.down();
for (let i = 1; i <= 4; i++) { await p.mouse.move(cx - i * 30, cy); await p.waitForTimeout(12); }
await p.mouse.up();
await p.waitForTimeout(250);
await p.screenshot({ path: `${out}/3-flick-mid.png` });
await p.waitForTimeout(1200);
const after = await state();
await p.screenshot({ path: `${out}/4-after-flick.png` });
check('flick: switches to the next sock, swatches in sync', `"${before.name}" → "${after.name}", ringed swatch "${after.on}", back at x ${after.x}`, after.name !== before.name && after.on === after.name && Math.abs(after.x) < 2);

for (const x of rows) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.label}: ${x.got}`);
console.log(`\nfailures: ${rows.filter((x) => !x.ok).length}`);
await b.close();
