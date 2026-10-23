// Desktop pixel diff for several pages at 1440×900 (first screen + full page).
// Capture: node scripts/qa-desktop-diff.mjs shoot <dir>     Compare: node scripts/qa-desktop-diff.mjs diff <dirA> <dirB>
// Reduced motion + mocked API + no LCD text keep captures repeatable; the drum's tumbling socks are hidden.
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const [mode, a, bdir] = process.argv.slice(2);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const ROUTES = ['/', '/about', '/shop', '/faq', '/archive', '/atelier', '/socks/grass-stain'];
if (mode === 'shoot') {
  fs.mkdirSync(a, { recursive: true });
  const b = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('holey-stats-v1', JSON.stringify({ totalLaborSec: 920, totalOrders: 24, brandRevenue: 923.18, wagesPaid: 0 })));
  await ctx.route('**/api/stats', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"totalLaborSec":920,"totalOrders":24,"brandRevenue":923.18,"wagesPaid":0}' }));
  await ctx.route('**/api/archive**', (r) => r.fulfill({ status: 503, body: '{}' }));
  const p = await ctx.newPage();
  for (const route of ROUTES) {
    const name = route === '/' ? 'home' : route.slice(1).replace(/\//g, '-');
    await p.goto(BASE + route);
    // the two socks tumbling in the hero drum never stop (not even with reduced motion): hide them in every capture
    await p.addStyleTag({ content: '.porthole__drum { visibility: hidden !important; }' });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${a}/${name}-first.png` });
    if (route === '/atelier') continue; // one screen, no scroll
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 600) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(120); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${a}/${name}-full.png`, fullPage: true });
  }
  await b.close();
} else {
  let total = 0;
  for (const f of fs.readdirSync(a).filter((x) => x.endsWith('.png')).sort()) {
    const A = await sharp(`${a}/${f}`).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const B = await sharp(`${bdir}/${f}`).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    if (A.info.width !== B.info.width || A.info.height !== B.info.height) { console.log(`${f}: SIZE DIFFERS ${A.info.width}×${A.info.height} vs ${B.info.width}×${B.info.height}`); total += 1; continue; }
    let diff = 0;
    for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) diff++;
    total += diff;
    console.log(`${f.padEnd(28)} ${A.info.width}×${A.info.height}  ${diff} differing pixels`);
  }
  console.log(`total differing pixels: ${total}`);
}
