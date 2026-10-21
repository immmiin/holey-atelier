// Verifies the Laundry Day intro: lazy loading, autoplay, pause button, reduced-motion poster.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome' });
for (const [w, reduced] of [[1440, false], [375, false], [375, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 812 : 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  const videoReqs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => r.url().includes('/video/') && r.url().match(/\.(webm|mp4)/) && videoReqs.push(r.url().split('/').pop()));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const tag = `[${w}${reduced ? ' reduced' : ''}]`;
  const reqsAtLoad = videoReqs.length;
  await page.locator('.laundry').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const v = document.querySelector('.laundry video');
    const r = document.querySelector('.laundry').getBoundingClientRect();
    return v
      ? { video: true, src: v.currentSrc.split('/').pop(), playing: !v.paused, t: +v.currentTime.toFixed(2), muted: v.muted, loop: v.loop, controls: v.controls, w: v.videoWidth, h: v.videoHeight, box: [Math.round(r.width), Math.round(r.height)] }
      : { video: false, poster: !!document.querySelector('.laundry img'), box: [Math.round(r.width), Math.round(r.height)] };
  });
  console.log(tag, 'video requests before scroll:', reqsAtLoad, '| after:', [...new Set(videoReqs)].join(', ') || 'none');
  console.log(tag, JSON.stringify(st));
  if (st.video) {
    await page.getByRole('button', { name: 'Pause the intro video' }).click();
    await page.waitForTimeout(300);
    console.log(tag, 'paused by button:', await page.evaluate(() => document.querySelector('.laundry video').paused));
  }
  await page.locator('.laundry').screenshot({ path: `screenshots/rx/video-${w}${reduced ? '-reduced' : ''}.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/rx/home-top-${w}${reduced ? '-reduced' : ''}.png`, fullPage: false });
  console.log(tag, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no console errors');
  await ctx.close();
}
await browser.close();
