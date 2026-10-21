// Detects whether /models/sock-N.glb exists. Dev servers and SPA hosts answer
// unknown paths with index.html (200), so a hit must also not be text/html.
const cache = new Map();

export function modelUrl(n) {
  return `/models/sock-${n}.glb`;
}

export function hasModel(n) {
  if (!cache.has(n)) {
    cache.set(
      n,
      fetch(modelUrl(n), { method: 'HEAD' })
        .then((r) => r.ok && !(r.headers.get('content-type') || '').includes('text/html'))
        .catch(() => false)
    );
  }
  return cache.get(n);
}
