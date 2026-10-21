import type { Scene } from '../scene/Scene';

export type Artwork = ReturnType<Scene['artwork']>;

/** everything the receipt and the certificate need, captured when the basket is pressed */
export interface Sale {
  sockId: number;
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
  ghost: HTMLCanvasElement;
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
