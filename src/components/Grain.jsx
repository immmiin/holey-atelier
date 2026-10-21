// Subtle animated film grain over everything (fixed, non-interactive).
const noise =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.12  0 0 0 1.1 -0.2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
  ).replace(/%2523/g, '%23');

export default function Grain() {
  return <div className="grain" aria-hidden="true" style={{ backgroundImage: `url("${noise}")` }} />;
}
