// Failure test: every /api/* request fails. The site, the Atelier, checkout and the receipt must
// still work, with nothing broken on screen. Usage: node scripts/offline-test.mjs <outDir> (BASE=…)
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = process.argv[2] || 'offline';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.route('**/api/**', (r) => r.abort('failed'));
const p = await ctx.newPage();
const errors = [], problems = [];
p.on('pageerror', (e) => errors.push(String(e)));
// a blocked request logs "Failed to load resource" — that's the test, not an app error
p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()));
const check = (ok, msg) => !ok && problems.push(msg);

await p.goto(BASE + '/');
await p.waitForTimeout(3500);
check((await p.locator('.hero2__title').count()) === 1, 'home did not render');
check((await p.locator('.teaser .labor').count()) === 0, 'labor counter shown with no data');
await p.screenshot({ path: `${out}/home.png` });

await p.goto(BASE + '/atelier?sock=heel-yeah');
await p.waitForFunction(() => window.__holey?.phase === 'pull', null, { timeout: 15000 });
await p.evaluate(() => window.__holey.setProgress(0.42));
await p.waitForTimeout(800);
await p.locator('.tag-basket').click();
await p.locator('.atl__added').getByRole('button', { name: 'Checkout' }).click();
await p.waitForURL('**/checkout');
await p.getByRole('button', { name: /Place order/ }).click();
await p.locator('.rprint__actions').waitFor({ timeout: 25000 });
await p.waitForTimeout(6000); // the one background retry fails too
const order = await p.evaluate(() => JSON.parse(sessionStorage.getItem('holey-last-order-v2')));
check(order.local === true, 'offline receipt not marked local');
check(await p.getByRole('button', { name: 'Copy link' }).isDisabled(), 'copy link enabled without a saved piece');
const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Save receipt' }).click()]);
await dl.saveAs(`${out}/receipt-offline.png`);
await p.locator('.rprint').screenshot({ path: `${out}/receipt.png` });

await p.goto(BASE + '/archive');
await p.waitForTimeout(4500);
check(/out for a wash/i.test(await p.locator('main').innerText()), 'archive has no offline message');
await p.screenshot({ path: `${out}/archive.png` });
await p.goto(`${BASE}/r/${order.id}`);
await p.waitForTimeout(4500);
check((await p.locator('.share__piece, .rprint').count()) > 0, 'own receipt not shown offline');
await p.screenshot({ path: `${out}/share-own.png` });

console.log(`offline: order=${order.id} errors=${errors.length} problems=${problems.length}`);
problems.forEach((x) => console.log('  PROBLEM', x));
errors.forEach((x) => console.log('  ERR', x));
await b.close();
