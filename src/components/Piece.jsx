import { useEffect, useRef } from 'react';
import { sockModel } from '../atelier/models.ts';
import { renderPiece } from '../atelier/silhouette.ts';
import { SOCKS } from '../atelier/socks.ts';

/* one finished piece, re-rendered from {sock, hole %} */
export default function Piece({ slug, hole, w = 150, h = 188, className = '', label }) {
  const ref = useRef(null);
  useEffect(() => {
    let alive = true;
    const def = SOCKS.find((s) => s.slug === slug);
    if (!def) return undefined;
    sockModel(def.id).then((m) => {
      if (!alive || !ref.current) return;
      const c = renderPiece(m, hole, w, h);
      const el = ref.current;
      el.width = c.width;
      el.height = c.height;
      el.getContext('2d').drawImage(c, 0, 0);
    });
    return () => {
      alive = false;
    };
  }, [slug, hole, w, h]);
  return <canvas ref={ref} className={`piece ${className}`} style={{ width: w, height: h }} role="img" aria-label={label} />;
}
