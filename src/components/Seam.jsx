// A stitched seam between sections: the site's dashed line (--dash-line, same as the hero divider) sews
// itself left → right as it scrolls in, then three stitches pop loose. Purely decorative; the
// animation lives in reveal.css.
export default function Seam() {
  return (
    <div className="seam wrap" aria-hidden="true">
      <span className="seam__line" />
      <svg viewBox="0 0 1000 28" preserveAspectRatio="none">
        <path className="seam__loose" d="M232 14 q5 -12 14 -4" vectorEffect="non-scaling-stroke" />
        <path className="seam__loose" d="M588 14 q4 -13 13 -6" vectorEffect="non-scaling-stroke" />
        <path className="seam__loose" d="M814 14 q6 -11 15 -3" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
