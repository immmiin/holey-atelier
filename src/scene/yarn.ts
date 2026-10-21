// Soft cotton knit yarn.
//
// Everything is keyed to the *material coordinate* m (how far along the yarn a
// point is, counted from where unravelling began), so crimp, twist and colour
// travel with the yarn as it pays out instead of sliding over it.

export type RGB = [number, number, number];

export interface YarnStyle {
  /** yarn width in px */
  w: number;
  /** crimp wavelength in px of yarn (≈ the yarn length of one stitch) */
  lambda: number;
  /** 0 = straight (taut), 1 = fully relaxed ramen crimp */
  slack: number;
  colorAt: (m: number) => RGB;
}

const SX: number[] = [], SY: number[] = [], SS: number[] = [];

/** Catmull-Rom through the nodes, sampled every ~step px. Fills SX/SY/SS (arc length). */
function smooth(xs: ArrayLike<number>, ys: ArrayLike<number>, n: number, step: number) {
  SX.length = SY.length = SS.length = 0;
  let s = 0;
  SX.push(xs[0]);
  SY.push(ys[0]);
  SS.push(0);
  for (let i = 0; i < n - 1; i++) {
    const i0 = Math.max(0, i - 1), i3 = Math.min(n - 1, i + 2);
    const x0 = xs[i0], y0 = ys[i0], x1 = xs[i], y1 = ys[i], x2 = xs[i + 1], y2 = ys[i + 1], x3 = xs[i3], y3 = ys[i3];
    const seg = Math.hypot(x2 - x1, y2 - y1);
    const k = Math.max(1, Math.ceil(seg / step));
    for (let j = 1; j <= k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3);
      const y = 0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3);
      s += Math.hypot(x - SX[SX.length - 1], y - SY[SY.length - 1]);
      SX.push(x);
      SY.push(y);
      SS.push(s);
    }
  }
}

/** irregular "ramen" crimp, roughly unit amplitude */
export function crimp(m: number, lambda: number) {
  const p = (m / lambda) * Math.PI * 2;
  return (Math.sin(p) + 0.16 * Math.sin(p * 2.07 + 1.3) + 0.3 * Math.sin(p * 0.43 + 0.7)) / 1.3;
}

export function rgb(c: RGB, k = 1, a = 1) {
  return `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},${a})`;
}

/** darken towards a warm umber instead of grey, so cream yarn stays cream in shadow */
export function shade(c: RGB, k: number, a = 1) {
  const t = 1 - Math.min(1, k);
  return `rgba(${(c[0] * (1 - t) + 58 * t) | 0},${(c[1] * (1 - t) + 36 * t) | 0},${(c[2] * (1 - t) + 30 * t) | 0},${a})`;
}

export function lighten(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}

const CX: number[] = [], CY: number[] = [], NX: number[] = [], NY: number[] = [];

/**
 * Draw a yarn along rope nodes. mStart is the material coordinate at node 0;
 * material decreases along the rope (node 0 is the newest yarn).
 */
export function drawYarn(
  ctx: CanvasRenderingContext2D,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  n: number,
  mStart: number,
  st: YarnStyle,
  taper: { start: number; end: number } = { start: 4, end: 4 },
) {
  if (n < 2) return;
  smooth(xs, ys, n, Math.max(0.8, st.lambda / 7));
  const m = SX.length;
  if (m < 2) return;
  const total = SS[m - 1];
  if (total < 0.5) return;
  const amp = st.w * 0.62 * st.slack;
  CX.length = CY.length = NX.length = NY.length = 0;
  for (let i = 0; i < m; i++) {
    const a = Math.max(0, i - 1), b = Math.min(m - 1, i + 1);
    let tx = SX[b] - SX[a], ty = SY[b] - SY[a];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const s = SS[i];
    const env = Math.min(1, s / taper.start, (total - s) / taper.end);
    const o = amp * Math.max(0, env) * crimp(mStart - s, st.lambda);
    NX.push(-ty);
    NY.push(tx);
    CX.push(SX[i] - ty * o);
    CY.push(SY[i] + tx * o);
  }

  // chunk by colour (colour changes slowly along the yarn)
  const chunk = 22;
  const w = st.w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pass = (
    style: (c: RGB) => string,
    width: number,
    off: number,
    dx = 0,
    dy = 0,
    dash?: [number, number],
  ) => {
    ctx.lineWidth = width;
    let i = 0;
    while (i < m - 1) {
      const s0 = SS[i];
      let j = i + 1;
      while (j < m - 1 && SS[j] - s0 < chunk) j++;
      const c = st.colorAt(mStart - (s0 + SS[j]) / 2);
      ctx.strokeStyle = style(c);
      if (dash) {
        ctx.setLineDash(dash);
        ctx.lineDashOffset = s0 - mStart;
      }
      ctx.beginPath();
      for (let k = i; k <= j; k++) {
        const x = CX[k] + NX[k] * off + dx, y = CY[k] + NY[k] * off + dy;
        if (k === i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      i = j;
    }
    if (dash) ctx.setLineDash([]);
  };

  ctx.lineCap = 'butt';
  // soft cast shadow (not an outline)
  pass(() => 'rgba(26,15,31,0.10)', w + 1.0, 0, 0.5, 1.1);
  // fine fuzz halo
  pass((c) => rgb(c, 1, 0.2), w + 1.6, 0);
  // body
  ctx.lineCap = 'round';
  pass((c) => rgb(c, 0.93), w, 0);
  // 2-ply twist: low-contrast shade + highlight plies, dashed along the material
  const tw = Math.max(1.6, w * 1.15);
  pass((c) => rgb(c, 0.8, 0.38), w * 0.42, w * 0.2, 0, 0, [tw * 0.5, tw * 0.5]);
  pass((c) => rgb(lighten(c, 0.22), 1, 0.5), w * 0.38, -w * 0.18, 0, 0, [tw * 0.5, tw * 0.5]);
}

/** draw a single short crimped yarn piece given as a centreline (used for heap loops and tails) */
export function strokeYarnPath(
  ctx: CanvasRenderingContext2D,
  xs: number[],
  ys: number[],
  c: RGB,
  w: number,
  k: number,
  shadowA = 0.2,
) {
  const n = xs.length;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(0.4, 0.9);
  path();
  ctx.strokeStyle = `rgba(26,15,31,${shadowA})`;
  ctx.lineWidth = w + 0.9;
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = shade(c, k, 0.14);
  ctx.lineWidth = w + 2;
  ctx.stroke();
  ctx.strokeStyle = shade(c, k * 0.97);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.save();
  ctx.translate(-w * 0.15, -w * 0.2);
  path();
  ctx.strokeStyle = shade(lighten(c, 0.2), k, 0.45);
  ctx.lineWidth = w * 0.38;
  ctx.setLineDash([w * 0.6, w * 0.6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
