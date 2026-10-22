// The Archive API, used defensively: every call times out after 3 s, never throws, and falls
// back to the last cached values. The shop, checkout and receipt never wait on it.

const TIMEOUT = 3000;
const STATS_KEY = 'holey-stats-v1';

async function call(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(path, { ...opts, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode: fine */
  }
};

export const cachedStats = () => read(STATS_KEY);

/** collective labor etc., or the last values we saw, or null */
export async function getStats() {
  try {
    const s = await call('/api/stats');
    if (typeof s?.totalLaborSec !== 'number') throw new Error('bad stats');
    write(STATS_KEY, s);
    return s;
  } catch {
    return cachedStats();
  }
}

/** one page of the Archive, or null if it can't be reached */
export async function getArchive(cursor = 0) {
  try {
    const a = await call(`/api/archive?cursor=${cursor}`);
    return Array.isArray(a?.items) ? a : null;
  } catch {
    return null;
  }
}

export async function getEntry(serial) {
  try {
    return await call(`/api/r/${encodeURIComponent(serial)}`);
  } catch {
    return null;
  }
}

/** save a finished piece; one quiet retry in the background. Resolves to the serial or null. */
export async function postOrder(order, { retryDelay = 4000 } = {}) {
  const body = JSON.stringify(order);
  const once = () => call('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  try {
    return (await once()).serial || null;
  } catch {
    await new Promise((r) => setTimeout(r, retryDelay));
    try {
      return (await once()).serial || null;
    } catch {
      return null;
    }
  }
}

/** remember stats changes we caused, so the counter moves even before the cache refreshes */
export function bumpCachedStats(order) {
  const s = cachedStats();
  if (!s) return;
  write(STATS_KEY, {
    ...s,
    totalLaborSec: s.totalLaborSec + order.laborSec,
    totalOrders: s.totalOrders + 1,
    brandRevenue: Math.round((s.brandRevenue + order.price) * 100) / 100
  });
}
