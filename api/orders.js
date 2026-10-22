// POST /api/orders — record one finished piece in the Archive. Returns { serial }.
import { createOrder, getStore, ipKey, json, rateLimited, unavailable, validate } from './_lib/orders.js';

export async function POST(request) {
  const store = getStore();
  if (!store) return unavailable();
  const text = await request.text();
  if (text.length > 1024) return json({ error: 'too large' }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const v = validate(body);
  if (v.error) return json({ error: v.error }, 400);
  try {
    if (await rateLimited(store, await ipKey(request))) return json({ error: 'one piece at a time' }, 429, { 'retry-after': '10' });
    const entry = await createOrder(store, v.order);
    return json({ serial: entry.serial }, 201);
  } catch {
    return unavailable();
  }
}
