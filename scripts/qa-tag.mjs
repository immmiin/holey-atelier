// /atelier (desktop): the price tag hangs from a pin on the live line (85% along), swings, counts up,
// floats "+$" deltas and flinches the wage on pops, warms in colour, stamps SOLD OUT at $99; the stage
// message sits bottom-left and intersects nothing (line, sock, thread, heap, tag, Change sock) at 0%,
// 40%, 90% (and 100%). Usage: node scripts/qa-tag.mjs [outDir] [w h …]   (BASE=…)
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/tag';
const nums = process.argv.slice(3).map(Number);
const sizes = nums.length ? nums.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []) : [[1440, 900], [1280, 800], [1024, 768]];
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const rows = [];
const check = (label, got, ok) => rows.push({ label, got, ok: !!ok });

const boxes = (p) =>
  p.evaluate(() => {
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
    const st = window.__holey, cv = document.querySelector('.atl__stage').getBoundingClientRect();
    const sb = window.__holeySockBox();
    const xs = [...st.rope1.x], ys = [...st.rope1.y];
    const h = st.heap;
    const union = (a, b) => (!a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });
    const tag = union(union(R(document.querySelector('.atl__hang .tag-card')), R(document.querySelector('.atl__tagpin'))), R(document.querySelector('.atl__tagstring')));
    return {
      msg: R(document.querySelector('.atl__msg')),
      msgText: document.querySelector('.atl__msg').textContent,
      line: R(document.querySelector('.atl__line .cl__rope-line')),
      sock: sb && { l: cv.left + sb.left, t: cv.top + sb.top, r: cv.left + sb.left + sb.width, b: cv.top + sb.top + sb.height },
      thread: { l: cv.left + Math.min(...xs) - 3, t: cv.top + Math.min(...ys), r: cv.left + Math.max(...xs) + 3, b: cv.top + Math.max(...ys) },
      heap: h.length > 1 ? { l: cv.left + h.cx - h.width / 2, t: cv.top + h.base - h.height, r: cv.left + h.cx + h.width / 2, b: cv.top + h.base } : null,
      tag,
      back: R(document.querySelector('.atl__back')),
      nav: R(document.querySelector('.nav__body')),
      counter: R(document.querySelector('.atl__counter'))
    };
  });
const hit = (a, b) => a && b && a.r > b.l && a.l < b.r && a.b > b.t && a.t < b.b;

for (const [W, H] of sizes) {
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/atelier?sock=grass-stain');
  await p.waitForFunction(() => window.__holey?.pulling, null, { timeout: 20000 });
  await p.waitForTimeout(1500);

  // the tag hangs from the line: its pin's grip sits on the rope at 85% of the line
  const hang = await p.evaluate(() => {
    const line = document.querySelector('.atl__line .cl__stage').getBoundingClientRect();
    const room = document.querySelector('.atl__room').getBoundingClientRect();
    // the hanger's origin is the pin's grip point (it rotates about it): read it off its transform
    const m = document.querySelector('.atl__hang').style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
    const gripX = room.left + +m[1], gripY = room.top + +m[2];
    // the rope's y at gripX, read off the drawn path
    const path = document.querySelector('.atl__line .cl__rope-line');
    const len = path.getTotalLength();
    let best = null;
    for (let s = 0; s <= len; s += 1) { const q = path.getPointAtLength(s); const d = Math.abs(line.left + q.x - gripX); if (!best || d < best.d) best = { d, y: line.top + q.y }; }
    const pin = document.querySelector('.atl__tagpin').getBoundingClientRect();
    const pinOnLine = gripY >= pin.top && gripY <= pin.bottom;
    const string = document.querySelector('.atl__tagstring').getBoundingClientRect(), eye = document.querySelector('.atl__hang .tag-eyelet').getBoundingClientRect();
    return { along: (gripX - line.left - 12) / (line.width - 24), offLine: gripY - best.y, pinOnLine, stringToEyelet: Math.abs(string.bottom - (eye.top + eye.height / 2)), price: getComputedStyle(document.querySelector('.atl__hang .tag-price')).fontSize, font: getComputedStyle(document.querySelector('.atl__hang .tag-price')).fontFamily.split(',')[0] };
  });
  check(`${W} tag hangs from a pin ON the line`, `pin at ${(hang.along * 100).toFixed(1)}% of the line, grip ${hang.offLine.toFixed(1)}px off the rope, string ends ${hang.stringToEyelet.toFixed(1)}px from the eyelet; price ${hang.price} ${hang.font}`, Math.abs(hang.along - 0.85) < 0.005 && Math.abs(hang.offLine) <= 2 && hang.pinOnLine && hang.stringToEyelet <= 6);

  if (W === 1440) {
    // real pulling: deltas float, the tag swings, the wage flinches, the count-up is smooth
    const t0 = await p.evaluate(() => ({ th: getComputedStyle(document.querySelector('.atl__hang')).transform }));
    const seen = { deltas: new Set(), flinch: 0, rot: new Set(), prices: [] };
    for (let i = 0; i < 8; i++) {
      const g = await p.evaluate(() => { const cv = document.querySelector('.atl__stage').getBoundingClientRect(), q = window.__holey.debug().grabPoint; return { x: cv.left + q.x, y: cv.top + q.y }; });
      await p.mouse.move(g.x, g.y);
      await p.mouse.down();
      for (let k = 1; k <= 16; k++) {
        await p.mouse.move(g.x, g.y + k * 9);
        const s = await p.evaluate(() => ({ d: [...document.querySelectorAll('.tag-delta')].map((e) => e.textContent), f: document.querySelector('.tag-rows .wage').classList.contains('is-flinch'), rot: document.querySelector('.atl__hang').style.transform.match(/rotate\(([-\d.]+)deg/)?.[1], price: document.querySelector('.atl__hang .tag-price').textContent, wage: document.querySelector('.tag-rows .wage').textContent.trim(), wc: getComputedStyle(document.querySelector('.tag-rows .wage')).color }));
        s.d.forEach((x) => seen.deltas.add(x));
        if (s.f) seen.flinch++;
        if (s.rot) seen.rot.add(Math.round(+s.rot));
        seen.prices.push(s.price);
        seen.wage = s.wage;
        seen.wc = s.wc;
      }
      await p.mouse.up();
      await p.waitForTimeout(150);
    }
    const ups = new Set(seen.prices).size;
    check('1440 pops float "+$" deltas next to the price', [...seen.deltas].slice(0, 6).join(' '), seen.deltas.size >= 2 && [...seen.deltas].every((d) => /^\+\$\d+\.\d\d$/.test(d)));
    check('1440 the tag swings a little on its string (angle varies, |angle| ≤ 8°)', `angles seen: ${[...seen.rot].sort((a, b) => a - b).join(', ')}°`, seen.rot.size >= 3 && [...seen.rot].every((a) => Math.abs(a) <= 8));
    check('1440 the price counts up smoothly', `${ups} distinct values while pulling, ${seen.prices[0]} → ${seen.prices.at(-1)}`, ups >= 10);
    check('1440 "Your wage" never changes (just flinches)', `"${seen.wage}" ${seen.wc}, flinching in ${seen.flinch} samples`, seen.wage === '$0.00' && seen.flinch > 0);
    await p.screenshot({ path: `${out}/1440-pulling.png` });
  }

  for (const prog of [0, 0.4, 0.9, 1]) {
    if (prog === 0) await p.evaluate(() => window.__holey.resetSock());
    else await p.evaluate((v) => window.__holey.setProgress(v), prog);
    await p.waitForTimeout(2600);
    const x = await boxes(p);
    const col = await p.evaluate(() => ({ price: document.querySelector('.atl__hang .tag-price').textContent, color: getComputedStyle(document.querySelector('.atl__hang .tag-price')).color, sold: getComputedStyle(document.querySelector('.tag-sold')).opacity }));
    await p.screenshot({ path: `${out}/${W}x${H}-${Math.round(prog * 100)}.png` });
    if (prog < 1) {
      const against = ['line', 'sock', 'thread', 'heap', 'tag', 'back'];
      const hits = against.filter((k) => hit(x.msg, x[k]));
      check(`${W} ${Math.round(prog * 100)}%: message "${x.msgText}" ∩ line/sock/thread/heap/tag/Change sock`, hits.length ? hits.join(', ') : 'none', !hits.length);
    }
    const tagHits = ['nav', 'counter', 'sock'].filter((k) => hit(x.tag, x[k]));
    check(`${W} ${Math.round(prog * 100)}%: tag ∩ nav/counter/sock — price ${col.price} in ${col.color}${+col.sold > 0.5 ? ', SOLD OUT stamp' : ''}`, tagHits.length ? tagHits.join(', ') : 'none', !tagHits.length && (prog < 1 || +col.sold > 0.5));
  }
  await ctx.close();
}
// reduced motion: no swing / deltas; colour still warms
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/atelier?sock=grass-stain');
  await p.waitForFunction(() => window.__holey?.pulling, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  const g = await p.evaluate(() => { const cv = document.querySelector('.atl__stage').getBoundingClientRect(), q = window.__holey.debug().grabPoint; return { x: cv.left + q.x, y: cv.top + q.y }; });
  let rot = new Set(), deltas = 0;
  for (let r = 0; r < 3; r++) {
    const g2 = await p.evaluate(() => { const cv = document.querySelector('.atl__stage').getBoundingClientRect(), q = window.__holey.debug().grabPoint; return { x: cv.left + q.x, y: cv.top + q.y }; });
    await p.mouse.move(g2.x, g2.y); await p.mouse.down();
    for (let k = 1; k <= 16; k++) { await p.mouse.move(g2.x, g2.y + k * 9); const s = await p.evaluate(() => ({ rot: document.querySelector('.atl__hang').style.transform.match(/rotate\(([-\d.]+)deg/)?.[1], d: [...document.querySelectorAll('.tag-delta')].filter((e) => getComputedStyle(e).display !== 'none').length })); rot.add(s.rot); deltas += s.d; }
    await p.mouse.up();
  }
  await p.evaluate(() => window.__holey.setProgress(0.6)); await p.waitForTimeout(800);
  const c = await p.evaluate(() => getComputedStyle(document.querySelector('.atl__hang .tag-price')).color);
  check('reduced motion: no swing, no floating deltas; colour still warms', `angles ${[...rot].join(',')}, visible deltas ${deltas}, colour at 60% ${c}`, [...rot].every((v) => +v === 0) && deltas === 0 && c !== 'rgb(26, 15, 31)');
  await ctx.close();
}
for (const x of rows) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.label}: ${x.got}`);
console.log(`\nfailures: ${rows.filter((x) => !x.ok).length}`);
await b.close();
