export interface SockDef {
  id: number;
  name: string;
  slug: string;
  /** the site's own cutout (same image the clothesline shows), so DOM and canvas match exactly */
  src: string;
  /** toe-hole centre, normalised to the image (scripts/hole.mjs) */
  hole: { x: number; y: number };
}

export const SOCKS: SockDef[] = [
  { id: 1, name: 'Heel Yeah', slug: 'heel-yeah', src: '/img/socks/sock-1-1200.webp', hole: { x: 0.2769, y: 0.8814 } },
  { id: 2, name: 'Lost in Laundry', slug: 'lost-in-laundry', src: '/img/socks/sock-2-1200.webp', hole: { x: 0.2864, y: 0.8769 } },
  { id: 3, name: 'Purple Reign', slug: 'purple-reign', src: '/img/socks/sock-3-1200.webp', hole: { x: 0.2787, y: 0.8805 } },
  { id: 4, name: 'Big Toe Energy', slug: 'big-toe-energy', src: '/img/socks/sock-4-1200.webp', hole: { x: 0.2919, y: 0.8816 } },
  { id: 5, name: 'Toe Jam', slug: 'toe-jam', src: '/img/socks/sock-5-1200.webp', hole: { x: 0.2892, y: 0.8999 } },
  { id: 6, name: 'Grass Stain', slug: 'grass-stain', src: '/img/socks/sock-6-1200.webp', hole: { x: 0.2743, y: 0.8839 } },
];
