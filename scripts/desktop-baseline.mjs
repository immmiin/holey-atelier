// Captures a desktop "fingerprint" so mobile-only changes can be proven not to touch ≥768px.
// Usage: node scripts/desktop-baseline.mjs <outDir>
//  - layout.json: offset box + key computed styles of every element (transforms/animation-free)
//  - *.png: reduced-motion screenshots (deterministic), grain + cursor hidden
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.argv[2] || 'screenshots/baseline-before';
const base = 'http://localhost:5173';
const paths = ['/', '/shop', '/socks/heel-yeah', '/about', '/faq', '/contact', '/legal/terms', '/checkout', '/nope'];
const widths = [768, 1024, 1440];
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const layout = {};
for (const w of widths) {
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    for (const p of paths) {
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await page.addStyleTag({ content: '.grain,.hc{display:none!important}' });
      if (!reduced) {
        layout[`${w}${p}`] = await page.evaluate(() => {
          const keys = ['display', 'position', 'top', 'left', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'fontSize', 'width', 'height', 'gridTemplateColumns', 'aspectRatio', 'zIndex'];
          return [...document.querySelectorAll('body *')]
            .filter((el) => !el.closest('svg') || el.tagName === 'svg')
            .map((el) => {
              const cs = getComputedStyle(el);
              return [el.tagName, el.className?.baseVal ?? el.className, el.offsetTop, el.offsetLeft, el.offsetWidth, el.offsetHeight, ...keys.map((k) => cs[k])].join('|');
            });
        });
      } else {
        await page.screenshot({ path: `${out}/${w}${p.replace(/\//g, '_') || '_'}.png`, fullPage: true });
      }
    }
    await ctx.close();
  }
}
await fs.writeFile(`${out}/layout.json`, JSON.stringify(layout));
await browser.close();
console.log('baseline saved to', out, Object.keys(layout).length, 'page/width combos');
