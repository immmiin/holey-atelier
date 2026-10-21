// Renders the Open Graph image (1200×630) from the live scene: /?og
import { chromium } from 'playwright';
import sharp from 'sharp';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5199/?og');
await p.waitForSelector('.og-head', { timeout: 20000 });
await p.waitForTimeout(2500);
const buf = await p.screenshot();
await sharp(buf).resize(1200, 630).jpeg({ quality: 88 }).toFile('public/og.jpg');
await b.close();
console.log('ok');
