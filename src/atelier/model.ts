// The knit model of one sock photo.
//
// The cutout's alpha mask is downsampled to a grid of CELL px cells. A geodesic
// distance field is grown from the toe hole *inside* the mask (Dijkstra), so it
// follows the foot round the heel and then climbs the leg. Iso-bands of that
// field are the knit rows. Within a row, cells are ordered along the row and the
// direction alternates per row, so the active stitch shuttles back and forth.
// The concatenation of all rows is the unravel order: cell `seq[k]` is the k-th
// cell to disappear.

import { GAUGE_IMG } from './tuning';

export const CELL = 4;

export interface ModelData {
  w: number;
  h: number;
  gw: number;
  gh: number;
  inside: Uint8Array;
  /** cell -> unravel order (−1 outside) */
  order: Int32Array;
  /** unravel order -> cell */
  seq: Int32Array;
  /** number of fabric cells */
  N: number;
  /** order index where each row starts; length rows + 1 */
  rowStart: Int32Array;
  rows: number;
  /** order index -> row */
  rowOf: Int32Array;
  /** averaged photo colour per cell (rgb 0–255) */
  col: Float32Array;
  /** unit gradient of the distance field (points away from the hole, towards remaining fabric) */
  gx: Float32Array;
  gy: Float32Array;
  /** outside cells that touch fabric, with the fabric cells they touch (for mask dilation):
   * neighbours of border[i] are borderNb[borderNbStart[i] .. borderNbStart[i + 1]) */
  border: Int32Array;
  borderNbStart: Int32Array;
  borderNb: Int32Array;
  /** cuff top centre (image px) */
  cuff: { x: number; y: number };
  /** lowest fabric row (image px): the toe's underside */
  bottom: number;
  hole: { x: number; y: number };
  /** fabric area in image px² */
  area: number;
  gauge: number;
}

export interface SockModel extends ModelData {
  img: HTMLImageElement;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

class MinHeap {
  k: number[] = [];
  v: number[] = [];
  get size() {
    return this.k.length;
  }
  push(key: number, val: number) {
    const { k, v } = this;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  pop(): [number, number] {
    const { k, v } = this;
    const rk = k[0], rv = v[0];
    const lk = k.pop()!, lv = v.pop()!;
    const n = k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && k[r] < k[l] ? r : l;
        if (k[c] >= lk) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lk;
      v[i] = lv;
    }
    return [rk, rv];
  }
}

export function imagePixels(img: HTMLImageElement) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0);
  return cx.getImageData(0, 0, w, h).data;
}

export function buildModel(img: HTMLImageElement, holeN: { x: number; y: number }, rowHImg: number): SockModel {
  const data = computeModel(imagePixels(img), img.naturalWidth, img.naturalHeight, holeN, rowHImg);
  return { ...data, img };
}

/** pure: runs on the main thread or in the model worker */
export function computeModel(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  holeN: { x: number; y: number },
  rowHImg: number,
): ModelData {

  const gw = Math.ceil(w / CELL), gh = Math.ceil(h / CELL), G = gw * gh;
  const inside = new Uint8Array(G);
  const raw = new Float32Array(G * 3);
  for (let cy = 0; cy < gh; cy++) {
    for (let cxi = 0; cxi < gw; cxi++) {
      let n = 0, r = 0, g = 0, b = 0;
      for (let y = cy * CELL; y < Math.min(h, cy * CELL + CELL); y++) {
        for (let x = cxi * CELL; x < Math.min(w, cxi * CELL + CELL); x++) {
          const i = (y * w + x) * 4;
          if (px[i + 3] > 128) {
            n++;
            r += px[i];
            g += px[i + 1];
            b += px[i + 2];
          }
        }
      }
      const c = cy * gw + cxi;
      if (n >= CELL * CELL * 0.5) inside[c] = 1;
      if (n) {
        raw[c * 3] = r / n;
        raw[c * 3 + 1] = g / n;
        raw[c * 3 + 2] = b / n;
      }
    }
  }

  // geodesic distance from the hole (cell units)
  const hole = { x: holeN.x * w, y: holeN.y * h };
  const D = new Float64Array(G).fill(Infinity);
  const heap = new MinHeap();
  const hrx = 40 / CELL, hry = 18 / CELL;
  const hcx = hole.x / CELL - 0.5, hcy = hole.y / CELL - 0.5;
  for (let c = 0; c < G; c++) {
    if (!inside[c]) continue;
    const x = c % gw, y = (c / gw) | 0;
    const ex = (x - hcx) / hrx, ey = (y - hcy) / hry;
    if (ex * ex + ey * ey <= 1) {
      D[c] = 0;
      heap.push(0, c);
    }
  }
  const NB = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];
  while (heap.size) {
    const [d, c] = heap.pop();
    if (d > D[c]) continue;
    const x = c % gw, y = (c / gw) | 0;
    for (const [dx, dy, wt] of NB) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const n = ny * gw + nx;
      if (!inside[n]) continue;
      const nd = d + wt;
      if (nd < D[n]) {
        D[n] = nd;
        heap.push(nd, n);
      }
    }
  }
  for (let c = 0; c < G; c++) if (inside[c] && !isFinite(D[c])) inside[c] = 0;

  // Knit rows run *across* the tube. The geodesic alone lets the front race up
  // the front of the ankle and leaves the heel hanging as a flap, so the row
  // field is a harmonic function (0 at the hole, 1 at the cuff opening, no flux
  // through the silhouette), seeded with the geodesic. Its iso-lines meet the
  // walls at right angles, like rows round a bent tube. It is then
  // re-parametrised by arc length so every row has the same physical height.
  {
    let top = gh;
    for (let c = 0; c < G; c++) if (inside[c]) top = Math.min(top, (c / gw) | 0);
    let maxG = 0;
    for (let c = 0; c < G; c++) if (inside[c] && D[c] > maxG) maxG = D[c];
    const phi = new Float64Array(G);
    const fixed = new Uint8Array(G);
    const cells: number[] = [];
    for (let c = 0; c < G; c++) {
      if (!inside[c]) continue;
      phi[c] = D[c] / maxG;
      if (D[c] === 0) fixed[c] = 1;
      else if (((c / gw) | 0) <= top + 1) {
        fixed[c] = 1;
        phi[c] = 1;
      } else cells.push(c);
    }
    const nb = new Int32Array(cells.length * 4).fill(-1);
    cells.forEach((c, i) => {
      const x = c % gw, y = (c / gw) | 0;
      const cand = [x > 0 ? c - 1 : -1, x < gw - 1 ? c + 1 : -1, y > 0 ? c - gw : -1, y < gh - 1 ? c + gw : -1];
      for (let j = 0; j < 4; j++) if (cand[j] >= 0 && inside[cand[j]]) nb[i * 4 + j] = cand[j];
    });
    const omega = 1.92;
    for (let it = 0; it < 900; it++) {
      for (let i = 0; i < cells.length; i++) {
        let s = 0, n = 0;
        for (let j = 0; j < 4; j++) {
          const q = nb[i * 4 + j];
          if (q >= 0) {
            s += phi[q];
            n++;
          }
        }
        if (n) {
          const c = cells[i];
          phi[c] += omega * (s / n - phi[c]);
        }
      }
    }
    // arc length along the field: s(φ) = ∫ dφ / mean|∇φ| over each iso-band
    const B = 600;
    const gsum = new Float64Array(B), gcnt = new Float64Array(B);
    const bin = (v: number) => Math.min(B - 1, Math.max(0, Math.floor(v * B)));
    for (let c = 0; c < G; c++) {
      if (!inside[c]) continue;
      const x = c % gw, y = (c / gw) | 0;
      const at = (xx: number, yy: number) => {
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) return phi[c];
        const n = yy * gw + xx;
        return inside[n] ? phi[n] : phi[c];
      };
      const g = Math.hypot(at(x + 1, y) - at(x - 1, y), at(x, y + 1) - at(x, y - 1)) / 2;
      if (g > 0) {
        gsum[bin(phi[c])] += g;
        gcnt[bin(phi[c])]++;
      }
    }
    const sOf = new Float64Array(B + 1);
    let lastG = 1 / maxG;
    for (let b = 0; b < B; b++) {
      const g = gcnt[b] ? gsum[b] / gcnt[b] : lastG;
      lastG = g;
      sOf[b + 1] = sOf[b] + 1 / B / Math.max(g, 1e-6);
    }
    for (let c = 0; c < G; c++) {
      if (!inside[c]) continue;
      const f = Math.min(1, Math.max(0, phi[c])) * B;
      const b = Math.min(B - 1, Math.floor(f));
      D[c] = sOf[b] + (sOf[b + 1] - sOf[b]) * (f - b);
    }
  }

  // gradient of D, smoothed
  let gx = new Float32Array(G), gy = new Float32Array(G);
  for (let c = 0; c < G; c++) {
    if (!inside[c]) continue;
    const x = c % gw, y = (c / gw) | 0;
    const at = (xx: number, yy: number) => {
      if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) return D[c];
      const n = yy * gw + xx;
      return inside[n] ? D[n] : D[c];
    };
    gx[c] = at(x + 1, y) - at(x - 1, y);
    gy[c] = at(x, y + 1) - at(x, y - 1);
  }
  for (let pass = 0; pass < 3; pass++) {
    const nx = new Float32Array(G), ny = new Float32Array(G);
    for (let c = 0; c < G; c++) {
      if (!inside[c]) continue;
      const x = c % gw, y = (c / gw) | 0;
      let sx = 0, sy = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
          const n = yy * gw + xx;
          if (!inside[n]) continue;
          sx += gx[n];
          sy += gy[n];
        }
      }
      nx[c] = sx;
      ny[c] = sy;
    }
    gx = nx;
    gy = ny;
  }
  for (let c = 0; c < G; c++) {
    const l = Math.hypot(gx[c], gy[c]) || 1;
    gx[c] /= l;
    gy[c] /= l;
  }

  // rows
  const rowH = rowHImg / CELL;
  let maxD = 0;
  for (let c = 0; c < G; c++) if (inside[c] && D[c] > maxD) maxD = D[c];
  const rows = Math.floor(maxD / rowH) + 1;
  const rowCells: number[][] = Array.from({ length: rows }, () => []);
  for (let c = 0; c < G; c++) if (inside[c]) rowCells[Math.floor(D[c] / rowH)].push(c);

  const N = rowCells.reduce((a, r) => a + r.length, 0);
  const seq = new Int32Array(N);
  const order = new Int32Array(G).fill(-1);
  const rowStart = new Int32Array(rows + 1);
  const rowOf = new Int32Array(N);
  let k = 0;
  let prevTx = 0, prevTy = 0;
  for (let r = 0; r < rows; r++) {
    rowStart[r] = k;
    const cells = rowCells[r];
    if (!cells.length) continue;
    let mx = 0, my = 0;
    for (const c of cells) {
      mx += gx[c];
      my += gy[c];
    }
    // row tangent = perpendicular of the mean gradient; keep its sign consistent row to row
    let tx = -my, ty = mx;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    if (tx * prevTx + ty * prevTy < 0) {
      tx = -tx;
      ty = -ty;
    }
    prevTx = tx;
    prevTy = ty;
    const dir = r % 2 ? -1 : 1;
    const key = (c: number) => dir * ((c % gw) * tx + ((c / gw) | 0) * ty);
    cells.sort((a, b) => key(a) - key(b));
    for (const c of cells) {
      order[c] = k;
      rowOf[k] = r;
      seq[k++] = c;
    }
  }
  rowStart[rows] = k;

  // colour averaged over a ~5×5 cell neighbourhood (≈ 3–4 stitches) of fabric
  const col = new Float32Array(G * 3);
  for (let c = 0; c < G; c++) {
    if (!inside[c]) continue;
    const x = c % gw, y = (c / gw) | 0;
    let n = 0, r = 0, g = 0, b = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        const nn = yy * gw + xx;
        if (!inside[nn]) continue;
        n++;
        r += raw[nn * 3];
        g += raw[nn * 3 + 1];
        b += raw[nn * 3 + 2];
      }
    }
    col[c * 3] = r / n;
    col[c * 3 + 1] = g / n;
    col[c * 3 + 2] = b / n;
  }

  // cuff top centre
  let top = gh;
  for (let c = 0; c < G; c++) if (inside[c]) top = Math.min(top, (c / gw) | 0);
  let sx = 0, sn = 0;
  for (let y = top; y < top + 4; y++) {
    for (let x = 0; x < gw; x++) {
      if (inside[y * gw + x]) {
        sx += x;
        sn++;
      }
    }
  }
  const cuff = { x: (sx / sn + 0.5) * CELL, y: top * CELL };
  let bot = 0;
  for (let c = 0; c < G; c++) if (inside[c]) bot = Math.max(bot, (c / gw) | 0);

  // outside cells bordering fabric
  const border: number[] = [];
  const borderNb: number[] = [];
  const borderNbStart: number[] = [0];
  for (let c = 0; c < G; c++) {
    if (inside[c]) continue;
    const x = c % gw, y = (c / gw) | 0;
    const nb: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        const n = yy * gw + xx;
        if (inside[n]) nb.push(n);
      }
    }
    if (nb.length) {
      border.push(c);
      borderNb.push(...nb);
      borderNbStart.push(borderNb.length);
    }
  }

  return {
    w, h, gw, gh, inside, order, seq, N, rowStart, rows, rowOf, col, gx, gy,
    border: Int32Array.from(border), borderNbStart: Int32Array.from(borderNbStart), borderNb: Int32Array.from(borderNb),
    cuff, bottom: (bot + 1) * CELL, hole, area: N * CELL * CELL, gauge: GAUGE_IMG,
  };
}

/** cell centre in image px */
export function cellPos(m: SockModel, c: number): [number, number] {
  return [((c % m.gw) + 0.5) * CELL, (((c / m.gw) | 0) + 0.5) * CELL];
}

/** typed-array buffers of a model, for transferring out of the worker */
export function modelBuffers(m: ModelData): ArrayBuffer[] {
  return [m.inside, m.order, m.seq, m.rowStart, m.rowOf, m.col, m.gx, m.gy, m.border, m.borderNbStart, m.borderNb].map(
    (a) => a.buffer as ArrayBuffer,
  );
}
