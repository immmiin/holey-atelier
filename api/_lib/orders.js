// The Atelier Archive: validation, rate limiting and storage of orders.
// Only five numbers/ids per order are ever stored — no names, no free text, no raw IPs.

import { getStore } from './store.js';

export const SLUGS = ['heel-yeah', 'lost-in-laundry', 'purple-reign', 'big-toe-energy', 'toe-jam', 'grass-stain'];
const FIELDS = ['sockSlug', 'holePct', 'laborSec', 'price', 'unravelSeed'];

const K = {
  seq: 'holey:seq',
  stats: 'holey:stats',
  archive: 'holey:archive',
  order: (s) => `holey:o:${s}`,
  rlMin: (h) => `holey:rl:m:${h}`,
  rlTen: (h) => `holey:rl:s:${h}`
};

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });

export const unavailable = () => json({ error: 'archive unavailable' }, 503);

const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

/** exactly the five allowed fields, each in range; anything else is rejected */
export function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'body must be an object' };
  const keys = Object.keys(body);
  if (keys.length !== FIELDS.length || !FIELDS.every((f) => keys.includes(f))) return { error: `fields must be exactly ${FIELDS.join(', ')}` };
  const { sockSlug, holePct, laborSec, price, unravelSeed } = body;
  if (typeof sockSlug !== 'string' || !SLUGS.includes(sockSlug)) return { error: 'unknown sock' };
  if (!isInt(holePct) || holePct < 0 || holePct > 100) return { error: 'holePct must be an integer 0–100' };
  if (!isInt(laborSec) || laborSec < 1 || laborSec > 3600) return { error: 'laborSec must be an integer 1–3600' };
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 9 || price > 99) return { error: 'price must be 9–99' };
  if (!isInt(unravelSeed) || Math.abs(unravelSeed) > 2 ** 31) return { error: 'unravelSeed must be an integer' };
  return { order: { sockSlug, holePct, laborSec, price: Math.round(price * 100) / 100, unravelSeed } };
}

/** a one-way, salted hash of the caller's IP: rate limiting without keeping addresses (Web Crypto: any runtime) */
export async function ipKey(request) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
  const data = new TextEncoder().encode(`${process.env.HOLEY_SALT || 'holey-one-sock'}:${ip}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** max 1 order per 10 s and 5 per minute per IP */
export async function rateLimited(store, who) {
  const first = await store.set(K.rlTen(who), '1', { nx: true, ex: 10 });
  if (first === null) return true;
  const n = await store.incr(K.rlMin(who));
  if (n === 1) await store.expire(K.rlMin(who), 60);
  return n > 5;
}

const serialOf = (n) => `HOL-${String(n).padStart(4, '0')}`;

/** store one order; every counter changes in the same transaction */
export async function createOrder(store, order, t = Date.now()) {
  const n = await store.incr(K.seq);
  const serial = serialOf(n < 1000 ? n + 1000 : n);
  const entry = { serial, ...order, t };
  await store
    .multi()
    .set(K.order(serial), JSON.stringify(entry))
    .lpush(K.archive, serial)
    .hincrby(K.stats, 'laborSec', order.laborSec)
    .hincrby(K.stats, 'orders', 1)
    .hincrby(K.stats, 'revenueCents', Math.round(order.price * 100))
    .exec();
  return entry;
}

const parse = (v) => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

/** the Archive never opens empty: the first read of an empty store adds the 24 samples, once
 *  (an NX lock, so concurrent cold reads can't seed twice) */
export async function ensureSeeded(store) {
  if ((await store.llen(K.archive)) > 0) return;
  const got = await store.set('holey:seeded', '1', { nx: true });
  if (got === null) return;
  const t0 = Date.now() - 24 * 3600e3;
  for (const [i, o] of sampleOrders().entries()) await createOrder(store, o, t0 + i * 3600e3);
}

export async function readStats(store) {
  // Upstash without automatic deserialization answers HGETALL with a flat [field, value, …] array
  const raw = (await store.hgetall(K.stats)) || {};
  const h = Array.isArray(raw) ? Object.fromEntries(Array.from({ length: raw.length / 2 }, (_, i) => [raw[2 * i], raw[2 * i + 1]])) : raw;
  return {
    totalLaborSec: Number(h.laborSec || 0),
    totalOrders: Number(h.orders || 0),
    brandRevenue: Math.round(Number(h.revenueCents || 0)) / 100,
    wagesPaid: 0
  };
}

export const PAGE = 24;

export async function readArchive(store, cursor = 0) {
  const ids = await store.lrange(K.archive, cursor, cursor + PAGE - 1);
  if (!ids.length) return { items: [], next: null };
  const raw = await store.mget(...ids.map(K.order));
  const items = raw.map(parse).filter(Boolean);
  const total = await store.llen(K.archive);
  return { items, next: cursor + PAGE < total ? cursor + PAGE : null };
}

export async function readEntry(store, serial) {
  if (!/^HOL-\d{4,7}$/.test(serial)) return null;
  return parse(await store.get(K.order(serial)));
}

/** 24 varied sample pieces, so the Archive never opens empty */
export function sampleOrders() {
  let s = 20261021;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const out = [];
  for (let i = 0; i < 24; i++) {
    const holePct = Math.min(100, Math.round(4 + rnd() * 96 + (i % 5 === 0 ? 30 : 0)));
    const p = holePct / 100;
    const price = holePct >= 100 ? 99 : Math.round((p < 0.9 ? 9 + 36 * Math.pow(p / 0.9, 1.4) : 45 + ((p - 0.9) / 0.1) * 30) * 100) / 100;
    out.push({
      sockSlug: SLUGS[i % 6],
      holePct,
      laborSec: Math.round(6 + holePct * (0.25 + rnd() * 0.6)),
      price,
      unravelSeed: Math.floor(rnd() * 1e6)
    });
  }
  return out;
}

export { getStore };
