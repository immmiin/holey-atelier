import type { PullStage } from './PullStage';

type Img = HTMLCanvasElement | HTMLImageElement;

export type Artwork = Omit<ReturnType<PullStage['artwork']>, 'sock' | 'heap'> & { sock: Img; heap: Img };

/** everything the receipt and the certificate need, captured when the basket is pressed */
export interface Sale {
  sockId: number;
  slug: string;
  sockName: string;
  name: string;
  p: number;
  price: number;
  laborMs: number;
  serial: string;
  date: Date;
  finished: boolean;
  /** line drawing of the remaining sock (data URL, drawn at 2×) */
  outline: string;
  /** faint outline of the original sock, for the certificate */
  ghost: Img;
  art: Artwork;
}

export const money = (v: number) => `$${v.toFixed(2)}`;
export const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const holePct = (s: Pick<Sale, 'p' | 'finished'>) => (s.finished ? 100 : Math.min(99, Math.floor(s.p * 100)));

/** the receipt's price breakdown; the lines always add up to the total */
export function breakdown(s: Sale) {
  const extra = Math.max(0, s.price - 9);
  const distressing = Math.round(extra * 0.42 * 100) / 100;
  const premium = Math.round((extra - distressing) * 100) / 100;
  return { base: 9, distressing, premium, total: 9 + distressing + premium };
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ---------------------------------------------------------------- keeping a sale for checkout

const KEY = (slug: string) => `holey-sale-${slug}`;

function toURL(c: Img, type = 'image/webp') {
  if (c instanceof HTMLImageElement) return c.src;
  return c.toDataURL(type, 0.86);
}
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

/** one saved sale per sock (the cart holds one of each); quietly skipped if storage is full */
export function saveSale(s: Sale) {
  try {
    const data = {
      ...s,
      date: s.date.toISOString(),
      ghost: toURL(s.ghost, 'image/png'),
      art: { ...s.art, sock: toURL(s.art.sock), heap: toURL(s.art.heap) },
    };
    localStorage.setItem(KEY(s.slug), JSON.stringify(data));
  } catch {
    /* storage full or private mode: the receipt still printed */
  }
}

export async function loadSale(slug: string, serial?: string): Promise<Sale | null> {
  try {
    const raw = localStorage.getItem(KEY(slug));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (serial && d.serial !== serial) return null;
    const [ghost, sock, heap] = await Promise.all([loadImg(d.ghost), loadImg(d.art.sock), loadImg(d.art.heap)]);
    return { ...d, date: new Date(d.date), ghost, art: { ...d.art, sock, heap } };
  } catch {
    return null;
  }
}
