// About hero: the ink gap between the bottom of the "p" descender in "purpose" and the top of the
// lead's first line, plus alignment and sticker collisions.  Usage: node scripts/qa-about-lead.mjs  (BASE=…)
import { chromium } from 'playwright';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const b = await chromium.launch();
for (const [W, H] of [[1440, 900], [1000, 800], [390, 844]]) {
  const m = W < 768;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m });
  await p.goto(BASE + '/about');
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    const fontOf = (el) => { const c = getComputedStyle(el); return `${c.fontWeight} ${c.fontSize} ${c.fontFamily}`; };
    // the headline's "p" of "purpose": find the text node holding that p
    const h = document.querySelector('.about__title');
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
    const full = nodes.map((x) => x.data).join('');
    let at = full.indexOf('purpose'), node, off;
    for (const x of nodes) { if (at < x.data.length) { node = x; off = at; break; } at -= x.data.length; }
    const rg = document.createRange(); rg.setStart(node, off); rg.setEnd(node, off + 1);
    const pr = rg.getBoundingClientRect();
    ctx.font = fontOf(node.parentElement);
    const mp = ctx.measureText('p');
    const baseline = pr.top + (pr.height - (mp.fontBoundingBoxAscent + mp.fontBoundingBoxDescent)) / 2 + mp.fontBoundingBoxAscent;
    const desc = baseline + mp.actualBoundingBoxDescent;
    // the lead's first line: ink top of its first word
    const lead = document.querySelector('.about__lead');
    const lw = document.createTreeWalker(lead, NodeFilter.SHOW_TEXT); const ln = lw.nextNode();
    const lr = document.createRange(); lr.setStart(ln, 0); lr.setEnd(ln, ln.data.indexOf(' '));
    const lb = lr.getClientRects()[0];
    ctx.font = fontOf(ln.parentElement);
    const ml = ctx.measureText(ln.data.slice(0, ln.data.indexOf(' ')));
    const lBase = lb.top + (lb.height - (ml.fontBoundingBoxAscent + ml.fontBoundingBoxDescent)) / 2 + ml.fontBoundingBoxAscent;
    const inkTop = lBase - ml.actualBoundingBoxAscent;
    const L = lead.getBoundingClientRect(), T = h.getBoundingClientRect(), K = document.querySelector('.about__hero .kicker').getBoundingClientRect();
    const st = document.querySelector('.about__sticker'), S = st && getComputedStyle(st).display !== 'none' ? st.querySelector('img').getBoundingClientRect() : null;
    const hit = S && L.right > S.left && L.left < S.right && L.bottom > S.top && L.top < S.bottom;
    const notes = document.querySelector('.notes').getBoundingClientRect();
    return { gap: Math.round(inkTop - desc), leadLeft: Math.round(L.left), titleLeft: Math.round(T.left), kickerLeft: Math.round(K.left), align: getComputedStyle(lead).textAlign, chars: Math.round(L.width / parseFloat(getComputedStyle(lead).fontSize) * 2), marginTop: getComputedStyle(lead).marginTop, sticker: hit ? 'COLLIDES' : 'clear', toNotes: Math.round(notes.top - L.bottom) };
  });
  console.log(`${W}x${H}`, JSON.stringify(r));
  await p.screenshot({ path: `qa/pass/about-lead-${W}.png` });
  await p.close();
}
await b.close();
