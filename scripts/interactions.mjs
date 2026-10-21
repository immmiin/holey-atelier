// Clicks through the key interactions and screenshots each state.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base = process.argv[2] || 'http://localhost:5173';
const W = Number(process.argv[3] || 1440);
await fs.mkdir('screenshots/ix', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: W < 700 ? 812 : 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `screenshots/ix/${W}-${n}.png` });
const log = (...a) => console.log('•', ...a);

await page.goto(base + '/socks/heel-yeah', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// 1. locked quantity
await page.getByRole('button', { name: /Increase quantity/ }).click();
await page.waitForTimeout(250);
log('tooltip visible:', await page.getByText('It’s one sock.').isVisible());
await shot('01-qty-tooltip');

// 2. drag to rotate (angle read from the stage's internal state isn't exposed; compare pixels instead)
const box = await page.locator('.pdp__main').boundingBox();
const before = await page.locator('.pdp__main').screenshot();
await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(400);
const after = await page.locator('.pdp__main').screenshot();
log('drag changed the view:', !before.equals(after));
await shot('02-after-drag');

// 3. add to cart → fly, spin, drawer
await page.getByRole('button', { name: /Add to cart/ }).click();
await page.waitForTimeout(450);
await shot('03-flying');
await page.waitForTimeout(1600);
log('drawer open:', await page.getByRole('dialog', { name: /Cart/ }).isVisible());
await shot('04-drawer');

// 4. add again → toast
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.getByRole('button', { name: /In your cart/ }).click();
await page.waitForTimeout(400);
log('dupe toast:', await page.getByText(/It's one sock. You already have it./).isVisible());
await shot('05-toast');

// 5. persistence
await page.reload({ waitUntil: 'networkidle' });
log('cart after reload:', await page.locator('.cart-bubble').first().textContent());

// 6. quick add from home grid
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('.grid-sec .card').nth(1).hover();
await page.waitForTimeout(400);
await shot('06-card-hover');
await page.getByRole('button', { name: 'Add Lost in Laundry to cart' }).click();
await page.waitForTimeout(2200);
log('count after quick add:', await page.locator('.cart-bubble').first().textContent());

// 7. checkout
await page.getByRole('button', { name: /Check out/ }).click();
await page.waitForTimeout(700);
await shot('07-processing');
await page.waitForTimeout(2600);
log('ending text:', await page.getByText('Your sock is on its way to find its other half.').isVisible());
await shot('08-ending');
log('cart emptied:', (await page.locator('.cart-bubble').count()) === 0);

// 8. newsletter
await page.getByPlaceholder('Email').fill('toe@holey.test');
await page.getByRole('button', { name: 'Subscribe' }).click();
await page.waitForTimeout(600);
log('newsletter success:', await page.getByText(/You're on the list/).isVisible());

// 9. 404
await page.goto(base + '/this/does/not/exist', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
log('404:', await page.getByText(/This page has a hole in it/).isVisible());
await shot('09-404');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
