// GET /api/archive?cursor=0 — the latest pieces, 24 at a time.
import { ensureSeeded, getStore, json, readArchive, unavailable } from './_lib/orders.js';

export async function GET(request) {
  const store = getStore();
  if (!store) return unavailable();
  const c = Number(new URL(request.url).searchParams.get('cursor') || 0);
  const cursor = Number.isInteger(c) && c >= 0 && c <= 100000 ? c : 0;
  try {
    await ensureSeeded(store);
    return json(await readArchive(store, cursor), 200, { 'cache-control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' });
  } catch {
    return unavailable();
  }
}
