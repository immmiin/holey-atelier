import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERR', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.goto(process.argv[2] || 'http://localhost:5199/'); await p.waitForTimeout(3000);
await b.close();
