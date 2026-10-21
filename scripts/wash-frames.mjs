// Frame-by-frame capture of the washing-machine page transition.
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 750 } })).newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'FAQ' }).click();
for (let i = 0; i < 8; i++) {
  await page.screenshot({ path: `screenshots/rx/wash-${i}.png` });
  await page.waitForTimeout(150);
}
await browser.close();
