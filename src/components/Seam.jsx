// A stitched seam between sections: it sews itself left → right as it scrolls in (a stroke-dashoffset
// mask), then two or three stitches pop loose. Purely decorative; the animation lives in reveal.css.
export default function Seam({ id = 'seam' }) {
  const mask = `${id}-mask`;
  return (
    <div className="seam wrap" aria-hidden="true">
      <svg viewBox="0 0 1000 28" preserveAspectRatio="none">
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="28">
            <path className="seam__draw" d="M0 14 H1000" pathLength="1" />
          </mask>
        </defs>
        <path className="seam__line" d="M2 14 H998" mask={`url(#${mask})`} vectorEffect="non-scaling-stroke" />
        <path className="seam__loose" d="M232 14 q5 -12 14 -4" vectorEffect="non-scaling-stroke" />
        <path className="seam__loose" d="M588 14 q4 -13 13 -6" vectorEffect="non-scaling-stroke" />
        <path className="seam__loose" d="M814 14 q6 -11 15 -3" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
