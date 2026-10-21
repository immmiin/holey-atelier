// The floor heap. Its silhouette area is proportional to the yarn length it
// holds (so at 100% it is `heapRatio` × the sock's silhouette). It is a mound
// with height ≈ 0.45 × width that widens and rises. Every `loopLen` px of yarn
// is one loop; loops are laid in material order, fall onto the top and slide
// to their place on the current surface, then get baked into an offscreen
// canvas. Removing yarn (lifting) unbakes from the top in reverse order.

import { type RGB, crimp, shade, strokeYarnPath } from './yarn';

const ASPECT = 0.45;
const SETTLE = 0.42;
const PROFILE_POW = 0.6;

/** ∫_{-1}^{1} (1-u²)^p du */
const PROFILE_INT = (() => {
  let s = 0;
  const K = 400;
  for (let i = 0; i < K; i++) {
    const u = -1 + (2 * (i + 0.5)) / K;
    s += Math.pow(1 - u * u, PROFILE_POW) * (2 / K);
  }
  return s;
})();

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Loop {
  i: number;
  tx: number;
  ty: number;
  r: number;
  rot: number;
  span: number;
  squash: number;
  phase: number;
  c: RGB;
  shade: number;
  born: number;
  sx: number;
  sy: number;
  su: number;
}

export class Heap {
  cx = 0;
  base = 0;
  unit = 1;
  /** silhouette area (px²) per px of yarn */
  areaPerLen = 1;
  loopLen = 30;
  yw = 2;
  lambda = 7;
  dpr = 1;
  maxLen = 1;
  loops: Loop[] = [];
  baked = 0;
  length = 0;
  canvas = document.createElement('canvas');
  ctx = this.canvas.getContext('2d')!;
  ox = 0;
  oy = 0;
  colorAt: (m: number) => RGB = () => [200, 200, 200];
  /** material coordinate of the first yarn in the heap */
  m0 = 0;

  layout(o: {
    cx: number;
    base: number;
    unit: number;
    areaPerLen: number;
    maxLen: number;
    yw: number;
    lambda: number;
    dpr: number;
    m0: number;
    colorAt: (m: number) => RGB;
  }) {
    Object.assign(this, o);
    this.loopLen = 15 * o.unit;
    const wMax = this.widthFor(o.maxLen) + 40 * o.unit;
    const hMax = this.heightFor(o.maxLen) + 40 * o.unit;
    this.ox = o.cx - wMax / 2;
    this.oy = o.base - hMax;
    this.canvas.width = Math.ceil(wMax * o.dpr);
    this.canvas.height = Math.ceil((hMax + 14 * o.unit) * o.dpr);
    // positions depend on layout: regenerate
    const n = this.loops.length;
    this.loops = [];
    for (let i = 0; i < n; i++) this.loops.push(this.makeLoop(i, -1e9));
    this.rebake(n);
  }

  widthFor(len: number) {
    const A = Math.max(0, len) * this.areaPerLen;
    return Math.sqrt(A / (0.5 * ASPECT * PROFILE_INT));
  }
  heightFor(len: number) {
    return this.widthFor(len) * ASPECT;
  }
  surfaceY(x: number, len = this.length) {
    const w = this.widthFor(len);
    if (w <= 0) return this.base;
    const u = (x - this.cx) / (w / 2);
    if (Math.abs(u) >= 1) return this.base;
    return this.base - this.heightFor(len) * Math.pow(1 - u * u, PROFILE_POW);
  }
  top(len = this.length) {
    return { x: this.cx, y: this.base - this.heightFor(len) };
  }
  get width() {
    return this.widthFor(this.length);
  }
  get height() {
    return this.heightFor(this.length);
  }

  private makeLoop(i: number, now: number): Loop {
    const R = rng(i * 7919 + 17);
    const L = (i + 1) * this.loopLen;
    const w = this.widthFor(L), h = this.heightFor(L);
    // place it area-uniformly in the newest shell of the mound (between the
    // mound a few loops ago and the mound now), so every part of the pile gets
    // yarn in proportion to its area
    const r = (3.6 + R() * 3.4) * this.unit;
    const squash = 0.5 + R() * 0.25;
    const inner = Math.max(0, L - this.loopLen * 8);
    const wi = this.widthFor(inner), hi = this.heightFor(inner);
    const inDome = (x: number, y: number, ww: number, hh: number) => {
      if (ww <= 0) return false;
      const uu = x / (ww / 2);
      return Math.abs(uu) < 1 && y < hh * Math.pow(1 - uu * uu, PROFILE_POW);
    };
    let dx = 0, up = 0;
    for (let tries = 0; tries < 400; tries++) {
      dx = (R() * 2 - 1) * (w / 2);
      up = R() * h;
      if (inDome(dx, up, w, h) && !inDome(dx, up, wi, hi)) break;
    }
    const u = dx / Math.max(1, w / 2);
    const tx = this.cx + dx;
    const ty = Math.min(this.base - up, this.base - r * squash * 0.55);
    const slope = (-2 * u * h * PROFILE_POW * Math.pow(Math.max(1e-3, 1 - u * u), PROFILE_POW - 1)) / Math.max(1, w / 2);
    const hf = Math.max(0, Math.min(1, (this.base - ty) / Math.max(1, h)));
    const top = this.top(L - this.loopLen);
    return {
      i, tx, ty, r, squash,
      rot: Math.atan(slope) * 0.7 + (R() - 0.5) * 0.6,
      span: 5 + R() * 3,
      phase: R() * Math.PI * 2,
      c: this.colorAt(this.m0 + i * this.loopLen + this.loopLen / 2),
      shade: 0.86 + 0.14 * hf + (R() - 0.5) * 0.05,
      born: now,
      sx: top.x + (R() - 0.5) * 6 * this.unit,
      sy: top.y - 6 * this.unit,
      su: u,
    };
  }

  /** set the yarn length held by the heap */
  setLength(len: number, now: number) {
    this.length = Math.max(0, len);
    const count = Math.floor(this.length / this.loopLen);
    while (this.loops.length < count) this.loops.push(this.makeLoop(this.loops.length, now));
    if (this.loops.length > count) {
      this.loops.length = count;
      if (this.baked > count) this.rebake(count);
    }
  }

  private drawLoop(ctx: CanvasRenderingContext2D, L: Loop, x: number, y: number, k = 1) {
    const { r, squash, rot, span, phase } = L;
    const yw = this.yw;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    // soft colour depth behind the strand: fills the gaps of the pile without hard edges
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.7);
    g.addColorStop(0, shade(L.c, L.shade * 0.84, 0.7 * k));
    g.addColorStop(0.6, shade(L.c, L.shade * 0.84, 0.35 * k));
    g.addColorStop(1, shade(L.c, L.shade * 0.86, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.7, r * 1.7 * squash, rot, 0, Math.PI * 2);
    ctx.fill();
    // two lazy, crimped strands: loose curls that wander a little
    for (let strand = 0; strand < 2; strand++) {
    const xs: number[] = [], ys: number[] = [];
    const K = 30;
    const ph = phase + strand * 2.4, ox = strand ? r * 0.55 : 0, oy = strand ? -r * 0.25 : 0;
    for (let j = 0; j <= K; j++) {
      const t = (j / K) * span * (strand ? 0.7 : 1);
      const a = ph + t;
      const arc = r * t;
      const wander = 1 + 0.28 * Math.sin(1.7 * t + ph * 2) + 0.12 * Math.sin(4.1 * t);
      const rad = r * wander * (strand ? 0.8 : 1) + yw * 0.45 * crimp(arc + L.i * 13 + strand * 50, this.lambda);
      const lx = Math.cos(a) * rad + (t - span / 2) * r * 0.18 + ox, ly = Math.sin(a) * rad * squash + oy;
      xs.push(x + lx * cos - ly * sin);
      ys.push(y + lx * sin + ly * cos);
    }
    strokeYarnPath(ctx, xs, ys, L.c, yw, L.shade * (strand ? 1.03 : 1), 0.1);
    }
  }

  private bakeOne(L: Loop) {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, -this.ox * dpr, -this.oy * dpr);
    // older yarn sinks into shadow as more is piled on
    if (L.i > 0 && L.i % 10 === 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(58,36,30,0.016)';
      ctx.fillRect(this.ox, this.oy, this.canvas.width, this.canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.drawLoop(ctx, L, L.tx, L.ty);
  }

  rebake(count: number) {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.baked = 0;
    for (let i = 0; i < count && i < this.loops.length; i++) {
      this.bakeOne(this.loops[i]);
      this.baked++;
    }
  }

  update(now: number) {
    while (this.baked < this.loops.length && now - this.loops[this.baked].born >= SETTLE) {
      this.bakeOne(this.loops[this.baked]);
      this.baked++;
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    const w = this.width;
    if (w > 1) {
      const g = ctx.createRadialGradient(this.cx, this.base, 0, this.cx, this.base, w * 0.62);
      g.addColorStop(0, 'rgba(26,15,31,0.24)');
      g.addColorStop(0.6, 'rgba(26,15,31,0.10)');
      g.addColorStop(1, 'rgba(26,15,31,0)');
      ctx.save();
      ctx.translate(this.cx, this.base);
      ctx.scale(1, Math.max(0.06, 0.1));
      ctx.translate(-this.cx, -this.base);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.cx, this.base, w * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.drawImage(this.canvas, this.ox, this.oy, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    // loops still falling / settling
    for (let i = this.baked; i < this.loops.length; i++) {
      const L = this.loops[i];
      const t = Math.max(0, Math.min(1, (now - L.born) / SETTLE));
      // fall onto the top first, then slide down the slope to its place
      const fall = Math.min(1, t / 0.35);
      const slide = Math.max(0, (t - 0.35) / 0.65);
      const e = 1 - Math.pow(1 - slide, 3);
      const topY = this.surfaceY(L.sx);
      let x = L.sx + (L.tx - L.sx) * e;
      let y: number;
      if (slide <= 0) {
        y = L.sy + (topY - L.sy) * fall * fall;
        x = L.sx;
      } else {
        y = Math.min(this.surfaceY(x) + (L.ty - this.surfaceY(L.tx)) * e, this.base - L.r * L.squash * 0.55);
      }
      this.drawLoop(ctx, L, x, y, 0.8 + 0.2 * t);
    }
  }

  hit(x: number, y: number, pad: number) {
    const w = this.width;
    if (w < 2) return false;
    return Math.abs(x - this.cx) < w / 2 + pad && y > this.base - this.height - pad && y < this.base + pad;
  }
}
