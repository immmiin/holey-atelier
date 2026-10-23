// The purchase flow: every purchase goes through pulling the thread (1440×900 and 390×844).
//  - no "+" / add-to-cart anywhere on the line-ups (home, /shop clothesline, laundry pile, phone picker)
//  - a laundry-pile card opens its product page
//  - pull the product card's thread to ~30% with real drags → the price updates → Add to basket
//    → the basket shows the sock with its hole % and labor
//  - legacy undistressed cart lines are dropped on load
//  - pulling the Atelier tail (nav pill / phone pill / hero button) past 60px lands on /atelier;
//    a short pull springs back; with reduced motion it's a plain click
// Usage: node scripts/qa-purchase.mjs [outDir]   (BASE=…)
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/purchase';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const rows = [];
const check = (label, got, ok) => rows.push({ label, got, ok: !!ok });
const SIZES = [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { ...devices['iPhone 13'] }]];

const noPlus = (p) =>
  p.evaluate(() => {
    const scopes = [...document.querySelectorAll('#line, .shop__line, .shop__pile, .lineup, .tpick')];
    const bad = scopes.flatMap((s) =>
      [...s.querySelectorAll('button, a, [role="button"]')].filter((e) => {
        const t = (e.textContent || '').trim(), l = e.getAttribute('aria-label') || '';
        return t === '+' || /^add\b/i.test(t) || /add .* to basket/i.test(l) || e.matches('.cl__add, .tagc__add, .tpick__add');
      })
    );
    return { scopes: scopes.length, bad: bad.map((e) => e.className || e.textContent) };
  });

/** drag the card's loose thread down until the sock is ≥ target unravelled */
async function pullTo(p, target) {
  for (let i = 0; i < 40; i++) {
    const s = await p.evaluate(() => {
      const st = window.__holeyCard, cv = st.canvas.getBoundingClientRect(), g = st.debug().grabPoint;
      return { p: st.debug().p, x: cv.left + g.x, y: cv.top + g.y, bottom: cv.bottom };
    });
    if (s.p >= target) return s.p;
    await p.mouse.move(s.x, s.y);
    await p.mouse.down();
    const dy = Math.min(140, s.bottom - s.y - 20);
    for (let k = 1; k <= 14; k++) await p.mouse.move(s.x, s.y + (dy * k) / 14);
    await p.mouse.up();
    await p.waitForTimeout(120);
  }
  return p.evaluate(() => window.__holeyCard.debug().p);
}

for (const [name, opts] of SIZES) {
  const ctx = await b.newContext(opts);
  // a saved cart from before: plain slugs and an "as sold" line — both must be dropped
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('qa-seeded')) {
      localStorage.setItem('holey-cart-v1', JSON.stringify(['heel-yeah', { slug: 'toe-jam' }]));
      sessionStorage.setItem('qa-seeded', '1');
    }
  });
  const p = await ctx.newPage();
  await p.route('**/api/orders', (r) => r.fulfill({ status: 503, body: '{}' }));

  await p.goto(BASE + '/');
  await p.waitForTimeout(2000);
  const legacy = await p.evaluate(() => JSON.parse(localStorage.getItem('holey-cart-v1') || '[]'));
  check(`${name} legacy undistressed cart lines dropped on load`, JSON.stringify(legacy), Array.isArray(legacy) && legacy.length === 0);
  await p.evaluate(() => document.querySelector('#line').scrollIntoView());
  await p.waitForTimeout(1500);
  const home = await noPlus(p);
  check(`${name} home line-up: no "+" / add-to-cart`, JSON.stringify(home), home.scopes > 0 && home.bad.length === 0);
  await p.screenshot({ path: `${out}/${name}-home-lineup.png` });

  await p.goto(BASE + '/shop');
  await p.waitForTimeout(2500);
  const shop = await noPlus(p);
  check(`${name} /shop clothesline + laundry pile: no "+" / add-to-cart`, JSON.stringify(shop), shop.scopes >= 2 && shop.bad.length === 0);
  const tag = await p.evaluate(() => [...document.querySelectorAll('.tagc__price')].map((e) => e.textContent)[0]);
  check(`${name} pile card keeps name, tagline, "$9.00 + your labor"`, tag, tag === '$9.00 + your labor');
  await p.evaluate(() => document.querySelector('.shop__pile').scrollIntoView());
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${name}-shop-pile.png` });
  if (name === '1440') {
    const card = await p.locator('.tagc').nth(2).boundingBox();
    await p.mouse.move(card.x + card.width / 2, card.y + card.height / 3);
    await p.waitForTimeout(300);
    const hand = await p.evaluate(() => ({ on: document.querySelector('.hand-cursor')?.classList.contains('is-on'), hole: getComputedStyle(document.querySelector('.hc__ring') || document.body).width }));
    check('1440 hovering a pile card shows the hand cursor', JSON.stringify(hand), hand.on);
  }
  // a laundry-pile card → its product page
  const first = await p.evaluate(() => document.querySelector('.pile .tagc__link').getAttribute('href'));
  await p.locator('.pile .tagc__link').first().click();
  await p.waitForURL('**/socks/**', { timeout: 10000 });
  await p.waitForTimeout(1500);
  check(`${name} laundry-pile card → product page`, new URL(p.url()).pathname, new URL(p.url()).pathname === first);

  // pull ~30% on the product page
  await p.waitForFunction(() => window.__holeyCard?.pulling, null, { timeout: 15000 });
  await p.waitForTimeout(600);
  const priceSel = name === '1440' ? '.pdp2__price' : '.mpdp__bar-price';
  const addSel = name === '1440' ? '.pdp2__add' : '.mpdp__btn--primary';
  const before = await p.evaluate(([ps, as]) => ({ price: document.querySelector(ps).textContent, btn: document.querySelector(as).textContent, disabled: document.querySelector(as).disabled }), [priceSel, addSel]);
  check(`${name} before pulling: "Add to basket" disabled as "Pull first"`, JSON.stringify(before), before.disabled && before.btn === 'Pull first' && before.price === '$9.00');
  await p.screenshot({ path: `${out}/${name}-pdp-before.png` });
  const got = await pullTo(p, 0.3);
  await p.waitForTimeout(500);
  const after = await p.evaluate(([ps, as]) => ({ price: document.querySelector(ps).textContent, hud: (document.querySelector('.pdp2__hud') || document.querySelector('.mpdp__bar-hud')).textContent, btn: document.querySelector(as).textContent, disabled: document.querySelector(as).disabled }), [priceSel, addSel]);
  await p.screenshot({ path: `${out}/${name}-pdp-pulled.png` });
  check(`${name} pulled to ${Math.round(got * 100)}% (real drags): price updates live`, JSON.stringify(after), got >= 0.29 && parseFloat(after.price.slice(1)) > 9 && !after.disabled && after.btn === 'Add to basket' && /Hole [1-9]\d?% · Labor \d+:\d\d · Your wage \$0\.00/.test(after.hud));
  await p.click(addSel);
  await p.waitForTimeout(2200);
  const cart = await p.evaluate(() => {
    const lines = JSON.parse(localStorage.getItem('holey-cart-v1') || '[]');
    const drawer = [...document.querySelectorAll('.bdrawer__item')].map((e) => e.textContent).join(' ');
    return { lines: lines.map((l) => ({ slug: l.slug, hole: l.hole, price: l.price, laborMs: l.laborMs })), shows: /\d+% hole · labor \d+:\d\d/.test(drawer) };
  });
  await p.screenshot({ path: `${out}/${name}-cart.png` });
  check(`${name} Add to basket → the basket shows the pulled sock with hole % + labor`, JSON.stringify(cart), cart.lines.length === 1 && cart.lines[0].hole >= 29 && cart.lines[0].price > 9 && cart.shows);
  await ctx.close();
}

// pull-to-enter
for (const [name, opts, sel] of [
  ['1440 nav pill', SIZES[0][1], '.nav__link--atelier .btn__tail--pull'],
  ['1440 hero button', SIZES[0][1], '.hero2__ctas .btn--thread .btn__tail--pull'],
  ['390 header pill', SIZES[1][1], '.nav__atelier .btn__tail--pull']
]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(2500);
  const t = await p.locator(sel).boundingBox();
  const x = t.x + t.width / 2, y = t.y + t.height / 2;
  // a short pull: springs back, stays put
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let k = 1; k <= 8; k++) await p.mouse.move(x, y + k * 4);
  const mid = await p.evaluate((s) => { const tail = document.querySelector(s), host = tail.closest('a, button'); return { tail: tail.style.transform, host: host.style.translate }; }, sel);
  if (name.startsWith('1440 nav')) await p.screenshot({ path: `${out}/1440-nav-tail-pulling.png`, clip: { x: x - 200, y: 0, width: 400, height: 160 } });
  await p.mouse.up();
  await p.waitForTimeout(600);
  const stayed = new URL(p.url()).pathname;
  check(`${name}: a 32px pull stretches + dips, then springs back without navigating`, `${JSON.stringify(mid)} → ${stayed}`, /scaleY/.test(mid.tail) && /px/.test(mid.host) && stayed === '/');
  // past 60px: pop, bounce, /atelier
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let k = 1; k <= 12; k++) await p.mouse.move(x, y + k * 7);
  await p.mouse.up();
  await p.waitForURL('**/atelier**', { timeout: 8000 }).catch(() => {});
  check(`${name}: pulled past 60px → /atelier`, new URL(p.url()).pathname, new URL(p.url()).pathname === '/atelier');
  await ctx.close();
}
// reduced motion: click only
{
  const ctx = await b.newContext({ ...SIZES[0][1], reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/');
  await p.waitForTimeout(2000);
  const pe = await p.evaluate(() => getComputedStyle(document.querySelector('.nav__link--atelier .btn__tail--pull')).pointerEvents);
  await p.click('.nav__link--atelier');
  await p.waitForURL('**/atelier**', { timeout: 8000 }).catch(() => {});
  check('reduced motion: the tail is not draggable; a click on the pill enters', `tail pointer-events ${pe} → ${new URL(p.url()).pathname}`, pe === 'none' && new URL(p.url()).pathname === '/atelier');
  await ctx.close();
}

for (const x of rows) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.label}: ${x.got}`);
console.log(`\nfailures: ${rows.filter((x) => !x.ok).length}`);
await b.close();
