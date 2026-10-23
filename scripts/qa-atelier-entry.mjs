// "Make the Atelier obvious": nav highlight + phone pill, /atelier lands picked & pull-ready
// (default / ?sock= / bad ?sock), Change sock, background-sock switching, the washer's SPIN ME + dial
// wobble and first-spin / reduced-motion behaviour, the desktop hand cursor (open → closed) and the
// phone finger hint (loops until the first pull; static with reduced motion). Screenshots for each.
// Usage: node scripts/qa-atelier-entry.mjs [outDir]   (BASE=…)
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import { spin } from './qa-spin.mjs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/atelier-entry';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const rows = [];
const check = (label, got, ok) => rows.push({ label, got, ok: !!ok });
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { ...devices['iPhone 13'] };

const pickedName = (p) => p.evaluate(() => document.querySelector('.atl__stage')?.getAttribute('aria-label')?.split(' hanging')[0] || null);
const waitPulling = (p) => p.waitForFunction(() => window.__holey?.pulling && document.querySelector('.atl.is-active'), null, { timeout: 20000 });

// ---- 1. nav
{
  const p = await (await b.newContext(DESK)).newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(2000);
  const n = await p.evaluate(() => {
    const a = document.querySelector('.nav__link--atelier'), cs = getComputedStyle(a), after = getComputedStyle(a, '::after');
    const others = [...document.querySelectorAll('.nav__link:not(.nav__link--atelier)')].map((e) => getComputedStyle(e).backgroundColor);
    const tail = a.querySelector('.btn__tail svg');
    return { bg: cs.backgroundColor, fg: cs.color, stitch: after.borderStyle, tail: !!tail, wiggle: tail && getComputedStyle(tail).animationName, plainOthers: others.every((c) => c === 'rgba(0, 0, 0, 0)') };
  });
  check('desktop nav: "The Atelier" green pill, cream text, dashed stitch, yarn tail wiggling; others plain', JSON.stringify(n), n.bg === 'rgb(31, 91, 58)' && n.fg === 'rgb(251, 241, 232)' && n.stitch === 'dashed' && n.tail && n.wiggle === 'tail-wiggle' && n.plainOthers);
  await p.screenshot({ path: `${out}/1440-nav.png`, clip: { x: 380, y: 0, width: 680, height: 110 } });
  await p.context().close();
}
{
  const p = await (await b.newContext(PHONE)).newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => {
    const R = (s) => document.querySelector(s)?.getBoundingClientRect();
    const a = R('.nav__atelier'), cart = R('.nav .basket-btn'), menu = R('.nav__menu-btn');
    return { h: Math.round(a.height), w: Math.round(a.width), visible: a.width > 0, bg: getComputedStyle(document.querySelector('.nav__atelier')).backgroundColor, nextToCart: Math.round(cart.left - a.right), menu: menu.width > 0, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('mobile header: "Atelier" pill next to the cart, ≥ 44px tall, menu kept', JSON.stringify(m), m.visible && m.h >= 44 && m.bg === 'rgb(31, 91, 58)' && m.nextToCart >= 0 && m.nextToCart <= 16 && m.menu && m.overflow === 0);
  await p.screenshot({ path: `${out}/390-header.png`, clip: { x: 0, y: 0, width: 390, height: 80 } });
  // stays visible after scrolling
  await p.evaluate(() => scrollTo(0, 2000));
  await p.waitForTimeout(500);
  const still = await p.evaluate(() => { const r = document.querySelector('.nav__atelier').getBoundingClientRect(); return r.top >= 0 && r.bottom <= 80 && r.width > 0; });
  check('mobile header: pill still visible after scrolling', still, still);
  await p.context().close();
}

// ---- 2. straight to pulling
for (const [name, opts] of [['1440', DESK], ['390', PHONE]]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  for (const [q, want] of [['', 'Heel Yeah'], ['?sock=toe-jam', 'Toe Jam'], ['?sock=nope', 'Heel Yeah']]) {
    await p.goto(BASE + '/atelier' + q);
    await waitPulling(p);
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => ({ hint: window.__holey.pulling && !window.__holey.finished, change: document.querySelector('.atl__back')?.textContent.trim(), lineView: !document.querySelector('.atl.is-active') }));
    const got = await pickedName(p);
    check(`${name} /atelier${q || ''}: lands picked + pull-ready, no click`, `"${got}", pull-ready ${r.hint}, control "${r.change}"`, got === want && r.hint && r.change === 'Change sock' && !r.lineView);
    if (!q) await p.screenshot({ path: `${out}/${name}-atelier-initial.png` });
  }
  // background sock → switch
  const target = await p.evaluate(() => {
    const el = [...document.querySelectorAll('.atl__line .cl__sock:not(.is-picked)')][3];
    const r = el.querySelector('.cl__img').getBoundingClientRect();
    // tap a visible part of it (the hanging price tag can cover part of a background sock)
    const tag = document.querySelector('.atl__hang .tag-card')?.getBoundingClientRect();
    let x = r.left + r.width / 2;
    if (tag && tag.width && x > tag.left - 6 && x < tag.right) x = Math.max(r.left + 8, tag.left - 14);
    return { x, y: r.top + r.height * 0.45 };
  });
  await p.mouse.click(target.x, target.y);
  await waitPulling(p);
  await p.waitForTimeout(1600);
  const sw = await pickedName(p);
  check(`${name} tap a blurred background sock → switches`, `"${sw}"`, sw && sw !== 'Heel Yeah');
  // Change sock → the line view, then pick from it
  await p.click('.atl__back');
  await p.waitForTimeout(900);
  const line = await p.evaluate(() => !document.querySelector('.atl.is-active'));
  await p.screenshot({ path: `${out}/${name}-change-sock-line.png` });
  const s2 = await p.locator('.atl__line .cl__sock').nth(1).locator('.cl__img').boundingBox();
  await p.mouse.click(s2.x + s2.width / 2, s2.y + s2.height / 2);
  await waitPulling(p);
  await p.waitForTimeout(1200);
  const s2n = await pickedName(p);
  check(`${name} "Change sock" opens the line view; picking from it works`, `line view ${line}, then "${s2n}"`, line && s2n === 'Lost in Laundry');
  await ctx.close();
}

// ---- 3. washer
for (const [name, opts, reduce] of [['1440', DESK, false], ['390', PHONE, false], ['1440-reduced', DESK, true]]) {
  const ctx = await b.newContext({ ...opts, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(2500);
  const before = await p.evaluate(() => {
    const k = document.querySelector('.machine__knob'), st = document.querySelector('.spinme');
    return { knob: Math.round(k.getBoundingClientRect().width), icon: !!k.querySelector('.machine__knob-icon'), screen: document.querySelector('.machine__screen').textContent, wobble: getComputedStyle(k).animationName, bob: getComputedStyle(st).animationName, sticker: getComputedStyle(st).visibility, label: st.textContent };
  });
  if (!reduce) await p.screenshot({ path: `${out}/${name}-washer-before-spin.png`, clip: await p.evaluate(() => { const r = document.querySelector('.machine').getBoundingClientRect(); return { x: Math.max(0, r.left - 60), y: Math.max(0, r.top + scrollY - 60), width: Math.min(r.width + 120, innerWidth - Math.max(0, r.left - 60)), height: 300 }; }), fullPage: true });
  if (reduce) {
    check('reduced motion: no wobble / bob, sticker shown', JSON.stringify(before), before.wobble === 'none' && before.bob === 'none' && before.sticker === 'visible');
    // with reduced motion a drag on the drum completes the spin at once
    const g = await p.locator('.porthole__glass').boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 3);
    await p.mouse.down();
    await p.mouse.up();
    await p.waitForTimeout(1200);
    const after = await p.evaluate(() => ({ done: document.querySelector('.machine__screen').textContent, sticker: getComputedStyle(document.querySelector('.spinme')).visibility }));
    check('reduced motion: sticker stays after spinning', JSON.stringify(after), after.sticker === 'visible' && /DONE/.test(after.done));
  } else {
    check(`${name} washer before the first spin: dial ×1.4 with ↻, "DRAG TO SPIN", wobble + SPIN ME bob`, JSON.stringify(before), before.icon && before.screen === 'DRAG TO SPIN' && before.wobble === 'knob-wobble' && before.bob === 'spinme-bob' && before.sticker === 'visible' && /spin me/i.test(before.label));
    if (name === '1440') {
      await spin(p);
      await p.waitForTimeout(1500);
      const after = await p.evaluate(() => ({ touched: document.querySelector('.washer').classList.contains('is-touched'), wobble: getComputedStyle(document.querySelector('.machine__knob')).animationName, sticker: getComputedStyle(document.querySelector('.spinme')).visibility, screen: document.querySelector('.machine__screen').textContent }));
      check('after the first spin: wobble stops, sticker hidden', JSON.stringify(after), after.touched && after.wobble === 'none' && after.sticker === 'hidden');
    }
  }
  await ctx.close();
}

// ---- 4a. desktop hand
{
  const ctx = await b.newContext(DESK);
  const p = await ctx.newPage();
  await p.goto(BASE + '/atelier');
  await waitPulling(p);
  await p.waitForTimeout(1200);
  const gp = await p.evaluate(() => { const r = document.querySelector('.atl__stage').getBoundingClientRect(), g = window.__holey.debug().grabPoint; return { x: r.left + g.x, y: r.top + g.y }; });
  await p.mouse.move(gp.x - 120, gp.y - 60);
  await p.mouse.move(gp.x, gp.y, { steps: 6 });
  await p.waitForTimeout(250);
  const hov = await p.evaluate(() => { const h = document.querySelector('.atl-hand'), svg = h.querySelector('.atl-hand__open').getBoundingClientRect(), hc = document.querySelector('.hc'); return { on: h.classList.contains('is-on'), state: h.dataset.state, size: Math.round(svg.width), cursor: getComputedStyle(document.querySelector('.atl__stage')).cursor, hole: hc ? getComputedStyle(hc).opacity + '/' + getComputedStyle(hc).visibility + '/' + getComputedStyle(hc).display : 'none' }; });
  await p.screenshot({ path: `${out}/1440-hand-hover.png`, clip: { x: gp.x - 200, y: gp.y - 160, width: 400, height: 320 } });
  check('desktop hand over the thread: open, 56px, system cursor hidden', JSON.stringify(hov), hov.on && hov.state === 'open' && hov.size === 56 && hov.cursor === 'none');
  await p.mouse.down();
  await p.mouse.move(gp.x + 4, gp.y + 70, { steps: 10 });
  await p.waitForTimeout(150);
  const drag = await p.evaluate(() => { const h = document.querySelector('.atl-hand'); return { on: h.classList.contains('is-on'), state: h.dataset.state, grab: document.querySelector('.atl__stage').dataset.grab, p: Math.round(window.__holey.debug().p * 1000) / 10 }; });
  await p.screenshot({ path: `${out}/1440-hand-dragging.png`, clip: { x: gp.x - 200, y: gp.y - 100, width: 400, height: 320 } });
  await p.mouse.up();
  check('desktop hand while dragging: closed (pinching)', JSON.stringify(drag), drag.on && drag.state === 'closed' && drag.grab === '2');
  // the hole cursor (if the site uses it) never shows inside the scene
  const hole = await p.evaluate(() => { const hc = document.querySelector('.hc'); if (!hc) return 'not rendered'; const r = hc.querySelector('.hc__ring')?.getBoundingClientRect(); const cs = getComputedStyle(hc.querySelector('.hc__ring') || hc); return `${cs.opacity} ${cs.visibility} ${r ? Math.round(r.width) : 0}px`; });
  check('hole cursor hidden in the scene (no duplicate cursor)', hole, hole === 'not rendered' || /^0 |hidden| 0px/.test(hole));
  await ctx.close();
}

// ---- 4b. phone finger
for (const reduce of [false, true]) {
  const ctx = await b.newContext({ ...PHONE, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/atelier');
  await waitPulling(p);
  await p.waitForTimeout(1200);
  const f = await p.evaluate(() => {
    const el = document.querySelector('.atl-finger');
    if (!el) return null;
    const r = el.getBoundingClientRect(), cv = document.querySelector('.atl__stage').getBoundingClientRect(), g = window.__holey.debug().grabPoint;
    return { anim: getComputedStyle(el.querySelector('.atl-finger__hand')).animationName, dx: Math.round(Math.min(Math.abs(r.left - (cv.left + g.x)), Math.abs(r.right - (cv.left + g.x)))), side: el.className.split('--')[1] };
  });
  await p.screenshot({ path: `${out}/390-finger${reduce ? '-reduced' : ''}.png` });
  if (!reduce) {
    check('phone: finger beside the thread, looping pull-down', JSON.stringify(f), f && f.anim === 'finger-pull' && f.dx <= 30);
    // a real pull (touch-sized pointer on the thread) hides it
    const gp = await p.evaluate(() => { const r = document.querySelector('.atl__stage').getBoundingClientRect(), g = window.__holey.debug().grabPoint; return { x: r.left + g.x, y: r.top + g.y }; });
    await p.mouse.move(gp.x, gp.y);
    await p.mouse.down();
    await p.mouse.move(gp.x, gp.y + 60, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(500);
    const gone = await p.evaluate(() => !document.querySelector('.atl-finger'));
    check('phone: finger hint gone after the first pull', gone, gone);
  } else {
    check('phone, reduced motion: static gesture hint', JSON.stringify(f), f && f.anim === 'none');
  }
  await ctx.close();
}

for (const x of rows) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.label}: ${x.got}`);
console.log(`\nfailures: ${rows.filter((x) => !x.ok).length}`);
await b.close();
