// Flags any page that scrolls sideways, and names the widest offenders.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:5173';
const paths = ['/', '/atelier', '/shop', '/socks/heel-yeah', '/socks/grass-stain', '/about', '/faq', '/contact', '/legal/terms', '/checkout', '/nope'];
const browser = await chromium.launch({ channel: 'chrome' });
for (const w of [375, 768, 1440]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 800 } })).newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const over = document.documentElement.scrollWidth > W + 1;
      const bad = [];
      if (over)
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.cl--scroll,.rcpt__row,.tapem-clip,.tagmenu__socks'))
            bad.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} → ${Math.round(b.right)}`);
        }
      return { over, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 5) };
    });
    console.log(w, p, r.over ? `OVERFLOW sw=${r.sw}` : 'ok', r.bad.join(' | '));
  }
}
await browser.close();
