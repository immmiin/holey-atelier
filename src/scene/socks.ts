export interface SockDef {
  id: number;
  name: string;
  src: string;
  /** toe-hole centre, normalised to the cutout image */
  hole: { x: number; y: number };
}

export const SOCKS: SockDef[] = [
  { id: 1, name: 'Heel Yeah', src: '/socks/01.webp', hole: { x: 0.1191, y: 0.8938 } },
  { id: 2, name: 'Lost in Laundry', src: '/socks/02.webp', hole: { x: 0.1303, y: 0.889 } },
  { id: 3, name: 'Purple Reign', src: '/socks/03.webp', hole: { x: 0.1302, y: 0.893 } },
  { id: 4, name: 'Big Toe Energy', src: '/socks/04.webp', hole: { x: 0.1338, y: 0.8937 } },
  { id: 5, name: 'Toe Jam', src: '/socks/05.webp', hole: { x: 0.1341, y: 0.8938 } },
  { id: 6, name: 'Grass Stain', src: '/socks/06.webp', hole: { x: 0.1183, y: 0.8969 } },
];
