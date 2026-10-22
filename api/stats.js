// GET /api/stats — collective labor, orders, brand revenue, wages paid (always 0). Cached 10 s.
import { getStore, json, readStats, unavailable } from './_lib/orders.js';

export async function GET() {
  const store = getStore();
  if (!store) return unavailable();
  try {
    return json(await readStats(store), 200, { 'cache-control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' });
  } catch {
    return unavailable();
  }
}
