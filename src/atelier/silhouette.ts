// Re-render a finished piece from {sock, hole %} with the same knit model and unravel order the
// Atelier uses — so the Archive stores numbers, never images.

import { type SockModel, CELL } from './model';

function mk(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** cells still knitted at this hole %, as an alpha mask (grid resolution) */
function maskAt(m: SockModel, holePct: number) {
  const k = Math.min(m.N, Math.floor((Math.max(0, Math.min(100, holePct)) / 100) * m.N));
  const c = mk(m.gw, m.gh);
  const g = c.getContext('2d')!;
  const img = g.createImageData(m.gw, m.gh);
  const d = img.data;
  for (let i = 0; i < m.gw * m.gh; i++) d[i * 4 + 3] = m.inside[i] && m.order[i] >= k ? 255 : 0;
  for (let i = 0; i < m.border.length; i++) {
    let v = 0;
    for (let j = m.borderNbStart[i]; j < m.borderNbStart[i + 1]; j++) if (m.order[m.borderNb[j]] >= k) v = 255;
    d[m.border[i] * 4 + 3] = v;
  }
  g.putImageData(img, 0, 0);
  return { mask: c, empty: k >= m.N };
}

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

/** the remaining sock (the real photo, masked) over a faint dashed ghost of the original */
export function renderPiece(m: SockModel, holePct: number, w: number, h: number, dpr = Math.min(2, window.devicePixelRatio || 1)) {
  const sc = Math.min(w / m.w, h / m.h) * dpr;
  const W = m.w * sc, H = m.h * sc;
  const out = mk(w * dpr, h * dpr);
  const o = out.getContext('2d')!;
  const ox = (out.width - W) / 2, oy = (out.height - H) / 2;
  // ghost of the whole sock, dashed
  const full = mk(W, H);
  full.getContext('2d')!.drawImage(m.img, 0, 0, W, H);
  const ghost = outline(full, '#1A0F1F', Math.max(1, 1.2 * dpr));
  const gc = ghost.getContext('2d')!;
  gc.globalCompositeOperation = 'destination-out';
  gc.fillStyle = '#000';
  for (let y = 0; y < H; y += 7 * dpr) gc.fillRect(0, y, W, 3 * dpr);
  o.globalAlpha = 0.35;
  o.drawImage(ghost, ox, oy);
  o.globalAlpha = 1;
  // what is left of it
  const { mask, empty } = maskAt(m, holePct);
  if (!empty) {
    const rem = mk(W, H);
    const rc = rem.getContext('2d')!;
    rc.drawImage(m.img, 0, 0, W, H);
    rc.globalCompositeOperation = 'destination-in';
    rc.imageSmoothingEnabled = true;
    rc.drawImage(mask, 0, 0, m.gw * CELL * sc, m.gh * CELL * sc);
    o.drawImage(rem, ox, oy);
  }
  return out;
}

/** the receipt's line drawing: the original faint, what remains in ink (drawn at 2×) */
export function outlineFor(m: SockModel, holePct: number, maxW = 110, maxH = 150) {
  const sc = Math.min(maxW / m.w, maxH / m.h) * 2;
  const W = m.w * sc, H = m.h * sc;
  const full = mk(W, H);
  full.getContext('2d')!.drawImage(m.img, 0, 0, W, H);
  const { mask, empty } = maskAt(m, holePct);
  const rem = mk(W, H);
  if (!empty) {
    const rc = rem.getContext('2d')!;
    rc.drawImage(m.img, 0, 0, W, H);
    rc.globalCompositeOperation = 'destination-in';
    rc.drawImage(mask, 0, 0, m.gw * CELL * sc, m.gh * CELL * sc);
  }
  const out = mk(W, H);
  const o = out.getContext('2d')!;
  o.globalAlpha = 0.28;
  o.drawImage(outline(full, '#1A0F1F', 1.6), 0, 0);
  o.globalAlpha = 1;
  const tint = mk(W, H), t = tint.getContext('2d')!;
  t.drawImage(rem, 0, 0);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = 'rgba(26,15,31,0.08)';
  t.fillRect(0, 0, W, H);
  o.drawImage(tint, 0, 0);
  o.drawImage(outline(rem, '#1A0F1F', 2.4), 0, 0);
  return out;
}
