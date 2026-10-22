// One-time seed: 24 varied sample pieces, so the Archive never opens empty.
// Needs the Upstash env vars (e.g. `npx vercel env pull .env.local`, then
// `node --env-file=.env.local scripts/seed-archive.mjs`). Refuses if the Archive isn't empty.
import { createOrder, getStore, sampleOrders } from '../api/_lib/orders.js';

const store = getStore();
if (!store || !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) {
  console.error('No Upstash env vars found. Pull them first: npx vercel env pull .env.local');
  process.exit(1);
}
const existing = await store.llen('holey:archive');
if (existing > 0 && !process.argv.includes('--force')) {
  console.log(`Archive already has ${existing} pieces; not seeding (use --force to add samples anyway).`);
  process.exit(0);
}
const t0 = Date.now() - 24 * 3600e3;
for (const [i, o] of sampleOrders().entries()) {
  const e = await createOrder(store, o, t0 + i * 3600e3);
  console.log(e.serial, o.sockSlug, `${o.holePct}%`);
}
console.log('seeded 24 pieces');
