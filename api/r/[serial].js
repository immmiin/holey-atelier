// GET /api/r/HOL-1234 — one piece from the Archive.
import { getStore, json, readEntry, unavailable } from '../_lib/orders.js';

export async function GET(request) {
  const store = getStore();
  if (!store) return unavailable();
  const serial = decodeURIComponent(new URL(request.url).pathname.split('/').pop() || '');
  try {
    const entry = await readEntry(store, serial);
    return entry ? json(entry, 200, { 'cache-control': 'public, max-age=60, s-maxage=3600' }) : json({ error: 'not found' }, 404);
  } catch {
    return unavailable();
  }
}
