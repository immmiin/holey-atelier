// Phone pass (iPhone 13, 390×844): measures every gap of the mobile spacing brief, the clothesline
// picker, and the /atelier back-button clearance; screenshots each item.   BASE=… node scripts/qa-mobile-pass.mjs [outDir]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/m/after';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const rows = [];
const check = (item, label, got, want, tol = 1) => {
  const ok = typeof want === 'function' ? want(got) : Math.abs(got - want) <= tol;
  rows.push({ item, label, got, want: typeof want === 'function' ? want.toString().replace(/^\(?\w+\)?\s*=>\s*/, '') : want, ok });
};
const shot = async (sel, name, pad = 24) => {
  const box = await p.evaluate(([s, pd]) => { const els = s.split('|').map((x) => document.querySelector(x)).filter(Boolean); const rs = els.map((e) => e.getBoundingClientRect()); const top = Math.min(...rs.map((r) => r.top)) + scrollY - pd, bottom = Math.max(...rs.map((r) => r.bottom)) + scrollY + pd; return { top, bottom }; }, [sel, pad]);
  await p.evaluate((y) => scrollTo(0, y), Math.max(0, box.top));
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true, clip: { x: 0, y: Math.max(0, box.top), width: 390, height: Math.min(box.bottom - box.top, 2400) } });
};

await p.goto(BASE + '/');
await p.waitForTimeout(3000);
// let every reveal play, then measure at rest
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 400) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(140); }
await p.waitForTimeout(1500);
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(800);

const m = await p.evaluate(() => {
  const R = (s, root = document) => { const e = root.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const nav = R('.nav');
  const pill = R('.hero2__kicker span');
  const h1 = R('.hero2__title');
  // the longest line ("No refunds.") as rendered
  const t = document.querySelector('.hero2__title');
  let lineW = 0;
  { const rects = []; const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.data.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); rects.push(...r.getClientRects()); } const lines = new Map(); for (const q of rects) { const k = Math.round(q.top); const L = lines.get(k) || { l: 1e9, r: -1e9 }; L.l = Math.min(L.l, q.left); L.r = Math.max(L.r, q.right); lines.set(k, L); } lineW = Math.max(...[...lines.values()].map((L) => L.r - L.l)); }
  const container = document.querySelector('.hero2').clientWidth - 2 * parseFloat(getComputedStyle(document.querySelector('.hero2')).paddingLeft);
  const machine = R('.machine'), hint = R('.washer__hint'), lead = R('.hero2__lead'), ctas = R('.hero2__ctas');
  const teaser = document.querySelector('.teaser'), tr = teaser.getBoundingClientRect(), before = getComputedStyle(teaser, '::before');
  const divTop = tr.top + parseFloat(before.top), divBottom = divTop + parseFloat(before.height);
  const eyebrow = R('.teaser .kicker');
  // MISSING
  const tabs = [...document.querySelectorAll('.poster__tabs .tab, .poster__tabs')].map((e) => e.getBoundingClientRect());
  const tabsBottom = Math.max(...tabs.map((r) => r.bottom));
  const nb = R('.missing__side .kicker'), mh2 = R('.missing__side .h3'), mbody = R('.missing__side .lead'), mcount = R('.missing__side .missing__count') || R('.missing__side .missing__out');
  const missing = R('#missing'), msidebottom = Math.max(...[...document.querySelectorAll('.missing__side > *')].map((e) => e.getBoundingClientRect().bottom));
  // footer
  const wave = R('.foot__wave'), ft = R('.foot__title'), report = R('.report');
  // clothesline picker
  const pick = document.querySelector('#line .tpick');
  const swipeHints = [...document.querySelectorAll('#line .snaphint, #line .snapdots, #line .cl--scroll')].filter((e) => getComputedStyle(e).display !== 'none').length;
  return {
    navBottom: nav.bottom, pillTop: pill.top, pillBottom: pill.bottom, h1Top: h1.top, h1Bottom: h1.bottom, lineW, container, h1Font: parseFloat(getComputedStyle(t).fontSize),
    machineTop: machine.top, machineBottom: machine.bottom, hintTop: hint.top, hintBottom: hint.bottom, leadTop: lead.top, leadBottom: lead.bottom, ctasTop: ctas.top, ctasBottom: ctas.bottom,
    divTop, divBottom, eyebrowTop: eyebrow.top,
    tabsBottom, nbTop: nb.top, nbBottom: nb.bottom, mh2Top: mh2.top, mh2Bottom: mh2.bottom, mbodyTop: mbody.top, mbodyBottom: mbody.bottom, mcountTop: mcount?.top, missingBottom: missing.bottom, msidebottom,
    waveBottom: wave.bottom, ftTop: ft.top, ftBottom: ft.bottom, ftFont: parseFloat(getComputedStyle(document.querySelector('.foot__title')).fontSize), reportTop: report.top,
    picker: pick ? {
      socks: pick.querySelectorAll('.tpick__sock').length,
      swatches: pick.querySelectorAll('.tpick__swatch').length,
      name: pick.querySelector('.tpick__name')?.textContent, price: pick.querySelector('.tpick__price')?.textContent,
      add: pick.querySelector('.tpick__add')?.textContent, pull: pick.querySelector('.tpick__pull')?.textContent,
      sockCentre: (() => { const r = pick.querySelector('.tpick__sock').getBoundingClientRect(); return Math.round(r.left + r.width / 2); })(),
      sockH: Math.round(pick.querySelector('.tpick__sock').getBoundingClientRect().height)
    } : null,
    swipeHints,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
});
const r = (x) => Math.round(x);
check(1, 'header bottom → pill', r(m.pillTop - m.navBottom), 20);
check(1, `"No refunds." width / container (${r(m.lineW)} / ${r(m.container)}), H1 ${m.h1Font.toFixed(1)}px`, +(m.lineW / m.container * 100).toFixed(1), (v) => v >= 89 && v <= 95);
check(1, 'pill → H1', r(m.h1Top - m.pillBottom), 12);
check(1, 'H1 → washer', r(m.machineTop - m.h1Bottom), 20);
check(2, 'washer bottom → "drag the drum to spin"', r(m.hintTop - m.machineBottom), 16);
check(2, 'hint → body copy', r(m.leadTop - m.hintBottom), 24);
check(2, 'body → CTAs', r(m.ctasTop - m.leadBottom), 20);
check(3, 'CTAs → dashed divider', r(m.divTop - m.ctasBottom), 40);
check(3, 'divider → "TODAY\'S LINE-UP"', r(m.eyebrowTop - m.divBottom), 40);
check(4, 'picker: 1 sock, 6 swatches, name/price/Add/Pull', m.picker ? `${m.picker.socks} sock, ${m.picker.swatches} swatches, "${m.picker.name}" ${m.picker.price} "${m.picker.add}" "${m.picker.pull}", sock centre x ${m.picker.sockCentre}, ${m.picker.sockH}px tall` : 'missing', (v) => v !== 'missing' && /^1 sock, 6 swatches/.test(v) && /centre x 19[3-7]/.test(v));
check(4, 'swipe row / "swipe →" hint visible in #line', m.swipeHints, 0, 0);
check(5, 'tabs (visual bottom) → "NOTICE BOARD"', r(m.nbTop - m.tabsBottom), 56);
check(5, 'eyebrow → H2', r(m.mh2Top - m.nbBottom), 8);
check(5, 'H2 → body', r(m.mbodyTop - m.mh2Bottom), 12);
check(5, 'body → tabs counter', r(m.mcountTop - m.mbodyBottom), 20);
check(5, 'section bottom padding (last content → section end)', r(m.missingBottom - m.msidebottom), 56);
check(6, 'wave bottom → heading', r(m.ftTop - m.waveBottom), 56);
check(6, 'heading → form card', r(m.reportTop - m.ftBottom), 28);
check(6, 'heading size', m.ftFont, 32, 0);
check('-', 'home horizontal overflow', m.overflow, 0, 0);

await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/1-hero-top.png` }); // first screen: header, pill, H1, washer
await shot('.machine|.washer__hint|.hero2__lead|.hero2__ctas', '2-under-washer');
await shot('.hero2__ctas|.teaser .kicker', '3-divider');
await shot('#line', '4-clothesline', 0);
await shot('.poster__tabs|.missing__side', '5-missing');
await shot('.foot__wave|.report', '6-footer');

// 7: /atelier picked state
await p.goto(BASE + '/atelier');
await p.waitForTimeout(2500);
const sock = p.locator('.atl__line .cl__sock').nth(2);
const bb = await sock.locator('.cl__img').boundingBox();
await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
await p.waitForTimeout(2500);
const a = await p.evaluate(() => {
  const nav = document.querySelector('.nav').getBoundingClientRect();
  const back = document.querySelector('.atl__back').getBoundingClientRect();
  const posts = [...document.querySelectorAll('.atl__line .cl__post')].map((e) => e.getBoundingClientRect());
  const stage = document.querySelector('.atl__line .cl__stage').getBoundingClientRect();
  const lineTop = Math.min(...posts.map((q) => q.top));
  const hit = posts.some((q) => q.right > back.left && q.left < back.right && q.bottom > back.top && q.top < back.bottom) || (stage.top < back.bottom && stage.bottom > back.top && stage.left < back.right && stage.right > back.left);
  return { navBottom: nav.bottom, back: [back.left, back.top, back.right, back.bottom].map(Math.round), lineTop, hit, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
check(7, 'header → "← Back to the line"', r(a.back[1] - a.navBottom), 12);
check(7, 'button bottom → clothesline top (knobs)', r(a.lineTop - a.back[3]), (v) => v >= 24);
check(7, 'button ∩ clothesline (bounding boxes)', a.hit ? 'intersect' : 'none', (v) => v === 'none');
check('-', '/atelier horizontal overflow', a.overflow, 0, 0);
await p.screenshot({ path: `${out}/7-atelier-picked.png` });

for (const x of rows) console.log(`${String(x.item).padEnd(2)} ${x.ok ? 'PASS' : 'FAIL'}  ${x.label}: ${x.got}${typeof x.got === 'number' ? 'px' : ''}  (want ${x.want})`);
console.log(`\nfailures: ${rows.filter((x) => !x.ok).length}`);
await b.close();
