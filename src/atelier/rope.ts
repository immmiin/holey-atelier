// A verlet rope with a fixed node count and a variable rest length.
// Yarn is fed in or out by changing `len`; node positions are kept, so the
// rope never jumps.

export class Rope {
  n: number;
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  len = 0;
  pinStart = true;
  pinEnd = false;

  constructor(n: number) {
    this.n = n;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
  }

  /** resample a polyline into this rope's nodes (velocity is zeroed) */
  setFromPolyline(xs: ArrayLike<number>, ys: ArrayLike<number>) {
    const m = xs.length;
    const cum = new Float32Array(m);
    for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    const L = cum[m - 1];
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      const s = (L * i) / (this.n - 1);
      while (j < m - 2 && cum[j + 1] < s) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      const t = m > 1 ? Math.min(1, Math.max(0, (s - cum[j]) / seg)) : 0;
      const x = m > 1 ? xs[j] + (xs[j + 1] - xs[j]) * t : xs[0];
      const y = m > 1 ? ys[j] + (ys[j + 1] - ys[j]) * t : ys[0];
      this.x[i] = this.px[i] = x;
      this.y[i] = this.py[i] = y;
    }
  }

  /** node positions as plain arrays, optionally only up to arc length `upTo` */
  polyline(): [number[], number[]] {
    return [Array.from(this.x), Array.from(this.y)];
  }

  chord() {
    const n = this.n - 1;
    return Math.hypot(this.x[n] - this.x[0], this.y[n] - this.y[0]);
  }

  step(
    dt: number,
    g: number,
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    collide: (r: Rope, i: number) => void,
    iters = 14,
    damp = 0.985,
  ) {
    const { n, x, y, px, py } = this;
    for (let i = 0; i < n; i++) {
      const vx = (x[i] - px[i]) * damp, vy = (y[i] - py[i]) * damp;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += vx;
      y[i] += vy + g * dt * dt;
    }
    let rest = this.len / (n - 1);
    if (this.pinStart && this.pinEnd) {
      // a taut rope is drawn straight instead of fighting the constraint
      const ch = Math.hypot(ex - sx, ey - sy);
      if (ch > this.len) rest = ch / (n - 1);
    }
    for (let it = 0; it < iters; it++) {
      if (this.pinStart) {
        x[0] = sx;
        y[0] = sy;
      }
      if (this.pinEnd) {
        x[n - 1] = ex;
        y[n - 1] = ey;
      }
      for (let i = 0; i < n - 1; i++) {
        const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i];
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = (d - rest) / d;
        const wa = i === 0 && this.pinStart ? 0 : 1;
        const wb = i + 1 === n - 1 && this.pinEnd ? 0 : 1;
        const ws = wa + wb;
        if (!ws) continue;
        x[i] += (dx * diff * wa) / ws;
        y[i] += (dy * diff * wa) / ws;
        x[i + 1] -= (dx * diff * wb) / ws;
        y[i + 1] -= (dy * diff * wb) / ws;
      }
      for (let i = 0; i < n; i++) collide(this, i);
    }
    if (this.pinStart) {
      x[0] = sx;
      y[0] = sy;
    }
    if (this.pinEnd) {
      x[n - 1] = ex;
      y[n - 1] = ey;
    }
  }

  /** nearest point on the polyline: distance and arc length from the start */
  nearest(qx: number, qy: number) {
    const { n, x, y } = this;
    let best = Infinity, bestS = 0, bx = x[0], by = y[0];
    let s = 0;
    for (let i = 0; i < n - 1; i++) {
      const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i];
      const l2 = dx * dx + dy * dy;
      const segL = Math.sqrt(l2);
      const t = l2 ? Math.max(0, Math.min(1, ((qx - x[i]) * dx + (qy - y[i]) * dy) / l2)) : 0;
      const cx = x[i] + dx * t, cy = y[i] + dy * t;
      const d = Math.hypot(qx - cx, qy - cy);
      if (d < best) {
        best = d;
        bestS = s + segL * t;
        bx = cx;
        by = cy;
      }
      s += segL;
    }
    // map polyline arc length onto rope length (taut ropes are longer than rest)
    const total = s || 1;
    return { dist: best, s: (bestS / total) * this.len, x: bx, y: by, frac: bestS / total };
  }

  /** split the polyline at fraction f; returns [head, tail] with the cut point in both */
  split(f: number, cutX: number, cutY: number): [[number[], number[]], [number[], number[]]] {
    const { n, x, y } = this;
    const k = Math.min(n - 2, Math.max(0, Math.floor(f * (n - 1))));
    const hx = Array.from(x.slice(0, k + 1)), hy = Array.from(y.slice(0, k + 1));
    hx.push(cutX);
    hy.push(cutY);
    const tx = [cutX, ...Array.from(x.slice(k + 1))], ty = [cutY, ...Array.from(y.slice(k + 1))];
    return [[hx, hy], [tx, ty]];
  }
}
