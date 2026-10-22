// Concurrency + validation test against the API: 20 parallel valid orders (distinct client IPs)
// and a batch of invalid ones. Invalid ones must be rejected; counters must add up exactly.
// Usage: node scripts/api-concurrency.mjs [base]   (locally: the dev API on :3101)
const base = (process.argv[2] || 'http://localhost:3101').replace(/\/$/, '');
const post = (body, ip) =>
  fetch(`${base}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(ip ? { 'x-forwarded-for': ip } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const stats = () => fetch(`${base}/api/stats`, { cache: 'no-store' }).then((r) => r.json());

const slugs = ['heel-yeah', 'lost-in-laundry', 'purple-reign', 'big-toe-energy', 'toe-jam', 'grass-stain'];
const valid = Array.from({ length: 20 }, (_, i) => ({ sockSlug: slugs[i % 6], holePct: 5 + i * 4, laborSec: 10 + i, price: 10 + i, unravelSeed: i * 7 }));
const invalid = [
  { sockSlug: 'dryer-lint', holePct: 40, laborSec: 20, price: 20, unravelSeed: 1 },
  { sockSlug: 'toe-jam', holePct: 140, laborSec: 20, price: 20, unravelSeed: 1 },
  { sockSlug: 'toe-jam', holePct: 40.5, laborSec: 20, price: 20, unravelSeed: 1 },
  { sockSlug: 'toe-jam', holePct: 40, laborSec: 0, price: 20, unravelSeed: 1 },
  { sockSlug: 'toe-jam', holePct: 40, laborSec: 20, price: 120, unravelSeed: 1 },
  { sockSlug: 'toe-jam', holePct: 40, laborSec: 20, price: 20, unravelSeed: 1, name: '<script>' },
  { sockSlug: 'toe-jam', holePct: 40, laborSec: 20, price: 20 },
  '{not json',
  'x'.repeat(5000)
];

const s0 = await stats();
const results = await Promise.all([
  ...valid.map((o, i) => post(o, `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`)),
  ...invalid.map((o, i) => post(o, `10.9.0.${i + 1}`))
]);
const ok = results.slice(0, valid.length);
const bad = results.slice(valid.length);
const accepted = ok.filter((r) => r.status === 201);
const serials = new Set(accepted.map((r) => r.body.serial));
// one client, twice in a row: the second must be rate limited
const r1 = await post(valid[0], '10.7.7.7');
const r2 = await post(valid[0], '10.7.7.7');
const s1 = await stats();
const expectLabor = valid.filter((_, i) => ok[i].status === 201).reduce((t, o) => t + o.laborSec, 0) + (r1.status === 201 ? valid[0].laborSec : 0);
const expectOrders = accepted.length + (r1.status === 201 ? 1 : 0);
const lines = [
  `valid accepted: ${accepted.length}/20, unique serials: ${serials.size}`,
  `invalid rejected: ${bad.filter((r) => r.status >= 400 && r.status < 500).length}/${invalid.length} (${bad.map((r) => r.status).join(',')})`,
  `rate limit: first ${r1.status}, second ${r2.status}`,
  `orders +${s1.totalOrders - s0.totalOrders} (expected +${expectOrders}), labor +${s1.totalLaborSec - s0.totalLaborSec} (expected +${expectLabor}), wages ${s1.wagesPaid}`
];
lines.forEach((l) => console.log(l));
const pass =
  serials.size === accepted.length &&
  bad.every((r) => r.status >= 400 && r.status < 500) &&
  r2.status === 429 &&
  s1.totalOrders - s0.totalOrders === expectOrders &&
  s1.totalLaborSec - s0.totalLaborSec === expectLabor &&
  s1.wagesPaid === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exitCode = pass ? 0 : 1;
