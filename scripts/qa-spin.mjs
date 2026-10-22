// Spin the hero washer for real (drag circles on the drum) until the door opens.
// Exports spin(page); run directly for a before/after screenshot: node scripts/qa-spin.mjs <out> [w] [h]
import { chromium } from 'playwright';

export async function spin(page) {
  const g = await page.locator('.porthole__glass').boundingBox();
  const cx = g.x + g.width / 2, cy = g.y + g.height / 2, r = g.width * 0.32;
  for (let round = 0; round < 4 && !(await page.locator('.washer.is-open').count()); round++) {
    await page.mouse.move(cx + r, cy);
    await page.mouse.down();
    for (let a = 0; a <= Math.PI * 6; a += 0.25) {
      await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      await page.waitForTimeout(8);
    }
    await page.mouse.up();
    // let it coast to a stop
    for (let t = 0; t < 40 && !(await page.locator('.washer.is-open').count()); t++) await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
  return (await page.locator('.washer.is-open').count()) > 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || '.';
  const W = Number(process.argv[3] || 1440), H = Number(process.argv[4] || 900);
  const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.goto(BASE + '/');
  await p.waitForTimeout(2600);
  const box = (s) => p.evaluate((s) => document.querySelector(s)?.getBoundingClientRect().toJSON(), s);
  const before = { sticker: await box('.hero2__sticker'), machine: await box('.machine') };
  await p.screenshot({ path: `${out}/hero-before.png` });
  const opened = await spin(p);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/hero-after-spin.png` });
  const after = { sticker: await box('.hero2__sticker'), machine: await box('.machine'), door: await box('.porthole__glass'), out: await box('.washer__out'), nav: await box('.nav') };
  const moved = Math.hypot(after.sticker.x - before.sticker.x, after.sticker.y - before.sticker.y) + Math.abs(after.sticker.width - before.sticker.width);
  const m = after.machine, d = after.door;
  const inside = d.left >= m.left - 1 && d.right <= m.right + 1 && d.top >= m.top - 1 && d.bottom <= m.bottom + 1;
  console.log(`${W}x${H} door opened=${opened}  door inside machine=${inside} (door ${Math.round(d.left)}–${Math.round(d.right)} × ${Math.round(d.top)}–${Math.round(d.bottom)}, machine ${Math.round(m.left)}–${Math.round(m.right)} × ${Math.round(m.top)}–${Math.round(m.bottom)})  badge moved ${moved.toFixed(1)}px  card ${after.out ? `${Math.round(after.out.left)}–${Math.round(after.out.right)} × ${Math.round(after.out.top)}–${Math.round(after.out.bottom)}` : 'none'}`);
  await b.close();
}
