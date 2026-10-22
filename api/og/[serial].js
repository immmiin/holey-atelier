// GET /api/og/HOL-1234 — the shared receipt as a 1200×630 Open Graph image (Vercel OG, Node runtime).
import { ImageResponse } from '@vercel/og';
import { getStore, readEntry } from '../_lib/orders.js';

const SOCKS = {
  'heel-yeah': ['Heel Yeah', 1],
  'lost-in-laundry': ['Lost in Laundry', 2],
  'purple-reign': ['Purple Reign', 3],
  'big-toe-energy': ['Big Toe Energy', 4],
  'toe-jam': ['Toe Jam', 5],
  'grass-stain': ['Grass Stain', 6]
};

// text gets its own element, so flex can push a label and its amount apart
const wrap = (c) => (typeof c === 'string' ? { type: 'div', props: { children: c } } : c);
const h = (type, style, ...children) => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children.map(wrap) }
});
const row = (l, r, color = '#241a26') =>
  h('div', { justifyContent: 'space-between', width: '100%', fontSize: 26, color, borderBottom: '2px dashed rgba(36,26,38,.25)', padding: '6px 0' }, l, r);

export default async function handler(request) {
  const url = new URL(request.url);
  const serial = decodeURIComponent(url.pathname.split('/').pop() || '');
  let e = null;
  try {
    const store = getStore();
    if (store) e = await readEntry(store, serial);
  } catch {
    e = null;
  }
  const [name, n] = e ? SOCKS[e.sockSlug] : ['One sock', 1];
  const labor = e ? `${Math.floor(e.laborSec / 60)}:${String(e.laborSec % 60).padStart(2, '0')}` : '0:00';
  return new ImageResponse(
    h(
      'div',
      { width: '100%', height: '100%', background: '#FBF1E8', padding: 48, gap: 48, alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' },
      h(
        'div',
        { width: 380, height: 520, borderRadius: 28, border: '6px solid #1A0F1F', background: '#F4A9BC', alignItems: 'center', justifyContent: 'center' },
        { type: 'img', props: { src: `${url.origin}/img/socks/og/sock-${n}.png`, width: 340, height: 425 } }
      ),
      h(
        'div',
        { flexDirection: 'column', width: 560, background: '#FFFCF6', padding: '34px 36px', boxShadow: '8px 8px 0 #1A0F1F', border: '3px solid #1A0F1F' },
        h('div', { fontSize: 34, letterSpacing: 10, fontWeight: 900, justifyContent: 'center', width: '100%' }, 'ATELIER HOLEY'),
        h('div', { fontSize: 22, opacity: 0.7, justifyContent: 'center', width: '100%', marginBottom: 18 }, `${e ? e.serial : serial} · Artisan: You`),
        row(`1 × ${name}`, '$9.00'),
        row(`Hand-distressing ${e ? e.holePct : 0}%`, ''),
        row(`Labor ${labor}`, '$0.00'),
        row('Artisan wage', '$0.00', '#C9302C'),
        h('div', { justifyContent: 'space-between', width: '100%', fontSize: 44, fontWeight: 900, marginTop: 14 }, 'TOTAL', `$${(e ? e.price : 9).toFixed(2)}`),
        h('div', { justifyContent: 'space-between', width: '100%', fontSize: 30, fontWeight: 900, color: '#C9302C', marginTop: 10 }, 'NET PAY', '$0.00')
      )
    ),
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' } }
  );
}

export const GET = handler;
