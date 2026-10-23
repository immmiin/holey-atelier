// The washer's dramatic door + the "Spin complete" slip (1440×900, 1280×800, 390×844): spin for real,
// then check the door never covers the nav (stays ≥ 16px below it), stays inside the viewport, the H
// badge / dial / status bar don't move (±1px), the scale overshoots (~1.42) and settles at the target,
// and the slip intersects neither the door, the drum nor the nav, with its sock centred in its column.
// Usage: node scripts/qa-door.mjs [outDir]   (BASE=…)
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import { spin } from './qa-spin.mjs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/door';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const rows = [];
const check = (label, got, ok) => rows.push({ label, got, ok: !!ok });
const hit = (a, c) => a && c && a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom;
const r1 = (x) => Math.round(x * 10) / 10;

for (const [name, opts] of [['1440x900', { viewport: { width: 1440, height: 900 } }], ['1280x800', { viewport: { width: 1280, height: 800 } }], ['390x844', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(2800);
  const fixed = () => p.evaluate(() => {
    // centres + layout sizes: a wobble/tilt rotation changes the box but not these
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 + scrollY, w: e.offsetWidth, h: e.offsetHeight } : null; };
    return { badge: R('.hero2__sticker'), dial: R('.machine__knob'), screen: R('.machine__screen'), polaroid: R('.hero2__polaroid') };
  });
  const before = await fixed();
  // sample the door's scale while it opens (scale = length of the transform's y axis)
  await p.evaluate(() => {
    window.__doorScales = [];
    const g = document.querySelector('.porthole__glass');
    const tick = () => {
      const m = new DOMMatrix(getComputedStyle(g).transform);
      // sample from the moment the door is opening
      if (document.querySelector('.washer.is-open')) window.__doorScales.push(Math.hypot(m.m21, m.m22, m.m23));
      if (window.__doorScales.length < 240) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const opened = await spin(p);
  await p.waitForTimeout(900);
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(500);
  const after = await fixed();
  const m = await p.evaluate(() => {
    const B = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const thumb = B('.washer__thumb'), img = B('.washer__returned');
    const sc = window.__doorScales;
    return {
      door: B('.porthole__glass'), drum: B('.porthole'), nav: B('.nav__body') || B('.nav'), navBar: B('.nav'), card: B('.washer__out'),
      vw: document.documentElement.clientWidth, vh: innerHeight,
      peak: Math.max(...sc), final: sc[sc.length - 1],
      chosen: getComputedStyle(document.querySelector('.washer')).getPropertyValue('--door-angle') + ' / ' + getComputedStyle(document.querySelector('.washer')).getPropertyValue('--door-scale'),
      thumbDx: img && thumb ? img.left + img.width / 2 - (thumb.left + thumb.width / 2) : null,
      thumbDy: img && thumb ? img.top + img.height / 2 - (thumb.top + thumb.height / 2) : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inDrum: document.querySelector('.washer').classList.contains('slip-in'),
      card2: (() => { const c = document.querySelector('.washer__out'); if (!c) return null; const cs = getComputedStyle(c); return { bg: cs.backgroundColor, color: cs.color, rot: cs.rotate, cols: cs.gridTemplateColumns, gap: cs.columnGap, eyebrow: getComputedStyle(c.querySelector('.washer__eyebrow')).color, h: getComputedStyle(c.querySelector('.washer__msg')).fontSize, hits: [...c.querySelectorAll('a, button')].map((e) => Math.round(e.getBoundingClientRect().height)) }; })()
    };
  });
  await p.screenshot({ path: `${out}/${name}-door-open.png` });
  // the card on its own (phones: scroll it into view)
  await p.evaluate(() => document.querySelector('.washer__out')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${name}-result-card.png` });

  const navBottom = m.navBar.bottom;
  check(`${name} door opened (real spin)`, opened, opened);
  check(`${name} door vs nav: no intersection, ≥ 16px below its bottom`, `door top ${r1(m.door.top)} vs nav bottom ${r1(navBottom)} (+${r1(m.door.top - navBottom)}px)`, !hit(m.door, m.navBar) && m.door.top >= navBottom + 16);
  check(`${name} door inside the viewport`, `door ${r1(m.door.left)}–${r1(m.door.right)} × ${r1(m.door.top)}–${r1(m.door.bottom)} in ${m.vw}×${m.vh}; page overflow ${m.overflow}`, m.door.left >= 0 && m.door.right <= m.vw && m.door.top >= 0 && m.door.bottom <= m.vh && m.overflow === 0);
  check(`${name} door scale: overshoot then settle`, `swing ${m.chosen}: scale peak ${m.peak.toFixed(3)} → settles ${m.final.toFixed(3)}`, m.peak > m.final + 0.01 && m.final >= 1.05);
  const below = await p.evaluate(() => { const c = document.querySelector('.washer__out').getBoundingClientRect(), t = document.querySelector('.teaser').getBoundingClientRect(), k = document.querySelector('.teaser .kicker').getBoundingClientRect(), pol = document.querySelector('.hero2__polaroid').getBoundingClientRect(); return { cardBottom: c.bottom, teaserTop: t.top, eyebrow: k.top, polHit: pol.right > c.left && pol.left < c.right && pol.bottom > c.top && pol.top < c.bottom }; });
  check(`${name} result card clear of the next section (divider + eyebrow) and the polaroid`, `card bottom ${r1(below.cardBottom)}, divider ${r1(below.teaserTop)}, polaroid ∩ card: ${below.polHit}`, below.cardBottom <= below.teaserTop && !below.polHit);
  for (const k of ['badge', 'dial', 'screen', 'polaroid']) {
    if (!before[k] && !after[k]) continue; // the H badge is hidden on phones
    const d = Math.max(Math.abs(after[k].x - before[k].x), Math.abs(after[k].y - before[k].y), Math.abs(after[k].w - before[k].w), Math.abs(after[k].h - before[k].h));
    check(`${name} ${k === 'badge' ? 'H badge' : k === 'dial' ? 'dial' : k === 'polaroid' ? 'polaroid' : 'status bar'} unchanged before/after (±1px)`, `max Δ ${r1(d)}px`, d <= 1);
  }
  // in the machine the slip sits ON the revealed drum (by design); below it, it must clear the drum
  const against = m.inDrum ? ['door', 'nav'] : ['door', 'drum', 'nav'];
  check(`${name} result card (${m.inDrum ? 'in the drum' : 'below the washer'}) ∩ ${against.join(' / ')}`, against.filter((k) => hit(m.card, k === 'nav' ? m.navBar : m[k])).join(', ') || 'none', !against.some((k) => hit(m.card, k === 'nav' ? m.navBar : m[k])));
  check(`${name} sock thumbnail centred in its 96px column (±2px)`, `Δx ${r1(m.thumbDx)}px, Δy ${r1(m.thumbDy)}px`, Math.abs(m.thumbDx) <= 2 && Math.abs(m.thumbDy) <= 2);
  check(`${name} card style`, JSON.stringify(m.card2), m.card2 && m.card2.bg === 'rgb(31, 91, 58)' && m.card2.color === 'rgb(251, 241, 232)' && m.card2.rot === '-2deg' && (m.inDrum ? !/\s/.test(m.card2.cols.trim()) : m.card2.cols.startsWith('96px') && m.card2.gap === (name === '390x844' ? '16px' : '20px')) && m.card2.eyebrow === 'rgb(245, 245, 106)' && m.card2.hits.every((h) => h >= 44));
  await ctx.close();
}
for (const x of rows) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.label}: ${x.got}`);
console.log(`\nfailures: ${rows.filter((x) => !x.ok).length}`);
await b.close();
