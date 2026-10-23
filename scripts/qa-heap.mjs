// /atelier: the yarn heap is never covered. Pick a sock, pull to 40% and 90% (the stage's test hook),
// then check every UI element in the room (message, buttons, tag, bar, toast, counter) against the
// heap's bounding box; screenshots with the boxes outlined.   BASE=… node scripts/qa-heap.mjs [outDir]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/m/heap';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
let bad = 0;
const SIZES = [['390x844', { ...devices['iPhone 13'] }], ['1440x900', { viewport: { width: 1440, height: 900 } }], ['1024x768', { viewport: { width: 1024, height: 768 } }], ['768x1024', { viewport: { width: 768, height: 1024 } }]];
for (const [name, opts] of SIZES) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  await p.goto(BASE + '/atelier?sock=purple-reign');
  await p.waitForFunction(() => window.__holey?.model, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  for (const prog of [0.4, 0.9]) {
    await p.evaluate((v) => window.__holey.setProgress(v), prog);
    await p.waitForTimeout(2500); // the yarn flows down into the heap
    const r = await p.evaluate(() => {
      const st = window.__holey, cv = document.querySelector('.atl__stage').getBoundingClientRect();
      const h = st.heap;
      const heap = { left: cv.left + h.cx - h.width / 2, right: cv.left + h.cx + h.width / 2, top: cv.top + h.base - h.height, bottom: cv.top + h.base };
      const ui = ['.atl__msg', '.atl__back', '.atl__tag', '.atl__bar', '.atl__added', '.atl__counter', '.tag-card']
        .flatMap((s) => [...document.querySelectorAll(s)])
        .filter((e) => { const c = getComputedStyle(e), q = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0 && q.width && q.height; })
        .map((e) => { const q = e.getBoundingClientRect(); return { el: '.' + e.className.split(' ')[0], text: e.textContent.trim().slice(0, 30), box: [q.left, q.top, q.right, q.bottom].map(Math.round), hit: q.right > heap.left && q.left < heap.right && q.bottom > heap.top && q.top < heap.bottom }; });
      // outline both for the screenshot
      document.querySelectorAll('.qa-box').forEach((e) => e.remove());
      const box = (q, col) => { const d = document.createElement('div'); d.className = 'qa-box'; Object.assign(d.style, { position: 'fixed', left: q.left + 'px', top: q.top + 'px', width: q.right - q.left + 'px', height: q.bottom - q.top + 'px', outline: `2px dashed ${col}`, zIndex: 9999, pointerEvents: 'none' }); document.body.appendChild(d); };
      box(heap, 'red');
      const m = document.querySelector('.atl__msg').getBoundingClientRect(); box(m, 'blue');
      return { p: Math.round(st.debug ? st.debug().p * 100 : 0), heap: [heap.left, heap.top, heap.right, heap.bottom].map(Math.round), heapLen: Math.round(h.length), ui, msgFont: getComputedStyle(document.querySelector('.atl__msg')).fontSize, msgLines: Math.round(m.height / parseFloat(getComputedStyle(document.querySelector('.atl__msg')).lineHeight)) };
    });
    await p.screenshot({ path: `${out}/${name}-${Math.round(prog * 100)}.png` });
    await p.evaluate(() => document.querySelectorAll('.qa-box').forEach((e) => e.remove()));
    const hits = r.ui.filter((u) => u.hit);
    if (hits.length) bad++;
    const msg = r.ui.find((u) => u.el === '.atl__msg');
    console.log(`${name} pulled ${Math.round(prog * 100)}%  heap box ${r.heap.join(',')} (${r.heapLen}px of yarn)  message "${msg?.text}" ${msg?.box.join(',')} ${r.msgFont} ${r.msgLines} line  message ∩ heap: ${msg?.hit ? 'INTERSECT' : 'none'}  any UI ∩ heap: ${hits.length ? hits.map((h) => h.el).join(', ') : 'none'}  ${hits.length ? 'FAIL' : 'PASS'}`);
  }
  await ctx.close();
}
console.log(`\nfailures: ${bad}`);
await b.close();
