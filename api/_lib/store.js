// Storage for the Atelier Archive: Upstash Redis (Vercel Marketplace, free plan).
// Locally (no Upstash env) the same few commands run against an in-memory store so the API can
// be developed and tested; on Vercel without Upstash the API reports itself unavailable.

import { Redis } from '@upstash/redis';

let redis = null;

function fromEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token, automaticDeserialization: false });
}

/* ---------------- in-memory stand-in (local development only) ---------------- */
class MemoryStore {
  constructor() {
    this.kv = new Map();
    this.exp = new Map();
  }
  _alive(k) {
    const e = this.exp.get(k);
    if (e && e < Date.now()) {
      this.kv.delete(k);
      this.exp.delete(k);
    }
    return this.kv.has(k);
  }
  async get(k) {
    return this._alive(k) ? this.kv.get(k) : null;
  }
  async set(k, v, opts = {}) {
    if (opts.nx && this._alive(k)) return null;
    this.kv.set(k, String(v));
    if (opts.ex) this.exp.set(k, Date.now() + opts.ex * 1000);
    return 'OK';
  }
  async incr(k) {
    const v = Number((await this.get(k)) || 0) + 1;
    const e = this.exp.get(k);
    this.kv.set(k, String(v));
    if (e) this.exp.set(k, e);
    return v;
  }
  async expire(k, s) {
    if (!this._alive(k)) return 0;
    this.exp.set(k, Date.now() + s * 1000);
    return 1;
  }
  async lpush(k, ...vals) {
    const l = this._alive(k) ? this.kv.get(k) : [];
    l.unshift(...vals.reverse());
    this.kv.set(k, l);
    return l.length;
  }
  async lrange(k, a, b) {
    const l = this._alive(k) ? this.kv.get(k) : [];
    return l.slice(a, b === -1 ? undefined : b + 1);
  }
  async llen(k) {
    return this._alive(k) ? this.kv.get(k).length : 0;
  }
  async mget(...keys) {
    return Promise.all(keys.map((k) => this.get(k)));
  }
  async hincrby(k, f, n) {
    const h = this._alive(k) ? this.kv.get(k) : {};
    h[f] = (h[f] || 0) + n;
    this.kv.set(k, h);
    return h[f];
  }
  async hgetall(k) {
    return this._alive(k) ? { ...this.kv.get(k) } : null;
  }
  multi() {
    const ops = [];
    const tx = new Proxy(
      {},
      {
        get: (_, name) =>
          name === 'exec'
            ? async () => {
                const out = [];
                for (const [fn, args] of ops) out.push(await this[fn](...args));
                return out;
              }
            : (...args) => (ops.push([name, args]), tx)
      }
    );
    return tx;
  }
}

let memory = null;

/** the store, or null when nothing is configured on Vercel */
export function getStore() {
  if (redis) return redis;
  redis = fromEnv();
  if (redis) return redis;
  if (process.env.VERCEL) return null;
  memory ??= new MemoryStore();
  return memory;
}
