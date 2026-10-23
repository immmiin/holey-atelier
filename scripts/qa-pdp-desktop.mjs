// Desktop product page pixel diff. Capture:  node scripts/qa-pdp-desktop.mjs shoot <dir>
// Compare:  node scripts/qa-pdp-desktop.mjs diff <dirA> <dirB>      (BASE=…)
// Reduced motion keeps the 3D sock and the clotheslines still, so captures are repeatable.
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
const [mode, a, bdir] = process.argv.slice(2);
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const SOCKS = ['lost-in-laundry', 'grass-stain'];
if (mode === 'shoot') {
  fs.mkdirSync(a, { recursive: true });
  const b = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none', '--force-color-profile=srgb'] }); // text AA is otherwise not repeatable
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('holey-stats-v1', JSON.stringify({ totalLaborSec: 920, totalOrders: 24, brandRevenue: 923.18, wagesPaid: 0 })));
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 503, body: '{}' })); // live numbers would differ between runs
  const p = await ctx.newPage();
  for (const s of SOCKS) {
    await p.goto(`${BASE}/socks/${s}`);
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${a}/${s}-first.png` });
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 600) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(120); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${a}/${s}-full.png`, fullPage: true });
  }
  await b.close();
} else {
  let total = 0;
  for (const f of fs.readdirSync(a).filter((x) => x.endsWith('.png'))) {
    const A = await sharp(`${a}/${f}`).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const B = await sharp(`${bdir}/${f}`).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
      console.log(`${f}: SIZE DIFFERS ${A.info.width}×${A.info.height} vs ${B.info.width}×${B.info.height}`); total++; continue;
    }
    let diff = 0;
    for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) diff++;
    total += diff;
    console.log(`${f}: ${A.info.width}×${A.info.height}  ${diff} differing pixels (${((diff / (A.data.length / 4)) * 100).toFixed(4)}%)`);
  }
  console.log(`total differing pixels: ${total}`);
}
