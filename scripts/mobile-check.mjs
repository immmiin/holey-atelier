// Mobile QA: per-section screenshots + nav/text overlap detection + video playback,
// in Chromium (375, 390) and WebKit (iPhone 14 profile).
// Usage: node scripts/mobile-check.mjs [outDir]
import { chromium, devices } from 'playwright';
// Playwright ≥1.57 ships a WebKit build that can't drive macOS 14; point PW_WEBKIT at an older
// playwright package (e.g. 1.56.1) to run the Safari checks there.
const { webkit } = process.env.PW_WEBKIT ? await import(process.env.PW_WEBKIT) : await import('playwright');
import fs from 'node:fs/promises';
const out = process.argv[2] || 'screenshots/mobile';
const only = process.argv[3]; // optional run-name filter
const base = 'http://localhost:5173';
await fs.mkdir(out, { recursive: true });
const SECTIONS = ['.hero2', '.laundry', '.line-sec', '.tape-cross', '.care', '.missing', '.lf', '.rcpt', '.board-sec', '.foot'];
const runs = [
  ['chromium-375', chromium, { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['chromium-390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['webkit-iphone14', webkit, { ...devices['iPhone 14'] }],
  ['webkit-375', webkit, { ...devices['iPhone 14'], viewport: { width: 375, height: 812 } }]
];
const summary = [];
for (const [name, type, opts] of runs.filter((r) => !only || r[0].includes(only))) {
  const browser = await type.launch(type === chromium ? { channel: 'chrome' } : {});
  const page = await (await browser.newContext(opts)).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // WebKit's headless build logs its own media-control icon failures; not page errors
  page.on('console', (m) => m.type() === 'error' && !/Button failed to load, iconName/.test(m.text()) && errors.push(m.text()));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}-00-top.png` });

  // overlap: walk the page; anything with text whose box intersects the nav's *visible* box
  const overlaps = new Set();
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 240) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(60);
    const hits = await page.evaluate(() => {
      const nav = document.querySelector('.nav__tag');
      const band = document.querySelector('.nav');
      if (!nav) return [];
      const boxes = [nav.getBoundingClientRect()];
      // if the nav paints an opaque band and the tag sits inside it, content is scrolling *under* the
      // band (hidden), never visibly overlapped
      const bandOpaque = band && getComputedStyle(band).backgroundColor !== 'rgba(0, 0, 0, 0)';
      const br = band.getBoundingClientRect();
      const t = boxes[0];
      if (bandOpaque && t.top >= br.top - 1 && t.bottom <= br.bottom + 1 && t.left >= br.left - 1 && t.right <= br.right + 1) return [];
      const out = [];
      const texty = document.querySelectorAll('main h1, main h2, main h3, main p, main li, main dt, main dd, main a, main button, main figcaption, main .tapem__item, main .kicker');
      for (const el of texty) {
        if (el.closest('.nav')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
        for (const n of boxes) {
          const ix = Math.min(r.right, n.right) - Math.max(r.left, n.left);
          const iy = Math.min(r.bottom, n.bottom) - Math.max(r.top, n.top);
          if (ix > 2 && iy > 2) {
            // fully tucked under an opaque band = scrolled past, fine; partially poking out below/around = overlap
            const under = bandOpaque && r.bottom <= band.getBoundingClientRect().bottom + 1;
            if (!under) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 30)}"`);
          }
        }
      }
      return out;
    });
    hits.forEach((h) => overlaps.add(h));
  }
  // at scroll 0 nothing may sit under the nav at all
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const topHits = await page.evaluate(() => {
    const n = (document.querySelector('.nav') || document.querySelector('.nav__tag')).getBoundingClientRect();
    const tag = document.querySelector('.nav__tag').getBoundingClientRect();
    const bottom = Math.max(tag.bottom, getComputedStyle(document.querySelector('.nav')).backgroundColor !== 'rgba(0, 0, 0, 0)' ? n.bottom : 0);
    return [...document.querySelectorAll('main *')]
      .filter((el) => el.children.length === 0 && (el.textContent || '').trim() && !el.closest('.nav'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.top < bottom - 1 && r.bottom > 0;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${el.textContent.trim().slice(0, 25)}"`);
  });

  // hero geometry at load: whole machine in view, polaroid clear of nav + headline
  const hero = await page.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect();
    const hit = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const nav = r('.nav'), m = r('.machine'), pol = r('.hero2__polaroid'), st = r('.hero2__sticker');
    return {
      machineFullyVisible: m.top >= nav.bottom - 1 && m.bottom + 16 <= innerHeight,
      machine: [Math.round(m.top), Math.round(m.bottom), innerHeight],
      polaroidHitsNav: hit(pol, nav),
      polaroidHitsHeadline: hit(pol, r('.hero2__title')) || hit(pol, r('.hero2__kicker')),
      stickerHitsNav: hit(st, nav)
    };
  });

  // per-section shots
  for (const [i, sel] of SECTIONS.entries()) {
    const el = page.locator(sel).first();
    if (!(await el.count())) continue;
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(sel === '.laundry' ? 2500 : 700);
    await el.screenshot({ path: `${out}/${name}-${String(i + 1).padStart(2, '0')}-${sel.slice(1)}.png` });
  }
  // video state
  await page.locator('.laundry').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const vid = await page.evaluate(() => {
    const v = document.querySelector('.laundry video');
    if (!v) return 'no <video> (poster only)';
    return { playing: !v.paused && v.currentTime > 0, t: +v.currentTime.toFixed(2), src: v.currentSrc.split('/').pop(), mutedAttr: v.hasAttribute('muted'), ready: v.readyState };
  });
  // section gaps: distance between the bottom of each section's content and the next section's content
  const gaps = await page.evaluate((sels) =>
    sels
      .map((s) => document.querySelector(s))
      .filter(Boolean)
      .map((el) => `${el.className.split(' ')[0]}:${Math.round(el.getBoundingClientRect().height)}`).join(' ')
  , SECTIONS);
  summary.push({ name, hero, overlapsWhileScrolling: [...overlaps].slice(0, 12), underNavAtTop: topHits.slice(0, 8), video: vid, sectionHeights: gaps, errors });
  await browser.close();
}
for (const s of summary) console.log(JSON.stringify(s, null, 1));
