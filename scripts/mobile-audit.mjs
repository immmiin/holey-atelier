// Mobile audit: for each route, report horizontal overflow, clickable things smaller than 44×44,
// visible text under 13px, and (home) whether the washer shows in the first screen.
// Usage: node scripts/mobile-audit.mjs [width] [height] [routes…]   (BASE=…)
import { chromium } from 'playwright';

const W = Number(process.argv[2] || 390), H = Number(process.argv[3] || 844);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const routes = process.argv.slice(4).length ? process.argv.slice(4) : ['/', '/about', '/faq', '/shop', '/atelier', '/archive', '/checkout', '/socks/heel-yeah'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
let total = 0;

async function audit(label, scope = 'body') {
  const r = await p.evaluate((scope) => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
      const rc = el.getBoundingClientRect();
      if (rc.width < 1 || rc.height < 1) return false;
      if (el.closest('[aria-hidden="true"], .sr-only, .visually-hidden, .skip-link, [inert]')) return false;
      // clipped away by a scrolling/hidden-overflow ancestor
      for (let a = el.parentElement; a; a = a.parentElement) {
        const o = getComputedStyle(a).overflow;
        if (o !== 'visible') {
          const ar = a.getBoundingClientRect();
          if (rc.right <= ar.left || rc.left >= ar.right || rc.bottom <= ar.top || rc.top >= ar.bottom) return false;
        }
      }
      return true;
    };
    const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${el.textContent ? ` "${el.textContent.trim().slice(0, 24)}"` : ''}`;
    const small = new Map();
    const root = document.querySelector(scope) || document.body;
    for (const el of root.querySelectorAll('a[href], button, [role="button"], [role="slider"], input, select, textarea, summary, label[for]')) {
      if (!vis(el) || el.disabled) continue;
      const rc = el.getBoundingClientRect();
      if (rc.width < 43.5 || rc.height < 43.5) small.set(name(el), `${Math.round(rc.width)}×${Math.round(rc.height)}`);
    }
    const tiny = new Map();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || !vis(el)) continue;
      // the home counter's stat labels are 12px caps by request (value 18px above each)
      if (el.matches('.teaser__counter > span')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12.95) tiny.set(name(el), `${fs.toFixed(1)}px`);
    }
    return {
      // innerWidth grows with overflowing content in mobile emulation; the screen is clientWidth
      overflow: Math.max(document.documentElement.scrollWidth, window.innerWidth) - document.documentElement.clientWidth,
      small: [...small].slice(0, 30),
      tiny: [...tiny].slice(0, 30)
    };
  }, scope);
  const n = (r.overflow > 0 ? 1 : 0) + r.small.length + r.tiny.length;
  total += n;
  console.log(`\n${label}  overflow=${r.overflow}px  small-targets=${r.small.length}  tiny-text=${r.tiny.length}`);
  r.small.forEach(([k, v]) => console.log(`   target ${v}  ${k}`));
  r.tiny.forEach(([k, v]) => console.log(`   text   ${v}  ${k}`));
}

for (const route of routes) {
  await p.goto(BASE + route);
  await p.waitForTimeout(2200);
  // scroll through so lazy sections mount
  const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hgt; y += H * 0.8) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(90);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  if (route === '/') {
    const fold = await p.evaluate(() => {
      const m = document.querySelector('.machine')?.getBoundingClientRect();
      return m ? Math.round(Math.min(window.innerHeight, m.bottom) - m.top) : -1;
    });
    console.log(`\n/ washer visible in first screen: ${fold}px`);
    if (fold < 60) total++;
  }
  await audit(`${W}x${H} ${route}`);
}
// the menu sheet and the cart drawer
await p.goto(BASE + '/');
await p.waitForTimeout(1500);
await p.locator('.nav__menu-btn').click();
await p.waitForTimeout(700);
await audit(`${W}x${H} menu`, '#tag-menu');
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
await p.locator('.basket-btn').first().click();
await p.waitForTimeout(900);
await audit(`${W}x${H} cart`, '.bdrawer__panel');
console.log(`\nTOTAL issues: ${total}`);
await b.close();
