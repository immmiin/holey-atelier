// Visit routes and report console errors. Usage: node scripts/errcheck.mjs [base]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:5199';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(`${p.url()} PAGEERR ${e.message}`));
p.on('console', (m) => m.type() === 'error' && errs.push(`${p.url()} ${m.text()}`));
for (const r of ['/', '/atelier', '/atelier?sock=toe-jam', '/shop', '/socks/grass-stain', '/about', '/faq', '/checkout', '/nope']) {
  await p.goto(base + r);
  await p.waitForTimeout(1800);
}
console.log(errs.length ? errs.slice(0, 12).join('\n') : 'no errors');
await b.close();
