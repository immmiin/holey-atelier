// Exercises the redesign's signature interactions and screenshots each.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base = process.argv[2] || 'http://localhost:5173';
const W = Number(process.argv[3] || 1440);
const mobile = W < 700;
await fs.mkdir('screenshots/rx', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: mobile ? 812 : 900 }, hasTouch: mobile, isMobile: mobile });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `screenshots/rx/${W}-${n}.png` });
const log = (...a) => console.log('•', ...a);
const center = async (loc) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
};

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// 1. hole cursor over a button (desktop only)
if (!mobile) {
  const cta = await center(page.getByRole('link', { name: 'Shop the sock' }).first());
  await page.mouse.move(cta.x - 200, cta.y - 100);
  await page.mouse.move(cta.x, cta.y, { steps: 12 });
  await page.waitForTimeout(600);
  log('hole cursor present:', await page.locator('.hc__hole').count());
  await page.screenshot({ path: `screenshots/rx/${W}-01-cursor.png`, clip: { x: cta.x - 160, y: cta.y - 110, width: 320, height: 220 } });
}

// 2. clothesline: pull a sock down and let go
const line = page.locator('.cl__sock').nth(2);
await line.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const s = await center(line.locator('.cl__img'));
if (!mobile) {
  await page.mouse.move(s.x, s.y);
  await page.mouse.down();
  await page.mouse.move(s.x + 90, s.y + 140, { steps: 10 });
  await shot('02-line-pulled');
  await page.mouse.up();
  await page.waitForTimeout(160);
  await shot('03-line-bounce');
  log('still on home after drag (no accidental nav):', new URL(page.url()).pathname === '/');
}

// 3. MISSING: tear three tabs
const tabs = page.getByRole('button', { name: /Tear off tab/ });
await tabs.first().scrollIntoViewIfNeeded();
for (let i = 0; i < 3; i++) {
  await tabs.first().click();
  await page.waitForTimeout(120);
}
await shot('04-tabs-tearing');
log('tabs left label:', await page.getByRole('group', { name: /tabs left|tab/ }).getAttribute('aria-label'));

// 4. Lost & Found: play to the end by cheating (read names after flipping)
await page.locator('#lost-and-found').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const cards = page.locator('.lf-card');
const n = await cards.count();
const names = [];
for (let i = 0; i < n; i += 2) {
  await cards.nth(i).click();
  await cards.nth(i + 1).click();
  await page.waitForTimeout(200);
  names[i] = await cards.nth(i).getAttribute('aria-label');
  names[i + 1] = await cards.nth(i + 1).getAttribute('aria-label');
  if (i === 0) await shot('05-lf-flip');
  await page.waitForTimeout(1100);
}
const base2 = (s) => s.replace(' (the other one?)', '');
const done = new Set();
for (let i = 0; i < n; i++) {
  if (done.has(i)) continue;
  const j = names.findIndex((x, k) => k !== i && !done.has(k) && base2(x) === base2(names[i]));
  if (j < 0) continue;
  if (await cards.nth(i).isDisabled()) {
    done.add(i);
    done.add(j);
    continue;
  }
  await cards.nth(i).click();
  await cards.nth(j).click();
  done.add(i);
  done.add(j);
  await page.waitForTimeout(800);
}
await page.waitForTimeout(600);
log('game end dialog:', await page.getByRole('dialog', { name: 'Game over' }).isVisible());
await shot('06-lf-end');

// 5. sticker board: fling a sticker
const st = page.locator('.sticker').first();
await st.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const before = await st.evaluate((el) => el.style.transform);
const sc = await center(st);
if (mobile) {
  // touch drag via pointer events
  await st.dispatchEvent('pointerdown', { pointerId: 1, clientX: sc.x, clientY: sc.y, pointerType: 'touch', button: 0, isPrimary: true });
  for (let k = 1; k <= 6; k++) await st.dispatchEvent('pointermove', { pointerId: 1, clientX: sc.x + k * 20, clientY: sc.y + k * 8, pointerType: 'touch', isPrimary: true });
  await st.dispatchEvent('pointerup', { pointerId: 1, clientX: sc.x + 120, clientY: sc.y + 48, pointerType: 'touch', isPrimary: true });
} else {
  await page.mouse.move(sc.x, sc.y);
  await page.mouse.down();
  await page.mouse.move(sc.x + 300, sc.y + 120, { steps: 6 });
  await page.mouse.up();
}
await page.waitForTimeout(1500);
const after = await st.evaluate((el) => el.style.transform);
log('sticker moved:', before !== after);
await shot('07-stickers');

// 6. quick add from the line → basket
await line.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.locator('.cl__add').first().click();
await page.waitForTimeout(350);
await shot('08-flying');
await page.waitForTimeout(1500);
log('basket open:', await page.getByRole('dialog', { name: /Laundry basket/ }).isVisible());
await shot('09-basket');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// 7. washing-machine transition
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
if (mobile) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(400);
  await page.locator('.tagmenu__links').getByRole('link', { name: 'About' }).click();
} else {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' }).click();
}
await page.waitForTimeout(380);
await shot('10-wash-cover');
await page.waitForTimeout(500);
await shot('11-wash-reveal');
await page.waitForTimeout(900);
log('landed on about:', new URL(page.url()).pathname, await page.locator('.about__title').isVisible());

// 8. product page: locked qty
await page.goto(base + '/socks/purple-reign', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Increase quantity/ }).click();
await page.waitForTimeout(250);
log('qty tooltip:', await page.getByText('It’s one sock.').isVisible());
await shot('12-pdp');

console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
await browser.close();
