// Local stand-in for Vercel Functions: serves /api/* with the very same handlers, against the
// in-memory store (or Upstash, if its env vars are set). Vite proxies /api here in dev.
// Usage: node scripts/dev-api.mjs [port]
import http from 'node:http';
import { createOrder, getStore, sampleOrders } from '../api/_lib/orders.js';

const port = Number(process.argv[2] || 3101);
const routes = [
  [/^\/api\/orders$/, '../api/orders.js'],
  [/^\/api\/stats$/, '../api/stats.js'],
  [/^\/api\/archive$/, '../api/archive.js'],
  [/^\/api\/r\/[^/]+$/, '../api/r/[serial].js'],
  // the OG image runs on Vercel's Edge runtime (@vercel/og); it can't load in plain Node
  [/^\/api\/og\/[^/]+$/, null],
  [/^\/api\/share\/[^/]+$/, '../api/share/[serial].js']
];

// seed the in-memory archive like the one-time production seed
const store = getStore();
const t0 = Date.now() - 24 * 3600e3;
for (const [i, o] of sampleOrders().entries()) await createOrder(store, o, t0 + i * 3600e3);

process.on('uncaughtException', (e) => console.error('dev api:', e.message));
process.on('unhandledRejection', (e) => console.error('dev api:', e?.message || e));

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const hit = routes.find(([re]) => re.test(url.pathname));
    if (!hit) return res.writeHead(404).end();
    if (!hit[1]) return res.writeHead(501, { 'content-type': 'text/plain' }).end('runs on Vercel Edge only');
    let mod;
    try {
      mod = await import(hit[1]);
    } catch (e) {
      // e.g. the OG image needs Vercel's Edge runtime; locally it just isn't available
      return res.writeHead(501, { 'content-type': 'text/plain' }).end(`not available locally: ${e.message}`);
    }
    const handler = mod[req.method] || (req.method === 'GET' && mod.default);
    if (!handler) return res.writeHead(405).end();
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const request = new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    try {
      const r = await handler(request);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  })
  .listen(port, () => console.log(`dev api on :${port}`));
