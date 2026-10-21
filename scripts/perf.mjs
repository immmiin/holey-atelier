import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const cdp = await p.context().newCDPSession(p);
await p.goto('http://localhost:5199/'); await p.waitForFunction(() => window.__holey?.ready);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.evaluate(() => { window.__ft = []; let l = performance.now(); const f = (t) => { window.__ft.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
await p.keyboard.down('Space'); await p.waitForTimeout(12000); await p.keyboard.up('Space');
const r = await p.evaluate(() => { const a = window.__ft.slice(5).sort((x, y) => x - y); const avg = a.reduce((s, v) => s + v, 0) / a.length; return { frames: a.length, avg: avg.toFixed(1), p95: a[Math.floor(a.length * 0.95)].toFixed(1), p: window.__holey.p.toFixed(2), pops: window.__holey.pops }; });
console.log('4x CPU throttle, dpr2:', JSON.stringify(r)); await b.close();
