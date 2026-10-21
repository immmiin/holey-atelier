// The Certificate of Authenticity, drawn entirely in canvas so the PNG export
// is exactly what is on screen.

import { wordmarkSvg } from './brandSvg';
import { type Sale, clock, fmtDate, holePct, money } from './sale';

export const CERT_W = 800;
export const CERT_H = 1120;
export const SEAL = { x: 636, y: 958, r: 64 };

const GREEN = '#1F5B3A', INK = '#1A0F1F', CREAM = '#FBF1E8', PINK = '#F4A9BC', RED = '#C9302C';
const LUX = 'Fraunces, Georgia, serif';
const BODY = 'Nunito, system-ui, sans-serif';
const DISPLAY = "'Bagel Fat One', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

let wordmark: Promise<HTMLImageElement> | null = null;
function wordmarkImage() {
  if (!wordmark) {
    wordmark = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(wordmarkSvg(GREEN))}`;
    });
  }
  return wordmark;
}

export async function certFontsReady() {
  await Promise.all([
    document.fonts.load(`900 40px ${LUX}`),
    document.fonts.load(`400 40px ${DISPLAY}`),
    document.fonts.load(`700 20px ${BODY}`),
    document.fonts.load(`800 20px ${BODY}`),
    document.fonts.load(`400 20px ${MONO}`),
    wordmarkImage(),
  ]).catch(() => undefined);
}

/** draw text with manual tracking (canvas letterSpacing isn't everywhere yet) */
function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: 'left' | 'center' | 'right' = 'left') {
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (text.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + track;
  });
  ctx.textAlign = prev;
}

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

/** a green wax seal, pressed with the Holey H */
export function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  // the wax spreads unevenly where it was pressed
  const blob = () => {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const rr = r * (1 + 0.055 * Math.sin(5 * a + 1) + 0.035 * Math.sin(11 * a + 0.4) + 0.025 * Math.sin(19 * a + 2));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  ctx.shadowColor = 'rgba(26,15,31,0.35)';
  ctx.shadowBlur = r * 0.18;
  ctx.shadowOffsetY = r * 0.06;
  blob();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
  g.addColorStop(0, '#4E9A6E');
  g.addColorStop(0.45, '#23633F');
  g.addColorStop(1, '#0F3320');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // pressed inner disc
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  const g2 = ctx.createRadialGradient(cx + r * 0.2, cy + r * 0.25, r * 0.1, cx, cy, r * 0.75);
  g2.addColorStop(0, '#2A6E48');
  g2.addColorStop(1, '#174A2F');
  ctx.fillStyle = g2;
  ctx.fill();
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = 'rgba(8,30,18,0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - r * 0.012, cy - r * 0.02, r * 0.7, Math.PI * 0.9, Math.PI * 1.75);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = r * 0.025;
  ctx.stroke();
  // embossed H
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${r * 0.82}px ${DISPLAY}`;
  ctx.fillStyle = 'rgba(6,24,14,0.7)';
  ctx.fillText('H', cx + r * 0.03, cy + r * 0.09);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText('H', cx - r * 0.025, cy + r * 0.02);
  ctx.fillStyle = '#2B7049';
  ctx.fillText('H', cx, cy + r * 0.05);
  // ring lettering
  const text = 'ATELIER HOLEY · AUTHENTIQUE · ';
  ctx.font = `900 ${r * 0.14}px ${LUX}`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const step = (Math.PI * 2) / text.length;
  [...text].forEach((ch, i) => {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  // a highlight on the wax
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.45, cy - r * 0.55, r * 0.22, r * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.restore();
}

export async function drawCertificate(ctx: CanvasRenderingContext2D, s: Sale, sealed: boolean) {
  await certFontsReady();
  const W = CERT_W, H = CERT_H;
  const n = holePct(s);
  const R = rng(Number(s.serial) || 7);

  // paper
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${R() < 0.5 ? '26,15,31' : '255,255,255'},${0.025 + R() * 0.03})`;
    ctx.fillRect(R() * W, R() * H, 1 + R(), 1 + R());
  }
  // thin double border
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.lineWidth = 1;
  ctx.strokeRect(34, 34, W - 68, H - 68);
  for (const [x, y] of [
    [30, 30],
    [W - 30, 30],
    [30, H - 30],
    [W - 30, H - 30],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = CREAM;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.fillStyle = PINK;
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }

  // masthead
  const wm = await wordmarkImage();
  const wmH = 58, wmW = (wm.width / wm.height) * wmH;
  ctx.drawImage(wm, W / 2 - wmW / 2, 62, wmW, wmH);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GREEN;
  ctx.font = `900 12px ${LUX}`;
  tracked(ctx, 'ATELIER HOLEY · MAISON DU TROU · NEW YORK', W / 2, 146, 3.2, 'center');
  ctx.fillStyle = INK;
  ctx.font = `900 46px ${LUX}`;
  ctx.textAlign = 'center';
  ctx.fillText('Certificate of Authenticity', W / 2, 206);
  ctx.font = `600 italic 16px ${BODY}`;
  ctx.fillStyle = 'rgba(26,15,31,0.7)';
  ctx.fillText('This certifies that the object below is one genuine Holey sock, personally', W / 2, 240);
  ctx.fillText('reduced to its present condition at the Atelier, and is', W / 2, 262);
  ctx.fillStyle = GREEN;
  ctx.font = `900 13px ${LUX}`;
  tracked(ctx, 'HAND-DISTRESSED BY', W / 2, 300, 4, 'center');
  ctx.font = `400 ${s.name.length > 12 ? 44 : 56}px ${DISPLAY}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(s.name, W / 2, 358);

  // the artwork: what remains on the pin, and what you made of the rest
  const px = 70, py = 386, pw = W - 140, ph = 330;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 14);
  ctx.fillStyle = '#F5E4D5';
  ctx.fill();
  ctx.clip();
  const floor = py + ph - 46;
  ctx.fillStyle = '#EAD3BF';
  ctx.fillRect(px, floor - 8, pw, ph);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(px, floor - 8, pw, 1.2);
  // the line
  const lineY = py + 30;
  ctx.strokeStyle = '#CDB8A3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, lineY);
  ctx.quadraticCurveTo(px + pw / 2, lineY + 8, px + pw, lineY);
  ctx.stroke();
  const a = s.art;
  const k = Math.min((floor - lineY - 40) / a.sockBox.h, 0.62);
  const sockCx = px + pw * 0.33;
  // the sock canvas includes `pad` image px on every side
  const sw = (a.sock.width / a.dpr) * k, sh = (a.sock.height / a.dpr) * k;
  const padPx = a.pad * a.s * k;
  const sx = sockCx - sw / 2, sy = lineY + 22 - padPx;
  // the ghost was drawn at the sock's on-screen size, so it scales with the sock
  const gw = a.sockBox.w * k, gh = a.sockBox.h * k;
  ctx.drawImage(s.ghost, sx + padPx, sy + padPx, gw, gh);
  ctx.drawImage(a.sock, sx, sy, sw, sh);
  // the clothespin
  ctx.fillStyle = '#D8B48A';
  ctx.beginPath();
  ctx.roundRect(sockCx - 6 + (a.sockBox.w * k) * 0.08, lineY - 8, 12, 40, 3);
  ctx.fill();
  // the heap, same scale as the sock
  const hb = a.heapBox;
  const heapCx = px + pw * 0.72;
  if (hb.w > 1) {
    const sh2 = ctx.createRadialGradient(heapCx, floor, 0, heapCx, floor, hb.w * k * 0.7);
    sh2.addColorStop(0, 'rgba(26,15,31,0.25)');
    sh2.addColorStop(1, 'rgba(26,15,31,0)');
    ctx.save();
    ctx.translate(heapCx, floor);
    ctx.scale(1, 0.12);
    ctx.fillStyle = sh2;
    ctx.beginPath();
    ctx.arc(0, 0, hb.w * k * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(
      a.heap,
      heapCx + (hb.ox - hb.cx) * k,
      floor + (hb.oy - hb.base) * k,
      (a.heap.width / a.dpr) * k,
      (a.heap.height / a.dpr) * k,
    );
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(26,15,31,0.6)';
  ctx.font = `700 13px ${BODY}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Sock remaining ${100 - n}%`, px + pw * 0.33, py + ph + 24);
  ctx.fillText(`Value added ${n}%`, px + pw * 0.72, py + ph + 24);

  // particulars
  const rows: [string, string, string?][] = [
    ['Serial', `HOL-${s.serial}`],
    ['Model', `No. 0${s.sockId} · ${s.sockName}`],
    ['Hole', `${n}%`],
    ['Price', money(s.price)],
    ['Labor', clock(s.laborMs)],
    ['Artisan wage', money(0), RED],
    ['Date', fmtDate(s.date)],
  ];
  const colX = [92, 330];
  rows.forEach(([label, value, color], i) => {
    const x = colX[i % 2], y = 772 + Math.floor(i / 2) * 48;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(26,15,31,0.55)';
    ctx.font = `800 10.5px ${BODY}`;
    tracked(ctx, label.toUpperCase(), x, y, 1.6);
    ctx.fillStyle = color ?? INK;
    ctx.font = label === 'Serial' ? `400 18px ${MONO}` : `900 20px ${LUX}`;
    ctx.fillText(value, x, y + 24);
  });

  // signature
  ctx.strokeStyle = 'rgba(26,15,31,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(92, 1030);
  ctx.lineTo(520, 1030);
  ctx.stroke();
  ctx.fillStyle = 'rgba(26,15,31,0.55)';
  ctx.font = `700 12px ${BODY}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Hand-distressed by ${s.name}`, 92, 1050);
  ctx.fillStyle = GREEN;
  ctx.font = `400 italic 30px ${LUX}`;
  ctx.fillText(s.name, 100, 1022);

  ctx.fillStyle = 'rgba(26,15,31,0.45)';
  ctx.font = `900 9.5px ${LUX}`;
  tracked(ctx, 'LESS SOCK, HIGHER PRICE. NO REFUNDS ON FEELINGS.', W / 2, H - 50, 2.4, 'center');

  if (sealed) drawSeal(ctx, SEAL.x, SEAL.y, SEAL.r);
}

export async function certificatePNG(s: Sale): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = CERT_W * 2;
  c.height = CERT_H * 2;
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  await drawCertificate(ctx, s, true);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), 'image/png'));
}
