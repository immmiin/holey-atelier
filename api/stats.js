// GET /api/stats — collective labor, orders, brand revenue, wages paid (always 0). Cached 10 s.
import { ensureSeeded, getStore, json, readStats, unavailable } from './_lib/orders.js';

export async function GET() {
  const store = getStore();
  if (!store) return unavailable();
  try {
    await ensureSeeded(store);
    return json(await readStats(store), 200, { 'cache-control': 'public, max-age=0, s-maxage=5' });
  } catch {
    return unavailable();
  }
}
