// Drag-pull the sock to 100% with a real mouse (hand-over-hand), checking
// invariants every step, and save screenshots + zoom crops.
// Usage: node scripts/pulltest.mjs [outDir] [width] [height] [sock]
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2] || 'shots';
const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
const sock = process.argv[5] || '1';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://localhost:5199/?sock=${sock}`);
await page.waitForFunction(() => window.__holey?.ready);
await page.waitForTimeout(600);
const dbg = () => page.evaluate(() => window.__holey.debug());

const crop = async (name, cx, cy, w, h) => {
  const x = Math.max(0, Math.min(W - w, cx - w / 2)), y = Math.max(0, Math.min(H - h, cy - h / 2));
  await page.screenshot({ path: `${out}/${name}.png`, clip: { x, y, width: w, height: h } });
};
const shoot = async (tag) => {
  await page.waitForTimeout(900);
  const d = await dbg();
  await page.screenshot({ path: `${out}/full-${tag}.png` });
  if (!d.finished) await crop(`front-${tag}`, d.anchor.x, d.anchor.y, 200, 200);
  await crop(`heap-${tag}`, d.heapTop.x, d.heapTop.y + 40, 420, 240);
  console.log(`[${tag}] p=${d.p.toFixed(3)} heapArea/sock=${(d.heapArea / d.sockArea).toFixed(3)} remaining/sock=${(d.remainingArea / d.sockArea).toFixed(3)} L1=${d.L1.toFixed(0)} heapLen=${d.heapLen.toFixed(0)} heapW=${d.heapW.toFixed(0)} heapH=${d.heapH.toFixed(0)} pops=${d.pops}`);
};

await shoot('000');
const marks = [0.25, 0.5, 0.75];
let violations = 0, pulls = 0, maxAir = 0;
let taut = false;
while (true) {
  const d0 = await dbg();
  if (d0.finished) break;
  if (pulls > 60) throw new Error('too many pulls');
  pulls++;
  const g = d0.grabPoint;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  // pull away from the sock, down-right, ~350 px
  let dx = g.x - d0.anchor.x, dy = g.y - d0.anchor.y;
  const l = Math.hypot(dx, dy) || 1;
  dx = (dx / l) * 0.4 + 0.5; dy = (dy / l) * 0.4 + 0.75;
  const l2 = Math.hypot(dx, dy); dx /= l2; dy /= l2;
  const steps = 22;
  for (let i = 1; i <= steps; i++) {
    const px = Math.min(W - 4, g.x + dx * 350 * (i / steps)), py = Math.min(H - 4, g.y + dy * 350 * (i / steps));
    await page.mouse.move(px, py);
    await page.waitForTimeout(16);
    const d = await dbg();
    if (!d.anchorOnFabric || !d.ropeAttached) { violations++; console.log('VIOLATION', JSON.stringify(d)); }
    maxAir = Math.max(maxAir, d.L1 + d.L2);
    if (!taut && d.p > 0.12 && i === 12) {
      taut = true;
      await crop('thread-taut', (d.anchor.x + px) / 2, (d.anchor.y + py) / 2, 360, 300);
    }
    if (d.finished) break;
  }
  await page.mouse.up();
  await page.waitForTimeout(250);
  const d = await dbg();
  if (pulls === 3) await crop('thread-slack', d.anchor.x + 40, (d.anchor.y + d.heapTop.y) / 2, 360, 340);
  while (marks.length && d.p >= marks[0]) { const m = marks.shift(); await shoot(String(Math.round(m * 100)).padStart(3, '0')); }
}
await shoot('100');
console.log(`pulls=${pulls} violations=${violations} maxAirYarn=${maxAir.toFixed(0)} errors=${errors.length}`);
errors.slice(0, 5).forEach((e) => console.log('ERR', e));
await browser.close();
