// Every page at phone widths: nothing under the nav strip at load, no sideways scroll, no errors.
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const paths = ['/', '/shop', '/socks/heel-yeah', '/about', '/faq', '/contact', '/legal/terms', '/checkout', '/nope'];
for (const w of [375, 390]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 812 }, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const p of paths) {
    await page.goto('http://localhost:5173' + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const nb = document.querySelector('.nav').getBoundingClientRect().bottom;
      const under = [...document.querySelectorAll('main *')]
        .filter((el) => el.children.length === 0 && el.textContent.trim())
        .filter((el) => { const b = el.getBoundingClientRect(); return b.height && b.top < nb && b.bottom > 0; })
        .map((el) => el.textContent.trim().slice(0, 20));
      return { under, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    await page.screenshot({ path: `screenshots/mobile-after/page-${w}${p.replace(/\//g, '_')}.png` });
    console.log(w, p.padEnd(18), r.under.length ? 'UNDER NAV: ' + r.under.join(' | ') : 'clear', r.overflow ? 'OVERFLOW' : '');
  }
  if (errors.length) console.log('errors', errors);
}
await browser.close();
