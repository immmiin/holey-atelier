// The atelier scene: clothesline with the six socks, the big clothespin, the
// sock being unravelled, the thread and the heap on the floor. One canvas,
// one continuous scene; the UI layers (badge, receipt, certificate) sit on top.
//
// Phases: line (pick a sock) → choosing (it slides to the big pin) → badge
// (sign your name) → pull → frozen (receipt / certificate).
//
// Conservation: U is the yarn length unravelled so far. The fabric removed is
// U / Ltot of the sock's area (Ltot = pulls × pullLen, so packing is implied).
//   U + lead = L1 (sock → hand) + L2 (hand → heap) + heap length
// The yarn in the air is clamped to what reaches the hand plus a natural
// droop; everything else flows into the heap.

import { type SockModel, CELL, cellPos } from './model';
import { sockImage, sockModel } from './models';
import { Heap } from './heap';
import { Rope } from './rope';
import { setTension, tick, twang } from './sound';
import { SOCKS, type SockDef } from './socks';
import { tune } from './tuning';
import { type RGB, drawYarn, lighten, rgb, shade, strokeYarnPath } from './yarn';

export type Phase = 'line' | 'choosing' | 'badge' | 'pull' | 'frozen';
export type SceneEvent = 'pair' | 'ready' | 'finished';

export interface HudState {
  phase: Phase;
  sockId: number;
  p: number;
  price: number;
  laborMs: number;
  started: boolean;
  finished: boolean;
  holding: boolean;
  shiver: number;
  lineY: number;
}

export function priceFor(p: number) {
  if (p >= 1) return 99;
  return p < 0.9 ? 9 + 36 * Math.pow(p / 0.9, 1.4) : 45 + ((p - 0.9) / 0.1) * 30;
}

const REF_SOCK_H = 504;
const CHOOSE_T = 1.05;

interface LineSock {
  id: number;
  img: HTMLImageElement | null;
  /** cuff top centre, normalised to the image */
  cuff: { x: number; y: number };
  x: number;
  tx: number;
  v: number;
  theta: number;
  omega: number;
  h: number;
  th: number;
  alpha: number;
  ta: number;
  cache?: HTMLCanvasElement;
  cacheH?: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function cuffOf(img: HTMLImageElement) {
  const w = 120, h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) {
    let sx = 0, n = 0;
    for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) {
      sx += x;
      n++;
    }
    if (n > 4) return { x: (sx / n + 0.5) / w, y: y / h };
  }
  return { x: 0.6, y: 0.01 };
}

function mk(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** the 1–2 px outline of a shape held in a canvas's alpha */
function outline(src: HTMLCanvasElement, color: string, px: number) {
  const { width: w, height: h } = src;
  const er = mk(w, h), e = er.getContext('2d')!;
  e.drawImage(src, px, 0);
  e.globalCompositeOperation = 'destination-in';
  e.drawImage(src, -px, 0);
  e.drawImage(src, 0, px);
  e.drawImage(src, 0, -px);
  const out = mk(w, h), o = out.getContext('2d')!;
  o.drawImage(src, 0, 0);
  o.globalCompositeOperation = 'destination-out';
  o.drawImage(er, 0, 0);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = color;
  o.fillRect(0, 0, w, h);
  return out;
}
const N1 = 36, N2 = 22;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  def: SockDef = SOCKS[0];
  model: SockModel | null = null;
  onFrame: (h: HudState) => void;
  onEvent: (e: SceneEvent) => void;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  phase: Phase = 'line';
  socks: LineSock[] = [];
  drag: { s: LineSock; off: number; x0: number; t0: number; moved: number } | null = null;
  choose0 = { x: 0, h: 0, theta: 0, t: 0 };
  lineLeft = 0;
  lineRight = 0;

  W = 0;
  H = 0;
  dpr = 1;
  s = 1;
  unit = 1;
  sockH = 0;
  lineY = 0;
  pinX = 0;
  pinDrop = 0;
  tableY = 0;
  baseY = 0;
  pivL = { x: 0, y: 0 };
  yw = 2;
  lambda = 7;
  Ltot = 5000;
  lead = 90;

  // physics state
  theta = 0;
  omega = 0;
  U = 0;
  L1 = 0;
  L2 = 0;
  holding = false;
  pointerType = 'mouse';
  P = { x: 0, y: 0 };
  Hd = { x: 0, y: 0 };
  tension = 0;
  pendingPay = 0;
  lastPop = -1;
  shiverT = -10;
  finished = false;
  laborStart = -1;
  laborEnd = -1;
  end1 = { x: 0, y: 0 };
  end2 = { x: 0, y: 0 };
  rope1 = new Rope(N1);
  rope2 = new Rope(N2);
  heap = new Heap();
  auto = { active: false, phase: 'idle' as 'idle' | 'pull' | 'gap', t: 0, dx: 0, dy: 0, dist: 0 };
  pops = 0;
  lastVibe = 0;

  // rendering
  photo = document.createElement('canvas');
  sockCv = document.createElement('canvas');
  sockCtx = this.sockCv.getContext('2d')!;
  maskCv = document.createElement('canvas');
  maskCtx = this.maskCv.getContext('2d')!;
  maskData!: ImageData;
  maskK = 0;
  sockDirty = false;
  sockPad = 40;
  bg = document.createElement('canvas');
  hover = false;
  raf = 0;
  last = 0;
  ready = false;
  disposed = false;

  constructor(canvas: HTMLCanvasElement, onFrame: (h: HudState) => void, onEvent: (e: SceneEvent) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onFrame = onFrame;
    this.onEvent = onEvent;
    // the static wall + table live on their own layer behind the scene
    this.bg.className = 'scene-bg';
    this.bg.setAttribute('aria-hidden', 'true');
    canvas.parentElement?.insertBefore(this.bg, canvas);
    this.bind();
    void this.load();
  }

  /** scene time, frozen for the duration of a frame so physics and drawing agree */
  now = 0;
  get p() {
    return this.model ? Math.min(1, this.U / this.Ltot) : 0;
  }
  get pulling() {
    return this.phase === 'pull';
  }

  async load() {
    this.socks = SOCKS.map((d, i) => ({
      id: d.id, img: null, cuff: { x: 0.6, y: 0.01 }, x: 0, tx: 0, v: 0,
      theta: 0, omega: (i % 2 ? 1 : -1) * 0.6, h: 0, th: 0, alpha: 0, ta: 1,
    }));
    this.resize();
    for (const s of this.socks) s.x = s.tx;
    this.ready = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    await Promise.all(
      this.socks.map(async (s) => {
        const img = await sockImage(s.id);
        s.cuff = cuffOf(img);
        s.img = img;
      }),
    );
    // warm the knit models in the worker so picking a sock is instant
    for (const d of SOCKS) await sockModel(d.id);
  }

  async rebuild() {
    if (!this.model) return;
    const m = await sockModel(this.def.id);
    this.useModel(m);
    this.resetSock();
  }

  /** install a knit model as the big sock */
  useModel(m: SockModel) {
    this.model = m;
    this.maskCv.width = m.gw;
    this.maskCv.height = m.gh;
    this.maskData = this.maskCtx.createImageData(m.gw, m.gh);
    const ls = this.socks.find((s) => s.id === this.def.id);
    if (ls) ls.cuff = { x: m.cuff.x / m.w, y: m.cuff.y / m.h };
    this.resize();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.bg.remove();
  }

  // ---------------------------------------------------------------- layout

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    const { W, H } = this;
    const narrow = W < 700;
    // the reference aspect of the sock photos (≈ 659 × 1372)
    const aspect = this.model ? this.model.h / this.model.w : 2.08;
    this.lineY = Math.max(72, Math.min(116, H * 0.125));
    this.sockH = Math.min(H * (narrow ? 0.5 : 0.54), (W * (narrow ? 0.5 : 0.36) * aspect));
    this.unit = this.sockH / REF_SOCK_H;
    const u = this.unit;
    this.pinX = W * 0.4;
    this.pinDrop = 46 * u;
    this.tableY = Math.max(this.lineY + this.pinDrop + this.sockH + 24 * u, H * 0.78);
    this.baseY = this.tableY + (H - this.tableY) * (narrow ? 0.42 : 0.5);
    this.layoutLine();
    this.drawBg();
    if (!this.model) return;
    const m = this.model;
    this.s = this.sockH / m.h;
    this.pivL = { x: m.cuff.x, y: m.cuff.y - this.pinDrop / this.s };
    this.yw = Math.max(1.5, m.gauge * this.s * 0.95) * tune.yarn;
    this.lambda = 1.5 * Math.PI * m.gauge * this.s * Math.max(1, tune.yarn * 0.9);
    this.Ltot = tune.pulls * tune.pullLen * u;
    this.lead = 92 * u;

    // photo pre-scaled to display size (keeps the knit crisp)
    const pad = (this.sockPad = 40);
    const sw = Math.ceil((m.w + pad * 2) * this.s * this.dpr), sh = Math.ceil((m.h + pad * 2) * this.s * this.dpr);
    this.photo.width = this.sockCv.width = sw;
    this.photo.height = this.sockCv.height = sh;
    const pc = this.photo.getContext('2d')!;
    pc.imageSmoothingQuality = 'high';
    pc.drawImage(m.img, pad * this.s * this.dpr, pad * this.s * this.dpr, m.w * this.s * this.dpr, m.h * this.s * this.dpr);

    this.buildColorTable();
    const sockAreaScreen = m.area * this.s * this.s;
    // the heap has one fixed spot on the floor, just beside the toe, for the whole sock
    const areaPerLen = (tune.heapRatio * sockAreaScreen) / this.Ltot;
    this.heap.areaPerLen = areaPerLen;
    const maxW = this.heap.widthFor(this.Ltot + this.lead);
    const toeX = this.pinX + (m.hole.x - this.pivL.x) * this.s;
    const cx = Math.max(maxW / 2 + 10, Math.min(W - maxW / 2 - 10, toeX + maxW * 0.32));
    this.heap.layout({
      cx,
      base: this.baseY,
      unit: u,
      areaPerLen,
      maxLen: this.Ltot + this.lead,
      yw: this.yw,
      lambda: this.lambda,
      dpr: this.dpr,
      m0: -this.lead,
      colorAt: this.colorAt,
    });
    this.maskK = -1;
    this.composeSock();
  }

  /** small socks on the line: six evenly in the line phase, the other five parked once one is chosen */
  layoutLine() {
    const { W, H } = this;
    const narrow = W < 700;
    const tagW = narrow ? 128 : Math.min(212, Math.max(132, W * 0.15));
    const tagR = narrow ? 12 : Math.min(96, Math.max(14, W * 0.06));
    this.lineLeft = narrow ? 6 : 26;
    this.lineRight = narrow ? W - 6 : W - tagR - tagW - 22;
    const aspect = 2.08;
    if (!this.socks.length) return;
    if (this.phase === 'line') {
      const n = this.socks.length;
      const span = this.lineRight - this.lineLeft;
      const slot = span / n;
      const h = Math.min(H * (narrow ? 0.26 : 0.33), slot * 0.86 * aspect);
      this.socks.forEach((s, i) => {
        s.th = h;
        s.tx = this.lineLeft + slot * (i + 0.5);
        s.ta = 1;
        if (!s.h) s.h = h;
      });
      return;
    }
    const others = this.socks.filter((s) => s.id !== this.def.id);
    const bigHalf = (this.sockH / aspect) * 0.62;
    const ivs = [
      [this.lineLeft, this.pinX - bigHalf - 16],
      [this.pinX + bigHalf + 16, this.lineRight],
    ].filter(([a, b]) => b - a > 30);
    const total = ivs.reduce((a, [l, r]) => a + (r - l), 0);
    let k = 0;
    ivs.forEach(([l, r], j) => {
      const share = j === ivs.length - 1 ? others.length - k : Math.round((others.length * (r - l)) / total);
      const spacing = (r - l) / Math.max(1, share);
      const h = Math.min(H * 0.22, spacing * 0.8 * aspect);
      for (let i = 0; i < share && k < others.length; i++, k++) {
        const s = others[k];
        s.tx = l + spacing * (i + 0.5);
        s.th = h;
        s.ta = narrow || h < 70 ? 0 : 1;
      }
    });
    for (; k < others.length; k++) others[k].ta = 0;
  }

  reset() {
    this.resetSock();
  }

  resetSock() {
    if (!this.model) return;
    this.theta = this.omega = 0;
    this.U = 0;
    this.holding = false;
    this.pendingPay = 0;
    this.finished = false;
    this.laborStart = this.laborEnd = -1;
    this.pops = 0;
    this.auto.active = false;
    this.auto.phase = 'idle';
    this.heap.loops = [];
    this.heap.setLength(0, 0);
    this.heap.rebake(0);
    this.maskK = -1;
    for (let i = 0; i < this.maskData.data.length; i += 4) this.maskData.data[i + 3] = 255;
    this.composeSock();
    const A = this.anchor();
    this.L1 = this.lead;
    this.L2 = 0;
    this.rope1.len = this.lead;
    this.rope1.pinStart = true;
    this.rope1.pinEnd = false;
    this.rope1.setFromPolyline([A.x, A.x - 6 * this.unit, A.x + 4 * this.unit], [A.y, A.y + this.lead * 0.5, A.y + this.lead]);
    this.end1 = { x: A.x, y: A.y + this.lead };
  }

  // ------------------------------------------------------------ flow

  choose(id: number) {
    if (this.phase !== 'line') return;
    const s = this.socks.find((x) => x.id === id);
    if (!s || !s.img) return;
    this.drag = null;
    this.def = SOCKS.find((d) => d.id === id)!;
    this.phase = 'choosing';
    this.choose0 = { x: s.x, h: s.h, theta: s.theta, t: this.now };
    this.model = null;
    this.shiverT = this.now;
    twang();
    this.layoutLine();
    void sockModel(id).then((m) => {
      if (this.def.id !== id || this.disposed) return;
      this.useModel(m);
      this.resetSock();
    });
  }

  /** the badge is signed: the thread may be pulled */
  startPull() {
    if (this.phase === 'badge') this.phase = 'pull';
  }

  /** basket pressed: stop all labour, keep the scene alive behind the receipt */
  freeze() {
    if (this.holding) this.release();
    this.auto.active = false;
    if (this.laborStart >= 0 && this.laborEnd < 0) this.laborEnd = this.now;
    this.phase = 'frozen';
    setTension(0);
  }

  /** "Pull another sock": the sold sock is restocked on the line, the heap swept away */
  backToLine() {
    if (this.holding) this.release();
    this.auto.active = false;
    this.model = null;
    this.phase = 'line';
    this.U = 0;
    this.finished = false;
    this.heap.loops = [];
    this.heap.setLength(0, 0);
    this.heap.rebake(0);
    const s = this.socks.find((x) => x.id === this.def.id);
    if (s) {
      s.alpha = 0;
      s.h = 0;
      s.theta = 0.4;
    }
    this.layoutLine();
    if (s) s.x = s.tx;
    setTension(0);
  }

  // ------------------------------------------------------------ geometry

  lineYAt(x: number) {
    const { W, unit } = this;
    const c = (x - W / 2) / (W / 2);
    let y = this.lineY + 10 * unit * (1 - c * c);
    const big = this.model && this.phase !== 'line' && this.phase !== 'choosing' ? 1 : 0.35;
    y += 9 * unit * big * Math.exp(-Math.pow((x - this.pinX) / (W * 0.18), 2));
    y += this.shiver() * Math.sin((Math.PI * x) / W) * 1.0;
    return y;
  }

  shiver() {
    if (this.reducedMotion) return 0;
    const t = this.now - this.shiverT;
    if (t < 0 || t > 0.6) return 0;
    return 2.6 * this.unit * Math.exp(-t / 0.13) * Math.sin(t * 2 * Math.PI * 17);
  }

  pivot() {
    return { x: this.pinX, y: this.lineYAt(this.pinX) };
  }

  toWorld(lx: number, ly: number) {
    const pv = this.pivot();
    const dx = (lx - this.pivL.x) * this.s, dy = (ly - this.pivL.y) * this.s;
    const c = Math.cos(this.theta), sn = Math.sin(this.theta);
    return { x: pv.x + dx * c - dy * sn, y: pv.y + dx * sn + dy * c };
  }

  /** number of fabric cells unravelled (fractional) */
  get cut() {
    return (this.U / this.Ltot) * this.model!.N;
  }

  /** the active stitch: a real remaining fabric cell at the unravel front (image px) */
  anchorLocal(): [number, number] {
    const m = this.model!;
    const k = Math.floor(this.cut);
    if (k >= m.N) return cellPos(m, m.seq[m.N - 1]);
    // average a few upcoming cells along the row, then snap to the nearest of them
    let ax = 0, ay = 0, n = 0;
    const kk = Math.min(m.N - 1, k + 3);
    for (let i = k; i <= kk; i++) {
      const [x, y] = cellPos(m, m.seq[i]);
      ax += x;
      ay += y;
      n++;
    }
    ax /= n;
    ay /= n;
    let best = k, bd = Infinity;
    for (let i = k; i <= kk; i++) {
      const [x, y] = cellPos(m, m.seq[i]);
      const d = (x - ax) ** 2 + (y - ay) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return cellPos(m, m.seq[best]);
  }

  anchor() {
    const [x, y] = this.anchorLocal();
    return this.toWorld(x, y);
  }

  /** yarn colour per px of material, averaged over ~a stitch row's worth of neighbours */
  colTable = new Float32Array(0);

  buildColorTable() {
    const m = this.model!;
    const n = Math.ceil(this.Ltot) + 1;
    const raw = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = m.seq[Math.max(0, Math.min(m.N - 1, Math.floor((i / this.Ltot) * m.N)))];
      raw[i * 3] = m.col[c * 3];
      raw[i * 3 + 1] = m.col[c * 3 + 1];
      raw[i * 3 + 2] = m.col[c * 3 + 2];
    }
    const R = Math.max(2, Math.round(9 * this.unit));
    const out = new Float32Array(n * 3);
    for (let ch = 0; ch < 3; ch++) {
      let acc = 0, cnt = 0;
      for (let i = -R; i < n + R; i++) {
        const a = i + R, b = i - R - 1;
        if (a < n && a >= 0) {
          acc += raw[a * 3 + ch];
          cnt++;
        }
        if (b >= 0 && b < n) {
          acc -= raw[b * 3 + ch];
          cnt--;
        }
        if (i >= 0 && i < n) out[i * 3 + ch] = acc / cnt;
      }
    }
    this.colTable = out;
  }

  colorAt = (mat: number): RGB => {
    const t = this.colTable;
    const n = t.length / 3;
    const i = Math.max(0, Math.min(n - 1, Math.round(mat)));
    return [t[i * 3], t[i * 3 + 1], t[i * 3 + 2]];
  };

  // ------------------------------------------------------------ sock canvas

  composeSock() {
    const m = this.model;
    if (!m || !this.maskData) return;
    const k = Math.min(m.N, Math.floor(this.cut));
    if (k === this.maskK) return;
    const d = this.maskData.data;
    if (this.maskK < 0 || k < this.maskK) {
      for (let c = 0; c < m.gw * m.gh; c++) d[c * 4 + 3] = m.inside[c] && m.order[c] >= k ? 255 : 0;
    } else {
      for (let o = this.maskK; o < k; o++) d[m.seq[o] * 4 + 3] = 0;
    }
    for (let i = 0; i < m.border.length; i++) {
      let v = 0;
      for (let j = m.borderNbStart[i]; j < m.borderNbStart[i + 1]; j++) if (m.order[m.borderNb[j]] >= k) v = 255;
      d[m.border[i] * 4 + 3] = v;
    }
    this.maskK = k;
    this.maskCtx.putImageData(this.maskData, 0, 0);

    const sc = this.sockCtx;
    const S = this.s * this.dpr, pad = this.sockPad;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalCompositeOperation = 'source-over';
    sc.clearRect(0, 0, this.sockCv.width, this.sockCv.height);
    if (k >= m.N) return;
    sc.drawImage(this.photo, 0, 0);
    sc.globalCompositeOperation = 'destination-in';
    sc.imageSmoothingEnabled = true;
    sc.drawImage(this.maskCv, pad * S, pad * S, m.gw * CELL * S, m.gh * CELL * S);
    sc.globalCompositeOperation = 'source-over';
    if (k > 0) {
      sc.setTransform(S, 0, 0, S, pad * S, pad * S);
      this.drawFrontEdge(sc, k);
    }
  }

  /** the row of open live loops along the unravel front, in image px */
  drawFrontEdge(sc: CanvasRenderingContext2D, k: number) {
    const m = this.model!;
    const g = m.gauge;
    const r = m.rowOf[Math.min(m.N - 1, k)];
    const lo = m.rowStart[Math.max(0, r - 1)], hi = m.rowStart[Math.min(m.rows, r + 3)];
    const pts: number[] = [];
    const spacing = g * 0.95;
    const sp2 = spacing * spacing;
    for (let o = Math.max(k, lo); o < hi; o++) {
      const c = m.seq[o];
      const x = c % m.gw, y = (c / m.gw) | 0;
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= m.gw || yy >= m.gh) continue;
        const n = yy * m.gw + xx;
        if (m.inside[n] && m.order[n] < k) edge = true;
      }
      if (!edge) continue;
      const [px, py] = cellPos(m, c);
      let ok = true;
      for (let i = 0; i < pts.length; i += 3) {
        if ((pts[i] - px) ** 2 + (pts[i + 1] - py) ** 2 < sp2) {
          ok = false;
          break;
        }
      }
      if (ok) pts.push(px, py, c);
    }
    const lw = this.yw / this.s;
    const ink = 'rgba(26,15,31,';
    // soft fuzz halo + a hint of the fabric curling at the cut
    for (let i = 0; i < pts.length; i += 3) {
      const [x, y, c] = [pts[i], pts[i + 1], pts[i + 2]];
      const col: RGB = [m.col[c * 3], m.col[c * 3 + 1], m.col[c * 3 + 2]];
      sc.fillStyle = rgb(col, 1, 0.1);
      sc.beginPath();
      sc.arc(x - m.gx[c] * g * 0.5, y - m.gy[c] * g * 0.5, g * 1.25, 0, Math.PI * 2);
      sc.fill();
      sc.fillStyle = ink + '0.07)';
      sc.beginPath();
      sc.arc(x + m.gx[c] * g * 0.7, y + m.gy[c] * g * 0.7, g * 0.9, 0, Math.PI * 2);
      sc.fill();
    }
    // open loops: small U's hanging off the edge towards the unravelled side
    for (let i = 0; i < pts.length; i += 3) {
      const [x, y, c] = [pts[i], pts[i + 1], pts[i + 2]];
      const col: RGB = [m.col[c * 3], m.col[c * 3 + 1], m.col[c * 3 + 2]];
      const nx = -m.gx[c], ny = -m.gy[c];
      const tx = -ny, ty = nx;
      const h = ((c * 2654435761) >>> 0) / 4294967296;
      if (h < 0.08) continue;
      const hw = g * (0.42 + h * 0.16), dep = g * (0.7 + h * 0.55);
      const jit = 1;
      const ax = x - tx * hw, ay = y - ty * hw, bx = x + tx * hw, by = y + ty * hw;
      const loop = (o: number) => {
        sc.beginPath();
        sc.moveTo(ax + nx * o, ay + ny * o);
        sc.bezierCurveTo(
          ax + nx * dep * 1.3 * jit - tx * hw * 0.25, ay + ny * dep * 1.3 * jit - ty * hw * 0.25,
          bx + nx * dep * 1.3 * jit + tx * hw * 0.25, by + ny * dep * 1.3 * jit + ty * hw * 0.25,
          bx + nx * o, by + ny * o,
        );
      };
      sc.lineCap = 'round';
      loop(0);
      sc.strokeStyle = shade(col, 0.72, 0.45);
      sc.lineWidth = lw * 1.0;
      sc.stroke();
      loop(-lw * 0.12);
      sc.strokeStyle = rgb(col, 0.98);
      sc.lineWidth = lw * 0.75;
      sc.stroke();
      loop(-lw * 0.3);
      sc.strokeStyle = rgb(lighten(col, 0.25), 1, 0.55);
      sc.lineWidth = lw * 0.28;
      sc.stroke();
    }
    // a few short loose tails
    for (let i = 0; i < pts.length; i += 3) {
      const c = pts[i + 2];
      const h = ((c * 2246822519) >>> 0) / 4294967296;
      if (h > 0.06) continue;
      const col: RGB = [m.col[c * 3], m.col[c * 3 + 1], m.col[c * 3 + 2]];
      const nx = -m.gx[c] * 0.6, ny = -m.gy[c] * 0.6 + 0.8;
      const nl = Math.hypot(nx, ny);
      const len = g * (2.5 + h * 60);
      const xs: number[] = [], ys: number[] = [];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10;
        const wob = Math.sin(t * 7 + h * 40) * g * 0.35 * t;
        xs.push(pts[i] + (nx / nl) * len * t - (ny / nl) * wob);
        ys.push(pts[i + 1] + (ny / nl) * len * t + (nx / nl) * wob + t * t * g * 0.8);
      }
      strokeYarnPath(sc, xs, ys, col, lw * 0.9, 0.95, 0.12);
    }
  }

  // ------------------------------------------------------------ background

  drawBg() {
    const { W, H, dpr, tableY } = this;
    this.bg.width = Math.round(W * dpr);
    this.bg.height = Math.round(H * dpr);
    const c = this.bg.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wall = c.createLinearGradient(0, 0, 0, tableY);
    wall.addColorStop(0, '#FDF6EF');
    wall.addColorStop(1, '#F8EADF');
    c.fillStyle = wall;
    c.fillRect(0, 0, W, tableY);
    const tab = c.createLinearGradient(0, tableY, 0, H);
    tab.addColorStop(0, '#EEDCCB');
    tab.addColorStop(1, '#E6D0BC');
    c.fillStyle = tab;
    c.fillRect(0, tableY, W, H - tableY);
    // linen weave on the work table
    c.globalAlpha = 0.05;
    c.strokeStyle = '#1A0F1F';
    c.lineWidth = 1;
    for (let y = tableY + 4; y < H; y += 3 + ((y * 7) % 3)) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y + ((y * 13) % 5) - 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    // table edge
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillRect(0, tableY, W, 1.5);
    const sh = c.createLinearGradient(0, tableY - 18, 0, tableY);
    sh.addColorStop(0, 'rgba(26,15,31,0)');
    sh.addColorStop(1, 'rgba(26,15,31,0.06)');
    c.fillStyle = sh;
    c.fillRect(0, tableY - 18, W, 18);
  }

  // ------------------------------------------------------------ input

  bind() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointermove', this.onMove);
    cv.addEventListener('pointerup', this.onUp);
    cv.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
  }
  unbind() {
    const cv = this.canvas;
    cv.removeEventListener('pointerdown', this.onDown);
    cv.removeEventListener('pointermove', this.onMove);
    cv.removeEventListener('pointerup', this.onUp);
    cv.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
  }
  onResize = () => {
    this.resize();
    for (const s of this.socks) s.x = s.tx;
    if (this.model && !this.holding && !this.finished) {
      const A = this.anchor();
      this.rope1.setFromPolyline([A.x, A.x], [A.y, A.y + Math.min(this.L1, this.baseY - A.y)]);
    }
  };

  /** geometry of a small sock hanging on the line */
  smallGeom(s: LineSock) {
    const img = s.img!;
    const sc = s.h / img.naturalHeight;
    const w = img.naturalWidth * sc;
    const drop = 46 * (s.h / REF_SOCK_H);
    return { sc, w, drop, left: -s.cuff.x * w, top: drop - s.cuff.y * s.h };
  }

  sockAt(x: number, y: number) {
    for (let i = this.socks.length - 1; i >= 0; i--) {
      const s = this.socks[i];
      if (!s.img || s.alpha < 0.5) continue;
      const g = this.smallGeom(s);
      const py = this.lineYAt(s.x);
      if (x > s.x + g.left && x < s.x + g.left + g.w && y > py - 6 && y < py + g.top + s.h) return s;
    }
    return null;
  }
  local(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  onDown = (e: PointerEvent) => {
    if (!this.ready) return;
    this.pointerType = e.pointerType;
    const q = this.local(e);
    if (this.phase === 'line') {
      const s = this.sockAt(q.x, q.y);
      if (s) {
        this.drag = { s, off: q.x - s.x, x0: q.x, t0: this.now, moved: 0 };
        this.canvas.setPointerCapture(e.pointerId);
        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
      return;
    }
    if (!this.pulling || this.finished) return;
    this.auto.active = false;
    if (this.tryGrab(q.x, q.y)) {
      this.canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };
  onMove = (e: PointerEvent) => {
    const q = this.local(e);
    if (this.phase === 'line') {
      if (this.drag) {
        this.drag.moved = Math.max(this.drag.moved, Math.abs(q.x - this.drag.x0));
        this.drag.s.x = q.x - this.drag.off;
      } else this.canvas.style.cursor = this.sockAt(q.x, q.y) ? 'grab' : 'default';
      return;
    }
    this.P = q;
    if (!this.pulling) {
      this.canvas.style.cursor = 'default';
      return;
    }
    if (!this.holding && this.ready) {
      const near = this.rope1.nearest(q.x, q.y);
      this.hover = !this.finished && (near.dist < this.grabR() || this.heap.hit(q.x, q.y, 6));
      this.canvas.style.cursor = this.hover ? 'grab' : 'default';
    }
  };
  onUp = () => {
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      d.s.tx = d.s.x;
      if (d.moved < 6 && this.now - d.t0 < 0.6) this.choose(d.s.id);
      this.canvas.style.cursor = 'default';
      return;
    }
    if (this.holding && !this.auto.active) this.release();
    this.canvas.style.cursor = this.hover ? 'grab' : 'default';
  };
  onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
      if (!this.pulling) return;
      e.preventDefault();
      if (e.repeat || this.finished || !this.ready) return;
      this.auto.active = true;
      this.autoStroke();
    }
  };
  onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' && this.auto.active) {
      this.auto.active = false;
      this.auto.phase = 'idle';
      if (this.holding) this.release();
    }
  };
  onBlur = () => {
    this.drag = null;
    this.auto.active = false;
    if (this.holding) this.release();
  };

  grabR() {
    return (this.pointerType === 'touch' ? 40 : 24) * Math.max(0.8, this.unit);
  }

  tryGrab(x: number, y: number) {
    if (this.holding) return false;
    const near = this.rope1.nearest(x, y);
    if (near.dist < this.grabR() && this.L1 > 2) {
      const [[hx, hy], [tx, ty]] = this.rope1.split(near.frac, near.x, near.y);
      hx.push(x);
      hy.push(y);
      tx.unshift(x);
      ty.unshift(y);
      const s = Math.max(4 * this.unit, near.s);
      this.L2 = Math.max(0, this.L1 - s);
      this.L1 = s + Math.hypot(x - near.x, y - near.y);
      this.rope1.setFromPolyline(hx, hy);
      this.rope2.setFromPolyline(tx, ty);
      this.rope2.pinEnd = this.rope1.pinEnd;
      this.rope2.pinStart = true;
      this.end2 = { ...this.end1 };
      this.rope1.pinEnd = true;
    } else if (this.heap.hit(x, y, 10 * this.unit) && this.heap.length > 1) {
      // pick the yarn up off the top of the heap: the top loop is the one tied to the sock
      const [rx, ry] = this.rope1.polyline();
      rx.push(x);
      ry.push(y);
      const extra = Math.hypot(x - this.end1.x, y - this.end1.y);
      this.L1 = Math.min(this.U + this.lead, this.L1 + extra);
      this.L2 = 0;
      this.rope1.setFromPolyline(rx, ry);
      this.rope1.pinEnd = true;
      const t = this.heap.top();
      this.rope2.setFromPolyline([x, t.x], [y, t.y]);
      this.rope2.pinStart = true;
      this.rope2.pinEnd = true;
      this.end2 = { x: t.x, y: t.y };
    } else return false;
    this.holding = true;
    this.P = { x, y };
    this.Hd = { x, y };
    if (this.laborStart < 0) this.laborStart = this.now;
    this.canvas.style.cursor = 'grabbing';
    return true;
  }

  release() {
    if (!this.holding) return;
    this.holding = false;
    const [ax, ay] = this.rope1.polyline();
    const [bx, by] = this.rope2.polyline();
    this.L1 = this.L1 + this.L2;
    this.L2 = 0;
    this.rope1.setFromPolyline(ax.concat(bx.slice(1)), ay.concat(by.slice(1)));
    this.rope1.pinEnd = this.rope2.pinEnd;
    this.end1 = { ...this.end2 };
  }

  /** hold Space: a virtual hand pulls hand-over-hand */
  autoStroke() {
    if (this.finished) return;
    const r = this.rope1;
    // grab near the sock
    const f = Math.min(0.5, (26 * this.unit) / Math.max(1, this.L1));
    const k = Math.min(r.n - 1, Math.max(1, Math.round(f * (r.n - 1))));
    const gx = r.x[k], gy = r.y[k];
    this.pointerType = 'mouse';
    if (!this.tryGrab(gx, gy)) {
      this.auto.active = false;
      return;
    }
    const A = this.anchor();
    let dx = gx - A.x, dy = gy - A.y;
    const l = Math.hypot(dx, dy) || 1;
    dx = (dx / l) * 0.4 + 0.45;
    dy = (dy / l) * 0.4 + 0.8;
    const l2 = Math.hypot(dx, dy);
    this.auto.dx = dx / l2;
    this.auto.dy = dy / l2;
    this.auto.dist = 0;
    this.auto.phase = 'pull';
  }

  // ------------------------------------------------------------ simulation

  pop(over: number) {
    const cuffF = smoothstep(0.8, 0.97, this.p);
    const base = 19 * this.unit * (1 - 0.3 * cuffF);
    this.pendingPay += base * (0.75 + Math.random() * 0.5) + Math.max(0, over - this.Fs() * 2);
    this.lastPop = this.now;
    this.shiverT = this.now;
    this.pops++;
    const t = performance.now();
    if (t - this.lastVibe > 45) {
      this.lastVibe = t;
      try {
        navigator.vibrate?.(7);
      } catch {
        /* not supported */
      }
    }
    tick(0.7 + Math.random() * 0.4);
  }

  Fs() {
    // the ribbed cuff holds a little harder
    return 9 * this.unit * tune.stiffness * (1 + 0.6 * smoothstep(0.78, 0.97, this.p));
  }

  finish() {
    this.onEvent('finished');
    this.finished = true;
    this.laborEnd = this.now;
    if (this.holding) this.release();
    this.auto.active = false;
    this.rope1.pinStart = false;
    this.composeSock();
  }

  collide = (r: Rope, i: number) => {
    const h = this.heap;
    const x = r.x[i];
    let lim = this.baseY + 1.5 * this.unit;
    if (Math.abs(x - h.cx) < h.width / 2) lim = Math.min(lim, h.surfaceY(x) + this.yw * 0.3);
    if (r.y[i] > lim) {
      r.y[i] = lim;
      r.px[i] = x - (x - r.px[i]) * 0.4;
    }
  };

  /** the small socks: slide to their slots, swing, and refuse to touch ("never a pair") */
  stepLine(dt: number) {
    let paired = false;
    for (const s of this.socks) {
      if (!s.img) continue;
      if (s.id === this.def.id && this.phase !== 'line') continue;
      const before = s.x;
      if (this.drag?.s !== s) s.x += (s.tx - s.x) * Math.min(1, dt * (this.phase === 'line' ? 9 : 4));
      if (s.h === 0) s.h = s.th;
      s.h += (s.th - s.h) * Math.min(1, dt * 5);
      s.alpha += (s.ta - s.alpha) * Math.min(1, dt * 4);
      const v = (s.x - before) / Math.max(dt, 1e-4);
      const a = (v - s.v) / Math.max(dt, 1e-4);
      s.v = v;
      if (this.reducedMotion) {
        s.theta = s.omega = 0;
      } else {
        const acc = -18 * Math.sin(s.theta) - 2.2 * s.omega - Math.max(-4000, Math.min(4000, a)) * 0.0011;
        s.omega += acc * dt;
        s.theta = Math.max(-0.6, Math.min(0.6, s.theta + s.omega * dt));
      }
    }
    if (this.phase !== 'line') return;
    // keep them apart; the dragged sock is heavy but not immovable (it stops at the walls)
    const live = this.socks.filter((s) => s.img).sort((a, b) => a.x - b.x);
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < live.length - 1; i++) {
        const a = live[i], b = live[i + 1];
        const ga = this.smallGeom(a), gb = this.smallGeom(b);
        const min = (ga.w + gb.w) * 0.47;
        const gap = b.x - a.x;
        if (gap >= min) continue;
        const d = min - gap;
        const wa = this.drag?.s === a ? 0.08 : 1, wb = this.drag?.s === b ? 0.08 : 1;
        a.x -= (d * wa) / (wa + wb);
        b.x += (d * wb) / (wa + wb);
        if (this.drag && (this.drag.s === a || this.drag.s === b)) paired = true;
      }
      for (const s of live) {
        const g = this.smallGeom(s);
        s.x = Math.max(this.lineLeft - g.left, Math.min(this.lineRight - g.left - g.w, s.x));
      }
    }
    for (const s of live) if (this.drag?.s !== s) s.tx = s.x;
    if (paired) this.onEvent('pair');
  }

  step(dt: number) {
    this.stepLine(dt);
    if (this.phase === 'choosing' && this.model && this.now - this.choose0.t >= CHOOSE_T) {
      this.phase = 'badge';
      this.onEvent('ready');
    }
    if (!this.model || this.phase === 'line' || this.phase === 'choosing') return;
    const now = this.now;
    const u = this.unit;
    const flow = 1300 * u * dt;

    // virtual hand
    if (this.auto.active) {
      if (this.auto.phase === 'pull' && this.holding) {
        const v = 400 * u * dt;
        this.P = {
          x: Math.min(this.W - 8, Math.max(8, this.P.x + this.auto.dx * v)),
          y: Math.min(this.H - 8, Math.max(8, this.P.y + this.auto.dy * v)),
        };
        this.auto.dist += v;
        if (this.auto.dist > 330 * u || this.P.y >= this.H - 9) {
          this.release();
          this.auto.phase = 'gap';
          this.auto.t = 0;
        }
      } else if (this.auto.phase === 'gap') {
        this.auto.t += dt;
        if (this.auto.t > 0.2) this.autoStroke();
      }
    }

    let A = this.anchor();
    const pv = this.pivot();
    let torque = 0;
    this.tension = 0;
    if (this.holding && !this.finished && this.pulling) {
      const dx = this.P.x - A.x, dy = this.P.y - A.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const stretch = d - this.L1;
      const Fs = this.Fs();
      if (stretch > Fs && now - this.lastPop > 0.03 && this.pendingPay < 4 * u) this.pop(stretch);
      const T = Math.max(0, Math.min(stretch, Fs * 2.5));
      this.tension = T / Fs;
      // the hand lags a little under load, so the thread visibly goes taut
      const lag = Math.min(T * 0.45, 12 * u);
      this.Hd = { x: this.P.x - ux * lag, y: this.P.y - uy * lag };
      if (stretch < 0) {
        const maxL1 = d * 1.12 + 26 * u;
        if (this.L1 > maxL1) {
          this.L2 += this.L1 - maxL1;
          this.L1 = maxL1;
        }
      }
      const rx = A.x - pv.x, ry = A.y - pv.y;
      torque = rx * uy * T - ry * ux * T;
    }

    // payout from popped stitches
    if (this.pendingPay > 0 && !this.finished) {
      const st = Math.min(this.pendingPay, 1500 * u * dt);
      this.pendingPay -= st;
      const add = Math.min(st, this.Ltot - this.U);
      this.U += add;
      this.L1 += add;
      this.sockDirty = true;
      if (this.U >= this.Ltot - 1e-6) this.finish();
      A = this.anchor();
    }

    // pendulum on the clothespin
    if (this.reducedMotion) {
      this.theta = 0;
      this.omega = 0;
    } else {
      const K = 16, C = 2.4;
      const kI = (K * 0.24) / (this.sockH * this.Fs());
      const alpha = -K * Math.sin(this.theta) - C * this.omega + torque * kI;
      this.omega += alpha * dt;
      this.theta += this.omega * dt;
      this.theta = Math.max(-0.7, Math.min(0.7, this.theta));
    }
    A = this.anchor();

    // where the air yarn may go
    const top = this.heap.top();
    const total = this.U + this.lead;
    if (!this.holding) {
      const target = this.finished ? 0 : Math.hypot(A.x - top.x, A.y - top.y) * 1.06 + 22 * u;
      if (total >= target || this.heap.length > 0 || this.finished) {
        this.rope1.pinEnd = true;
        if (this.L1 > target) this.L1 = Math.max(target, this.L1 - flow);
        else this.L1 = Math.min(target, total, this.L1 + flow);
        this.end1.x += (top.x - this.end1.x) * Math.min(1, dt * 10);
        this.end1.y += (top.y - this.end1.y) * Math.min(1, dt * 10);
      } else {
        this.rope1.pinEnd = false;
        this.L1 = total;
      }
      this.heap.setLength(total - this.L1, now);
    } else {
      const avail = total - this.L1;
      const target = Math.hypot(this.Hd.x - top.x, this.Hd.y - top.y) * 1.04 + 18 * u;
      if (avail >= target || this.heap.length > 0) {
        this.rope2.pinEnd = true;
        if (this.L2 > target) this.L2 = Math.max(target, this.L2 - flow);
        else this.L2 = Math.min(target, avail, this.L2 + flow * 2);
        this.end2.x += (top.x - this.end2.x) * Math.min(1, dt * 10);
        this.end2.y += (top.y - this.end2.y) * Math.min(1, dt * 10);
      } else {
        this.rope2.pinEnd = false;
        this.L2 = avail;
      }
      this.heap.setLength(total - this.L1 - this.L2, now);
    }

    // ropes
    const g = 1700 * u;
    this.rope1.len = Math.max(0.01, this.L1);
    if (this.holding) {
      this.rope1.step(dt, g, A.x, A.y, this.Hd.x, this.Hd.y, this.collide);
      this.rope2.len = Math.max(0.01, this.L2);
      this.rope2.step(dt, g, this.Hd.x, this.Hd.y, this.end2.x, this.end2.y, this.collide);
    } else {
      this.rope1.step(dt, g, A.x, A.y, this.end1.x, this.end1.y, this.collide);
    }
  }

  frame = (t: number) => {
    if (this.disposed) return;
    const dt = Math.min(1 / 30, (t - this.last) / 1000);
    this.last = t;
    const sub = 2;
    for (let i = 0; i < sub; i++) {
      this.now += dt / sub;
      this.step(dt / sub);
    }
    this.heap.update(this.now);
    setTension(this.pulling && this.holding ? this.tension : 0);
    this.render();
    const labor = this.laborStart < 0 ? 0 : (this.laborEnd >= 0 ? this.laborEnd : this.now) - this.laborStart;
    this.onFrame({
      phase: this.phase,
      sockId: this.def.id,
      p: this.p,
      price: priceFor(this.p),
      laborMs: labor * 1000,
      started: this.laborStart >= 0,
      finished: this.finished,
      holding: this.holding,
      shiver: this.shiver(),
      lineY: this.lineY,
    });
    this.raf = requestAnimationFrame(this.frame);
  };

  // ------------------------------------------------------------ render

  render() {
    if (this.sockDirty) {
      this.sockDirty = false;
      this.composeSock();
    }
    const { ctx, dpr, W, unit: u } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const now = this.now;
    const big = !!this.model && this.phase !== 'line' && this.phase !== 'choosing';

    if (big) this.heap.draw(ctx, now);

    // clothesline
    ctx.beginPath();
    for (let x = -4; x <= W + 4; x += 12) {
      const y = this.lineYAt(x);
      if (x === -4) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(26,15,31,0.12)';
    ctx.lineWidth = 3.2;
    ctx.save();
    ctx.translate(0, 2.5);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#CDB8A3';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // the other socks, small, on the line
    for (const s of this.socks) {
      if (!s.img || s.alpha < 0.01) continue;
      if (s.id === this.def.id && this.phase !== 'line') continue;
      this.drawSmall(ctx, s, s.x, s.h, s.theta, s.alpha, 1);
    }

    const pv = this.pivot();
    if (!big) {
      // the big clothespin waits, empty, in the middle of the line
      ctx.save();
      ctx.translate(pv.x, pv.y);
      ctx.globalAlpha = 0.95;
      this.drawPin(ctx, u, this.pinDrop * 0.55);
      ctx.restore();
    }
    if (this.phase === 'choosing') {
      const s = this.socks.find((x) => x.id === this.def.id);
      if (s?.img) {
        const t = ease(Math.min(1, (now - this.choose0.t) / CHOOSE_T));
        const x = this.choose0.x + (this.pinX - this.choose0.x) * t;
        const h = this.choose0.h + (this.sockH - this.choose0.h) * t;
        this.drawSmall(ctx, s, x, h, this.choose0.theta * (1 - t), 1, 1 - t, true);
      }
    }
    if (!big) return;

    // sock + pin share the pendulum transform
    ctx.save();
    ctx.translate(pv.x, pv.y);
    ctx.rotate(this.theta);
    const pad = this.sockPad;
    if (!this.finished) {
      ctx.drawImage(
        this.sockCv,
        (-this.pivL.x - pad) * this.s,
        (-this.pivL.y - pad) * this.s,
        this.sockCv.width / dpr,
        this.sockCv.height / dpr,
      );
    }
    this.drawPin(ctx, u);
    ctx.restore();

    // thread
    const st = (slack: number) => ({ w: this.yw, lambda: this.lambda, slack, colorAt: this.colorAt });
    const slackOf = (r: Rope) => {
      const ch = r.chord();
      return smoothstep(0, 0.07, (r.len - ch) / Math.max(1, r.len));
    };
    if (this.L1 > 0.5) {
      const s1 = this.holding ? slackOf(this.rope1) * (1 - Math.min(1, this.tension)) : 1;
      drawYarn(ctx, this.rope1.x, this.rope1.y, this.rope1.n, this.U, st(s1), { start: 3, end: 3 });
    }
    if (this.holding && this.L2 > 0.5) {
      drawYarn(ctx, this.rope2.x, this.rope2.y, this.rope2.n, this.U - this.L1, st(1), { start: 3, end: 3 });
    }

    // hand
    if (this.holding) {
      const { x, y } = this.Hd;
      ctx.beginPath();
      ctx.arc(x, y, 13 * Math.max(0.8, u), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,169,188,0.22)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(31,91,58,0.55)';
      ctx.stroke();
    }

    // first-time hint
    if (this.laborStart < 0 && this.pulling) {
      const e = { x: this.rope1.x[this.rope1.n - 1], y: this.rope1.y[this.rope1.n - 1] };
      const a = 0.65 + 0.35 * Math.sin(now * 3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#1F5B3A';
      ctx.font = `800 ${Math.round(13 * Math.max(0.85, u))}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('pull the loose thread', e.x - 18 * u, e.y + 6 * u);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 9 * u + 3 * Math.sin(now * 3), 0, Math.PI * 2);
      ctx.strokeStyle = '#1F5B3A';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  /** a small sock hanging from its own clothespin */
  drawSmall(ctx: CanvasRenderingContext2D, s: LineSock, x: number, h: number, theta: number, alpha: number, pinA: number, raw = false) {
    const img = s.img!;
    const w = (img.naturalWidth / img.naturalHeight) * h;
    const drop = 46 * (h / REF_SOCK_H);
    let src: CanvasImageSource = img;
    if (!raw) {
      // a cached copy at display size downsamples cleanly (no shimmer)
      if (!s.cache || Math.abs((s.cacheH ?? 0) - h) > h * 0.04) {
        s.cache = mk(w * this.dpr, h * this.dpr);
        const c = s.cache.getContext('2d')!;
        c.imageSmoothingQuality = 'high';
        c.drawImage(img, 0, 0, s.cache.width, s.cache.height);
        s.cacheH = h;
      }
      src = s.cache;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, this.lineYAt(x));
    ctx.rotate(theta);
    ctx.drawImage(src, -s.cuff.x * w, drop - s.cuff.y * h, w, h);
    if (pinA > 0.01) {
      ctx.globalAlpha = alpha * pinA;
      this.drawPin(ctx, h / REF_SOCK_H, drop);
    }
    ctx.restore();
  }

  drawPin(ctx: CanvasRenderingContext2D, u: number, drop = this.pinDrop) {
    // a wooden clothespin, clipped over the line, its jaws biting the cuff
    const w = 15 * u, h = drop + 24 * u;
    const top = -10 * u;
    ctx.save();
    ctx.fillStyle = 'rgba(26,15,31,0.12)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2 * u, top + 3 * u, w, h, 3 * u);
    ctx.fill();
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -w / 2 : 0.5 * u;
      const g = ctx.createLinearGradient(x0, 0, x0 + w / 2, 0);
      g.addColorStop(0, '#E6C7A1');
      g.addColorStop(1, '#C99E72');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x0, top, w / 2 - 0.5 * u, h, [3 * u, 3 * u, 2 * u, 2 * u]);
      ctx.fill();
      ctx.fillStyle = 'rgba(122,82,48,0.35)';
      ctx.fillRect(x0 + 1.2 * u, top + h * 0.18, w / 2 - 3 * u, 1 * u);
    }
    // notch for the line
    ctx.fillStyle = '#A97E55';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4 * u, 0, Math.PI * 2);
    ctx.fill();
    // spring
    ctx.strokeStyle = '#8E9399';
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath();
    ctx.ellipse(0, top + h * 0.42, w * 0.62, 3.2 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.6 * u;
    ctx.beginPath();
    ctx.ellipse(0, top + h * 0.42 - 0.8 * u, w * 0.58, 2.4 * u, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------ snapshots for the receipt & certificate

  /** line drawing: the original silhouette faint, what is left of the sock in ink. maxW/maxH in CSS px, drawn at 2× */
  outlineImage(maxW: number, maxH: number, ghostOnly = false) {
    const m = this.model!;
    const sc = Math.min(maxW / m.w, maxH / m.h) * 2;
    const w = m.w * sc, h = m.h * sc;
    const full = mk(w, h);
    full.getContext('2d')!.drawImage(m.img, 0, 0, w, h);
    const rem = mk(w, h);
    const rc = rem.getContext('2d')!;
    if (!this.finished) {
      rc.drawImage(m.img, 0, 0, w, h);
      rc.globalCompositeOperation = 'destination-in';
      rc.drawImage(this.maskCv, 0, 0, m.gw * CELL * sc, m.gh * CELL * sc);
    }
    const out = mk(w, h);
    const o = out.getContext('2d')!;
    o.globalAlpha = ghostOnly ? 0.35 : 0.28;
    o.drawImage(outline(full, '#1A0F1F', 1.6), 0, 0);
    o.globalAlpha = 1;
    if (ghostOnly) return out;
    const tint = mk(w, h), t = tint.getContext('2d')!;
    t.drawImage(rem, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = 'rgba(26,15,31,0.08)';
    t.fillRect(0, 0, w, h);
    o.drawImage(tint, 0, 0);
    o.drawImage(outline(rem, '#1A0F1F', 2.4), 0, 0);
    return out;
  }

  /** the remaining sock exactly as rendered (photo + live loops), and the heap, at device pixels */
  artwork() {
    const sock = mk(this.sockCv.width, this.sockCv.height);
    if (!this.finished) sock.getContext('2d')!.drawImage(this.sockCv, 0, 0);
    const heap = mk(this.heap.canvas.width, this.heap.canvas.height);
    heap.getContext('2d')!.drawImage(this.heap.canvas, 0, 0);
    return {
      sock,
      heap,
      dpr: this.dpr,
      s: this.s,
      pad: this.sockPad,
      heapBox: { ox: this.heap.ox, oy: this.heap.oy, cx: this.heap.cx, base: this.heap.base, w: this.heap.width, h: this.heap.height },
      sockBox: { w: this.model!.w * this.s, h: this.model!.h * this.s },
    };
  }

  // ------------------------------------------------------------ debug / test hooks

  debug() {
    const m = this.model!;
    const k = Math.floor(this.cut);
    const [lx, ly] = this.anchorLocal();
    const cx = Math.floor(lx / CELL), cy = Math.floor(ly / CELL);
    const c = cy * m.gw + cx;
    const A = this.anchor();
    let maxSeg = 0;
    for (let i = 0; i < this.rope1.n - 1; i++)
      maxSeg = Math.max(maxSeg, Math.hypot(this.rope1.x[i + 1] - this.rope1.x[i], this.rope1.y[i + 1] - this.rope1.y[i]));
    return {
      p: this.p,
      U: this.U,
      Ltot: this.Ltot,
      L1: this.L1,
      L2: this.L2,
      heapLen: this.heap.length,
      heapW: this.heap.width,
      heapH: this.heap.height,
      heapArea: this.heap.length * this.heap.areaPerLen,
      sockArea: m.area * this.s * this.s,
      remainingArea: Math.max(0, m.N - k) * CELL * CELL * this.s * this.s,
      anchorOnFabric: this.finished || (m.inside[c] === 1 && m.order[c] >= k),
      ropeAttached: this.finished || Math.hypot(this.rope1.x[0] - A.x, this.rope1.y[0] - A.y) < 0.75,
      anchor: A,
      grabPoint: { x: this.rope1.x[Math.min(this.rope1.n - 1, 6)], y: this.rope1.y[Math.min(this.rope1.n - 1, 6)] },
      end: { x: this.rope1.x[this.rope1.n - 1], y: this.rope1.y[this.rope1.n - 1] },
      heapTop: this.heap.top(),
      holding: this.holding,
      finished: this.finished,
      pops: this.pops,
      maxSeg,
      yw: this.yw,
      theta: this.theta,
    };
  }

  /** test hook: jump straight to a progress value */
  setProgress(p: number) {
    if (!this.model) return;
    if (this.phase === 'badge') this.phase = 'pull';
    if (this.holding) this.release();
    const target = Math.min(1, Math.max(0, p)) * this.Ltot;
    if (target < this.U) {
      this.reset();
    }
    const add = target - this.U;
    this.U = target;
    this.L1 += add;
    if (this.laborStart < 0) this.laborStart = this.now;
    this.composeSock();
    if (this.U >= this.Ltot) this.finish();
  }
}
