// Simulates iOS refusing autoplay (Low Power Mode): first play() rejects with NotAllowedError.
const { webkit, devices } = await import(process.env.PW_WEBKIT || 'playwright');
const b = await webkit.launch();
const page = await (await b.newContext(devices['iPhone 14'])).newPage();
await page.addInitScript(() => {
  const orig = HTMLMediaElement.prototype.play;
  window.__blocked = true;
  // Low Power Mode also ignores the autoplay attribute — strip it as soon as it appears
  Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', { get: () => false, set: () => {} });
  new MutationObserver((ms) => ms.forEach((m) => m.target.removeAttribute?.('autoplay'))).observe(document, { subtree: true, attributes: true, attributeFilter: ['autoplay'] });
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[autoplay]').forEach((v) => v.removeAttribute('autoplay')));
  new MutationObserver(() => document.querySelectorAll('video[autoplay]').forEach((v) => v.removeAttribute('autoplay'))).observe(document, { subtree: true, childList: true });
  HTMLMediaElement.prototype.play = function () {
    if (window.__blocked) return Promise.reject(new DOMException('autoplay refused', 'NotAllowedError'));
    return orig.call(this);
  };
});
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.locator('.laundry').scrollIntoViewIfNeeded();
await page.waitForTimeout(2000);
const st = () => page.evaluate(() => ({
  posterVisible: getComputedStyle(document.querySelector('.laundry__poster')).opacity === '1',
  tapButton: !!document.querySelector('.laundry__tap'),
  playing: !document.querySelector('.laundry video').paused
}));
console.log('blocked:', JSON.stringify(await st()));
await page.locator('.laundry').screenshot({ path: 'screenshots/mobile-after/video-blocked.png' });
await page.evaluate(() => (window.__blocked = false)); // the user's tap is allowed
await page.getByRole('button', { name: 'Tap to play' }).tap();
await page.waitForTimeout(2000);
console.log('after tap:', JSON.stringify(await st()));
await b.close();
