// Open Graph image (1200×630) rendered from the live Atelier: a sock mid-pull with its heap.
import { chromium } from 'playwright';
import sharp from 'sharp';
const BASE = process.env.BASE || 'http://localhost:5199/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await p.goto(BASE);
await p.waitForTimeout(1500);
await p.evaluate(() => document.getElementById('atelier').scrollIntoView());
await p.waitForTimeout(1200);
const box = await p.locator('#atelier .cl__sock').nth(0).locator('.cl__img').boundingBox();
await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await p.waitForFunction(() => window.__holey?.phase === 'pull', null, { timeout: 15000 });
await p.waitForTimeout(1500);
await p.evaluate(() => window.__holey.setProgress(0.5));
await p.waitForTimeout(3000);
// hide the floating nav and the custom cursor for the still
await p.addStyleTag({ content: 'header.nav, .hc { display: none !important; }' });
await p.waitForTimeout(200);
const buf = await p.screenshot();
await sharp(buf).resize(1200, 630).jpeg({ quality: 88 }).toFile('public/og.jpg');
await b.close();
console.log('ok');
