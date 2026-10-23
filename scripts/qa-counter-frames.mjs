// Home "Pull a thread.": reload, scroll the section in, and sample every animation frame for 3 s — the
// counter's layout position (its row, relative to the stage) must never move — the counter's own
// 24px fade-and-rise entrance is ignored —, it must never overlap a tag, and it
// must sit ≈ 40px under the lowest tag once the socks have dropped in.  BASE=… node scripts/qa-counter-frames.mjs
import { chromium } from 'playwright';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const b = await chromium.launch();
let bad = 0;
for (const [W, H] of [[1440, 900], [1000, 800], [390, 844]]) {
  const m = W < 768;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m });
  await p.goto(BASE + '/');
  await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    const sec = document.querySelector('#line');
    const st = sec.querySelector('.cl__stage');
    const c = () => sec.querySelector('.teaser__counter');
    const row = () => sec.querySelector('.teaser__foot');
    const pos0 = c() ? Math.round(row().getBoundingClientRect().top - st.getBoundingClientRect().top) : null; // before it's ever on screen
    window.scrollTo(0, sec.getBoundingClientRect().top + scrollY);
    const frames = [];
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const cr = c()?.getBoundingClientRect(), sr = st.getBoundingClientRect();
        if (cr) {
          let low = -1e9, hit = 0;
          for (const t of sec.querySelectorAll('.cl__tag')) {
            const r = t.getBoundingClientRect();
            low = Math.max(low, r.bottom);
            if (r.right > cr.left && r.left < cr.right && r.bottom > cr.top && r.top < cr.bottom) hit++;
          }
          frames.push({ t: Math.round(performance.now() - t0), pos: Math.round(row().getBoundingClientRect().top - sr.top), gap: Math.round(cr.top - low), hit, text: c().querySelector('b')?.textContent });
        }
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    return { pos0, frames };
  });
  const f = r.frames;
  const positions = [...new Set(f.map((x) => x.pos))];
  const hits = f.filter((x) => x.hit).length;
  const settled = f.filter((x) => x.t > 1600).map((x) => x.gap);
  const counts = [...new Set(f.map((x) => x.text))];
  const ok = positions.length === 1 && positions[0] === r.pos0 && hits === 0 && Math.min(...settled) >= 36 && Math.max(...settled) <= 44;
  if (!ok) bad++;
  console.log(`${W}x${H}  ${f.length} frames  counter offset from stage: before scroll ${r.pos0}px, during [${positions.join(', ')}]px  overlapping frames: ${hits}  gap after drop-in ${Math.min(...settled)}–${Math.max(...settled)}px  first frame gap ${f[0].gap}px  count-up ${counts[0]} → ${counts[counts.length - 1]} (${counts.length} values)  ${ok ? 'PASS' : 'FAIL'}`);
  await p.close();
}
console.log(`\nfailures: ${bad}`);
await b.close();
