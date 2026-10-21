// Full flow: intro → line (repel) → pick → name → pull to 100% → receipt → certificate → save PNG.
// Usage: node scripts/flowtest.mjs <outDir> [width height] [targetP]
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'flow';
const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
const target = Number(process.argv[5] || 1);
const mobile = W < 700;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, acceptDownloads: true, hasTouch: mobile });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(process.env.BASE || 'http://localhost:5199/');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/1-intro.png` });
await page.getByRole('button', { name: 'Enter the Atelier' }).click();
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/2-line.png` });

const socks = () => page.evaluate(() => window.__holey.socks.map((s) => ({ id: s.id, x: s.x, h: s.h, y: window.__holey.lineYAt(s.x) })));
// drag sock 2 into sock 3: they refuse to touch
let ss = await socks();
const a = ss[1], b = ss[2];
await page.mouse.move(a.x, a.y + a.h * 0.55);
await page.mouse.down();
for (let i = 1; i <= 16; i++) { await page.mouse.move(a.x + ((b.x - a.x) * 1.1 * i) / 16, a.y + a.h * 0.55); await page.waitForTimeout(16); }
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/3-never-a-pair.png` });
await page.mouse.up();
await page.waitForTimeout(500);

// pick sock 1
ss = await socks();
const s1 = ss[0];
await page.mouse.click(s1.x, s1.y + s1.h * 0.5);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/4-choosing.png` });
await page.locator('#artisan').waitFor({ timeout: 8000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/5-badge.png` });
await page.locator('#artisan').fill('Minjeong');
await page.getByRole('button', { name: 'Start distressing' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/6-pull-0.png` });

const dbg = () => page.evaluate(() => window.__holey.debug());
let pulls = 0, viol = 0, shot50 = false;
while (true) {
  const d0 = await dbg();
  if (d0.finished || d0.p >= target) break;
  if (++pulls > 70) throw new Error('too many pulls');
  const g = d0.grabPoint;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  let dx = g.x - d0.anchor.x, dy = g.y - d0.anchor.y;
  const l = Math.hypot(dx, dy) || 1;
  dx = (dx / l) * 0.4 + 0.5; dy = (dy / l) * 0.4 + 0.75;
  const l2 = Math.hypot(dx, dy); dx /= l2; dy /= l2;
  const dist = mobile ? 260 : 350;
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(Math.min(W - 4, g.x + dx * dist * (i / 20)), Math.min(H - 4, g.y + dy * dist * (i / 20)));
    await page.waitForTimeout(16);
    const d = await dbg();
    if (!d.anchorOnFabric || !d.ropeAttached) viol++;
    if (d.finished) break;
  }
  await page.mouse.up();
  await page.waitForTimeout(220);
  const d = await dbg();
  if (!shot50 && d.p > 0.5) { shot50 = true; await page.waitForTimeout(700); await page.screenshot({ path: `${out}/7-pull-50.png` }); }
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/8-pull-end.png` });
await page.getByRole('button', { name: 'Add to basket' }).click();
await page.getByRole('button', { name: 'Get certificate' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/9-receipt.png` });
const rc = page.locator('.rc-paper');
await rc.screenshot({ path: `${out}/9b-receipt-paper.png` });
await page.getByRole('button', { name: 'Get certificate' }).click();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/10-certificate.png` });
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as image' }).click()]);
const file = `${out}/11-${dl.suggestedFilename()}`;
await dl.saveAs(file);
await page.getByRole('dialog', { name: 'Certificate of Authenticity' }).getByRole('button', { name: 'Pull another sock' }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/12-another.png` });
await page.getByRole('button', { name: 'About' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/13-about.png` });
const scroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log(`pulls=${pulls} violations=${viol} pngBytes=${fs.statSync(file).size} hScroll=${scroll.sw > scroll.cw} errors=${errors.length}`);
errors.slice(0, 8).forEach((e) => console.log('ERR', e));
await browser.close();
