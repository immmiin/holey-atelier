// /r/HOL-1234 is rewritten here: the app's own HTML, with Open Graph tags for that receipt,
// so a shared link previews the receipt. The page itself is the normal app.
import { readEntry, getStore } from '../_lib/orders.js';

const NAMES = {
  'heel-yeah': 'Heel Yeah',
  'lost-in-laundry': 'Lost in Laundry',
  'purple-reign': 'Purple Reign',
  'big-toe-energy': 'Big Toe Energy',
  'toe-jam': 'Toe Jam',
  'grass-stain': 'Grass Stain'
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function GET(request) {
  const url = new URL(request.url);
  const serial = decodeURIComponent(url.pathname.split('/').pop() || '');
  let html;
  try {
    html = await (await fetch(new URL('/index.html', url.origin))).text();
  } catch {
    return Response.redirect(new URL('/', url.origin), 302);
  }
  let entry = null;
  try {
    const store = getStore();
    if (store && /^HOL-\d{4,7}$/.test(serial)) entry = await readEntry(store, serial);
  } catch {
    entry = null;
  }
  if (entry) {
    const title = `${entry.serial} · ${NAMES[entry.sockSlug]}, ${entry.holePct}% hole · Atelier Holey`;
    const desc = `Hand-distressed by You in ${Math.floor(entry.laborSec / 60)}m ${entry.laborSec % 60}s. Price $${entry.price.toFixed(2)}. Wages paid: $0.00.`;
    const img = `${url.origin}/api/og/${encodeURIComponent(entry.serial)}`;
    const tags = [
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:image" content="${esc(img)}" />`,
      `<meta property="og:url" content="${esc(`${url.origin}/r/${entry.serial}`)}" />`,
      `<meta name="twitter:image" content="${esc(img)}" />`
    ].join('\n    ');
    html = html
      .replace(/<meta property="og:(title|description|image|url)"[^>]*>\s*/g, '')
      .replace(/<meta name="twitter:image"[^>]*>\s*/g, '')
      .replace('</head>', `    ${tags}\n  </head>`);
  }
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300' } });
}
