// The ATELIER HOLEY thermal receipt, drawn in canvas. The page shows this exact
// drawing (printing out line by line) and "Save receipt" exports it at 2×, die-cut
// holes and all (they are real transparent pixels).

export interface ReceiptLine {
  slug: string;
  n: number;
  name: string;
  /** the sock as sold */
  base: number;
  /** what you pay for it (distressed price, or base) */
  price: number;
  /** set when it was hand-distressed at the Atelier */
  hole?: number;
  laborMs?: number;
  /** small line drawing of what is left of the sock (data URL) */
  outline?: string;
}

export interface Order {
  id: string;
  date: string;
  lines: ReceiptLine[];
  /** true while the serial is only local (the Archive hasn't confirmed it yet) */
  local?: boolean;
}

export const RECEIPT_W = 320;

const PAD = 22;
const INK = '#241a26';
const RED = '#C9302C';
const PAPER = '#FFFCF6';
const LUX = "Fraunces, Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

export const money = (v: number) => `$${v.toFixed(2)}`;
export const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** a distressed sock's price, split into what the receipt itemises; the parts always add up */
export function split(l: ReceiptLine) {
  const extra = Math.max(0, l.price - l.base);
  const distressing = Math.round(extra * 0.42 * 100) / 100;
  const premium = Math.round((extra - distressing) * 100) / 100;
  return { distressing, premium };
}

export const orderTotal = (o: Order) => o.lines.reduce((t, l) => t + l.price, 0);
export const orderLaborMs = (o: Order) => o.lines.reduce((t, l) => t + (l.laborMs ?? 0), 0);
const hours = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
};

export async function receiptFontsReady() {
  await Promise.all([
    document.fonts.load(`900 17px ${LUX}`),
    document.fonts.load(`400 11px ${MONO}`),
    document.fonts.load(`700 11px ${MONO}`),
  ]).catch(() => undefined);
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
function img(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
    images.set(src, p);
  }
  return p;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** draw (or, with ctx = null, just measure) the receipt; returns its height in CSS px */
export async function drawReceipt(ctx: CanvasRenderingContext2D | null, o: Order): Promise<number> {
  await receiptFontsReady();
  const outlines = await Promise.all(o.lines.map((l) => (l.outline ? img(l.outline) : Promise.resolve(null))));
  const m = ctx ?? document.createElement('canvas').getContext('2d')!;
  const W = RECEIPT_W;
  const draw = !!ctx;
  const ops: ((c: CanvasRenderingContext2D) => void)[] = [];
  const holes: [number, number, number][] = [];
  let y = PAD;

  const text = (t: string, x: number, yy: number, font: string, opts: { align?: CanvasTextAlign; color?: string; track?: number; alpha?: number } = {}) =>
    ops.push((c) => {
      c.font = font;
      c.fillStyle = opts.color ?? INK;
      c.globalAlpha = opts.alpha ?? 1;
      c.textBaseline = 'alphabetic';
      const track = opts.track ?? 0;
      if (!track) {
        c.textAlign = opts.align ?? 'left';
        c.fillText(t, x, yy);
      } else {
        // manual tracking (canvas letterSpacing isn't everywhere yet)
        const ws = [...t].map((ch) => c.measureText(ch).width);
        const total = ws.reduce((a, b) => a + b, 0) + track * (t.length - 1);
        let cx = opts.align === 'center' ? x - total / 2 : opts.align === 'right' ? x - total : x;
        c.textAlign = 'left';
        [...t].forEach((ch, i) => {
          c.fillText(ch, cx, yy);
          cx += ws[i] + track;
        });
      }
      c.globalAlpha = 1;
    });
  const width = (t: string, font: string) => {
    m.font = font;
    return m.measureText(t).width;
  };
  const rule = (double = false) => {
    const yy = y + 6;
    ops.push((c) => {
      c.strokeStyle = double ? 'rgba(36,26,38,0.7)' : 'rgba(36,26,38,0.45)';
      c.lineWidth = 1.5;
      c.setLineDash(double ? [] : [4, 3]);
      c.beginPath();
      c.moveTo(PAD, yy);
      c.lineTo(W - PAD, yy);
      if (double) {
        c.moveTo(PAD, yy + 3.5);
        c.lineTo(W - PAD, yy + 3.5);
      }
      c.stroke();
      c.setLineDash([]);
    });
    y += double ? 18 : 15;
  };
  /** label …………… amount, with a dotted leader */
  const leader = (l: string, r: string, opts: { indent?: number; color?: string; bold?: boolean } = {}) => {
    const fontL = `${opts.bold ? 700 : 400} 11.5px ${MONO}`;
    const fontR = `700 11.5px ${MONO}`;
    const x0 = PAD + (opts.indent ?? 0);
    const wl = width(l, fontL), wr = width(r, fontR);
    const yy = y + 12;
    text(l, x0, yy, fontL, { color: opts.color });
    text(r, W - PAD, yy, fontR, { align: 'right', color: opts.color });
    ops.push((c) => {
      c.strokeStyle = 'rgba(36,26,38,0.45)';
      c.lineWidth = 1.4;
      c.setLineDash([1.4, 2.6]);
      c.beginPath();
      c.moveTo(x0 + wl + 5, yy - 2);
      c.lineTo(W - PAD - wr - 5, yy - 2);
      c.stroke();
      c.setLineDash([]);
    });
    y += 18;
  };

  // header
  text('ATELIER HOLEY', W / 2, y + 16, `900 17px ${LUX}`, { align: 'center', track: 5.4 });
  y += 24;
  text('New York · Maison du Trou', W / 2, y + 12, `400 10px ${MONO}`, { align: 'center', track: 1.2, alpha: 0.75 });
  y += 26;
  const d = new Date(o.date);
  const meta: [string, string][] = [
    ['Order No.', o.id],
    [d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })],
    ['Artisan:', 'You'],
  ];
  for (const [a, b] of meta) {
    text(a, PAD, y + 11, `400 10.5px ${MONO}`);
    text(b, W - PAD, y + 11, `400 10.5px ${MONO}`, { align: 'right' });
    y += 16;
  }
  rule();

  // items
  o.lines.forEach((l, i) => {
    if (i) y += 4;
    leader(`1 × ${l.name}`, money(l.base), { bold: true });
    if (l.hole != null) {
      const s = split(l);
      leader(`Hand-distressing ${l.hole}%`, money(s.distressing), { indent: 10 });
      leader(`Labor ${clock(l.laborMs ?? 0)}`, money(0), { indent: 10 });
      leader('Brand premium', money(s.premium), { indent: 10 });
    }
  });
  y += 4;
  leader('Artisan wage', money(0), { color: RED });
  leader('Shipping', 'Free', {});
  rule(true);
  const total = orderTotal(o);
  text('TOTAL', PAD, y + 26, `900 15px ${LUX}`, { track: 3 });
  text(money(total), W - PAD, y + 30, `900 30px ${LUX}`, { align: 'right' });
  y += 44;

  // what is left of each hand-distressed sock, and the hole you made, punched through the paper
  o.lines.forEach((l, i) => {
    if (l.hole == null) return;
    y += 10;
    const top = y;
    const im = outlines[i];
    const h = 132;
    if (im) {
      const w = (im.width / im.height) * h;
      ops.push((c) => c.drawImage(im, W * 0.3 - w / 2, top, w, h));
    }
    const dia = 10 + 66 * Math.min(1, l.hole / 100);
    holes.push([W * 0.72, top + h * 0.44, dia / 2]);
    text(`Hole ${l.hole}%`, W * 0.72, top + h * 0.44 + 46, `400 10.5px ${MONO}`, { align: 'center' });
    y += h + 8;
    text(`${l.name} · sock remaining ${100 - l.hole}%`, W / 2, y + 10, `400 10.5px ${MONO}`, { align: 'center', track: 0.5 });
    y += 20;
  });

  // barcode
  y += 10;
  const code = `${o.id}`;
  let hb = hash(code + o.lines.length);
  let bx = 0;
  const bars: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    hb = Math.imul(hb ^ code.charCodeAt(i % code.length) ^ i, 16777619) >>> 0;
    const w = 1 + (hb % 3);
    if (i % 2 === 0) bars.push([bx, w]);
    bx += w + ((hb >>> 4) % 2);
  }
  const bTop = y, bScale = (W - PAD * 2) / bx;
  ops.push((c) => {
    c.fillStyle = INK;
    for (const [x, w] of bars) c.fillRect(PAD + x * bScale, bTop, w * bScale, 44);
  });
  y += 50;
  text(`${o.id} · ${o.lines.length} SOCK${o.lines.length === 1 ? '' : 'S'}`, W / 2, y + 10, `400 10px ${MONO}`, { align: 'center', track: 3 });
  y += 30;
  text('YOUR HANDS. OUR PREMIUM.', W / 2, y + 10, `700 10.5px ${MONO}`, { align: 'center', track: 0.9 });
  y += 16;
  text('NO REFUNDS ON FEELINGS.', W / 2, y + 10, `700 10.5px ${MONO}`, { align: 'center', track: 0.9 });
  y += 30;

  // ---------------- perforation, then the artisan's copy: a payslip
  const perf = y;
  ops.push((c) => {
    c.strokeStyle = 'rgba(36,26,38,0.55)';
    c.lineWidth = 1.5;
    c.setLineDash([3, 4]);
    c.beginPath();
    c.moveTo(10, perf);
    c.lineTo(W - 10, perf);
    c.stroke();
    c.setLineDash([]);
    c.font = `400 10px ${MONO}`;
    c.fillStyle = 'rgba(36,26,38,0.6)';
    c.textAlign = 'center';
    c.fillText('✂  tear here', W / 2, perf - 6);
  });
  holes.push([0, perf, 7], [W, perf, 7]);
  y += 22;
  text('ARTISAN COPY', W / 2, y + 14, `900 15px ${LUX}`, { align: 'center', track: 4 });
  y += 20;
  text('— PAYSLIP —', W / 2, y + 12, `400 10.5px ${MONO}`, { align: 'center', track: 3, alpha: 0.75 });
  y += 24;
  const pay: [string, string][] = [
    ['Artisan', 'You'],
    ['Pay period', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
    ['Hours worked', hours(orderLaborMs(o))],
    ['Rate', '$0.00/hr'],
  ];
  for (const [a, b] of pay) leader(a, b);
  rule();
  leader('Gross pay', money(0), { bold: true });
  text('Deductions', PAD, y + 12, `400 11.5px ${MONO}`);
  y += 18;
  leader('Brand premium', '−$0.00', { indent: 10 });
  leader('Exposure', '−$0.00', { indent: 10 });
  rule(true);
  text('NET PAY', PAD, y + 26, `900 15px ${LUX}`, { track: 3, color: RED });
  text('$0.00', W - PAD, y + 32, `900 34px ${LUX}`, { align: 'right', color: RED });
  y += 50;
  text('Thank you for your passion.', W / 2, y + 12, `700 11.5px ${MONO}`, { align: 'center' });
  y += 20;
  if (o.local) {
    text('(saved on this device · archive pending)', W / 2, y + 10, `400 9.5px ${MONO}`, { align: 'center', alpha: 0.6 });
    y += 16;
  }
  y += 14;
  const H = Math.ceil(y + 8);
  if (!draw) return H;

  // paper: torn zig-zag bottom, grain, a faint curl at the edges
  const c = ctx!;
  const tooth = 9, depth = 6;
  c.save();
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(W, 0);
  c.lineTo(W, H - depth);
  for (let x = W; x > 0; x -= tooth) {
    c.lineTo(Math.max(0, x - tooth / 2), H);
    c.lineTo(Math.max(0, x - tooth), H - depth);
  }
  c.closePath();
  c.fillStyle = PAPER;
  c.fill();
  c.clip();
  let r = hash(o.id);
  const rnd = () => ((r = Math.imul(r ^ (r >>> 15), 2246822519) >>> 0) / 4294967296);
  for (let i = 0; i < (W * H) / 60; i++) {
    c.fillStyle = `rgba(90,68,50,${0.02 + rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 1, 1);
  }
  const curl = c.createLinearGradient(0, 0, W, 0);
  curl.addColorStop(0, 'rgba(60,40,30,0.07)');
  curl.addColorStop(0.07, 'rgba(60,40,30,0)');
  curl.addColorStop(0.93, 'rgba(60,40,30,0)');
  curl.addColorStop(1, 'rgba(60,40,30,0.06)');
  c.fillStyle = curl;
  c.fillRect(0, 0, W, H);
  for (const op of ops) op(c);
  // die-cut holes: real transparency
  c.globalCompositeOperation = 'destination-out';
  for (const [x, yy, rad] of holes) {
    c.beginPath();
    c.arc(x, yy, rad, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  return H;
}

/** the receipt as a PNG at 2× */
export async function receiptPNG(o: Order): Promise<Blob> {
  const H = await drawReceipt(null, o);
  const cv = document.createElement('canvas');
  cv.width = RECEIPT_W * 2;
  cv.height = H * 2;
  const ctx = cv.getContext('2d')!;
  ctx.scale(2, 2);
  await drawReceipt(ctx, o);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), 'image/png'));
}
