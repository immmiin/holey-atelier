// Nav clearance: scroll each section's top to the top of the viewport (as an anchor jump does) and
// check its first content starts ≥ 48px below the bottom of the fixed nav.
// Usage: node scripts/qa-nav.mjs [w h …]   (BASE=…)
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const args = process.argv.slice(2).map(Number);
const sizes = args.length ? args.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []) : [[1440, 900], [1280, 800], [1024, 768], [390, 844]];
const routes = ['/', '/about', '/faq', '/shop', '/archive'];
const b = await chromium.launch();
let bad = 0;
for (const [W, H] of sizes) {
  const mobile = W < 768;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: mobile, hasTouch: mobile });
  for (const route of routes) {
    await p.goto(BASE + route);
    await p.waitForTimeout(1500);
    const n = await p.evaluate(() => document.querySelectorAll('#main > *, #main > * > section, #main > * > header').length);
    for (let i = 0; i < n; i++) {
      const name = await p.evaluate((k) => {
        const all = [...document.querySelectorAll('#main > *, #main > * > section, #main > * > header')];
        const s = all[k];
        if (s.querySelector(':scope > section') || s.getBoundingClientRect().height < 40) return null;
        // a page's first header shares its page's top: measure it where it really sits, at the page's top
        const at = s.parentElement.id !== 'main' && s === s.parentElement.firstElementChild ? s.parentElement : s;
        window.scrollTo(0, at.getBoundingClientRect().top + scrollY);
        return s.id ? '#' + s.id : '.' + String(s.className).split(/\s+/)[0];
      }, i);
      // the shop's line belongs to its header block: it starts 48px under the filter row by design
      if (!name || name === '.shop__line') continue;
      await p.waitForTimeout(1300); // reveals finish rising
      const r = await p.evaluate((k) => {
        const s = [...document.querySelectorAll('#main > *, #main > * > section, #main > * > header')][k];
        const nav = document.querySelector('.nav');
        let navBottom = 0;
        for (const el of [nav, ...nav.querySelectorAll('*')]) {
          const cs = getComputedStyle(el), b = el.getBoundingClientRect();
          if (b.width && b.height && cs.visibility !== 'hidden' && cs.display !== 'none' && b.top < 200 && !el.closest('[hidden], .nav__menu, .nav__sheet, .cart')) navBottom = Math.max(navBottom, b.bottom);
        }
        // first real content: text, media, controls — not decoration or full-bleed backgrounds
        let top = Infinity, who = '';
        for (const el of s.querySelectorAll('h1,h2,h3,p,a,button,img,video,canvas,svg,li,figure,blockquote')) {
          if (el.closest('[aria-hidden="true"]')) continue;
          const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
          if (!b.width || !b.height || b.width >= innerWidth * 0.98 || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
          if (b.bottom < 0 || b.top > innerHeight) continue;
          if (b.top < top) (top = b.top), (who = el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).split(/\s+/)[0]);
        }
        return { navBottom: Math.round(navBottom), top: Math.round(top), who };
      }, i);
      if (r.top === Infinity) continue; // nothing measurable in view (e.g. a row that only scrolls sideways)
      const gap = r.top - r.navBottom;
      const ok = gap >= 48;
      if (!ok) bad++;
      console.log(`${W}x${H} ${route.padEnd(9)} ${name.padEnd(18)} nav bottom ${String(r.navBottom).padStart(3)}  content top ${String(r.top).padStart(4)} (${r.who})  gap ${String(gap).padStart(4)}px  ${ok ? 'PASS' : 'FAIL'}`);
    }
  }
  await p.close();
}
console.log(`\nfailures: ${bad}`);
await b.close();
