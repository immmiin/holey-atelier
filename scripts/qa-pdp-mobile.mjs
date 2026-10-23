// Phone product page: screenshots (first screen + full page) and checks at 375×667, 390×844, 430×932
// for two socks — no horizontal overflow, text ≥ 13px, tap targets ≥ 44px, bar never covers content,
// no clothesline/receipts, swatch navigation crossfades in place.   BASE=… node scripts/qa-pdp-mobile.mjs [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const out = process.argv[2] || 'qa/pdp/mobile';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
let bad = 0;
for (const [W, H] of [[375, 667], [390, 844], [430, 932]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  for (const s of ['lost-in-laundry', 'grass-stain']) {
    await p.goto(`${BASE}/socks/${s}`);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `${out}/${W}x${H}-${s}-first.png` });
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(100); }
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const vis = (e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
      const main = document.querySelector('#main');
      const small = [], tiny = [];
      for (const e of main.querySelectorAll('*')) {
        if (!vis(e) || e.closest('[aria-hidden="true"]')) continue;
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
        if (own && parseFloat(getComputedStyle(e).fontSize) < 13) small.push(e.className + ':' + getComputedStyle(e).fontSize);
        if (e.matches('a, button, [role=tab], [role=radio]')) { const b = e.getBoundingClientRect(); if (b.width < 44 || b.height < 44) tiny.push(`${e.className || e.tagName} ${Math.round(b.width)}×${Math.round(b.height)}`); }
      }
      const bar = document.querySelector('.mpdp__bar').getBoundingClientRect();
      const add = document.querySelector('.mpdp__btn--primary').getBoundingClientRect();
      scrollTo(0, document.documentElement.scrollHeight);
      const lastFoot = [...document.querySelectorAll('footer.foot *')].filter(vis).reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
      const barNow = document.querySelector('.mpdp__bar').getBoundingClientRect();
      const g = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        small: [...new Set(small)], tiny: [...new Set(tiny)],
        removed: !document.querySelector('#main .cl, #main .rv, #main .lineup, .pdp2'),
        addH: Math.round(add.height), barH: Math.round(bar.height),
        barCovers: lastFoot > barNow.top + 1,
        gallery: [Math.round(g('.mpdp__slides').left), Math.round(innerWidth - g('.mpdp__slides').right), +(g('.mpdp__slides').width / g('.mpdp__slides').height).toFixed(3)],
        dots: document.querySelectorAll('.mpdp__dots button').length,
        careOpen: !document.querySelector('.mpdp__care-body').hidden,
        cards: document.querySelectorAll('.mpdp__grid li').length
      };
    });
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
    await p.screenshot({ path: `${out}/${W}x${H}-${s}-full.png`, fullPage: true });
    const ok = r.overflow === 0 && !r.small.length && !r.tiny.length && r.removed && r.addH >= 48 && !r.barCovers && r.dots === 2 && !r.careOpen && r.cards === 5 && r.gallery[0] === 20 && r.gallery[1] === 20;
    if (!ok) bad++;
    console.log(`${W}x${H} ${s.padEnd(16)} overflow ${r.overflow}  text<13: ${r.small.length ? r.small.join(' ') : 'none'}  targets<44: ${r.tiny.length ? r.tiny.join(' | ') : 'none'}  clothesline/receipts gone: ${r.removed}  gallery gutters ${r.gallery[0]}/${r.gallery[1]} ratio ${r.gallery[2]}  dots ${r.dots}  care closed: ${!r.careOpen}  cards ${r.cards}  Add ${r.addH}px  bar covers content: ${r.barCovers}  ${ok ? 'PASS' : 'FAIL'}`);
  }
  // swatch → crossfade in place (no wash transition), and the "Read more" / care toggles work
  if (W === 390) {
    await p.goto(`${BASE}/socks/lost-in-laundry`); await p.waitForTimeout(2500);
    await p.evaluate(() => scrollTo(0, 300)); await p.waitForTimeout(400);
    await p.click('.mpdp__swatch[aria-label="Grass Stain"]');
    await p.waitForTimeout(120);
    const mid = await p.evaluate(() => ({ url: location.pathname, wash: !!document.querySelector('.wash.is-active, .wash--cover, [class*="wash"][class*="cover"]'), title: document.querySelector('.mpdp__title')?.textContent, y: scrollY }));
    await p.waitForTimeout(800);
    const end = await p.evaluate(() => ({ title: document.querySelector('.mpdp__title').textContent, label: document.querySelector('.mpdp__colors-label').textContent, on: document.querySelector('.mpdp__swatch.is-on').getAttribute('aria-label') }));
    await p.click('.mpdp__care-head'); await p.waitForTimeout(200);
    const care = await p.evaluate(() => !document.querySelector('.mpdp__care-body').hidden);
    const more = await p.locator('.mpdp__more').count();
    console.log(`swatch tap: ${mid.url}, title "${end.title}", label "${end.label}", ringed "${end.on}", page stayed at y=${mid.y}; care opens on tap: ${care}; "Read more" shown: ${more > 0}`);
    await p.screenshot({ path: `${out}/390x844-swatch-care-open.png` });
  }
  await ctx.close();
}
console.log(`\nfailures: ${bad}`);
await b.close();
