import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { logoColor, money, sockSrc } from '../data/products.js';
import { pushAccent } from '../lib/accent.js';
import './tagcard.css';

// A product as a swing tag, hanging from a punched hole.
export default function TagCard({ p, i = 0, onHover }) {
  const img = useRef(null);
  const release = useRef(null);
  useEffect(() => () => release.current?.(), []);
  const enter = () => {
    release.current?.();
    release.current = pushAccent(logoColor(p));
    onHover?.(p);
  };
  const leave = () => {
    release.current?.();
    release.current = null;
    onHover?.(null);
  };
  return (
    <article
      className="tagc"
      data-hand=""
      style={{ '--sock': p.color, '--tilt': `${[-2.5, 1.8, -1, 2.4, -1.8, 1.2][i % 6]}deg` }}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      <span className="tagc__string" aria-hidden="true" />
      <div className="tagc__body">
        <span className="tagc__hole" aria-hidden="true" />
        <Link to={`/socks/${p.slug}`} className="tagc__link" aria-label={`${p.name}, ${p.subtitle}, ${money(p.price)} plus your labor. Opens the sock's page.`} />
        <div className="tagc__media">
          <img ref={img} src={sockSrc(p.n, 800)} alt={`${p.name}: a single sock with a hole in the toe.`} width="800" height="1000" loading="lazy" />
        </div>
        <div className="tagc__meta">
          <h3 className="tagc__name">{p.name}</h3>
          <p className="tagc__sub small">{p.subtitle}</p>
          <div className="tagc__row">
            <span className="tagc__price">{money(p.price)} + your labor</span>
          </div>
        </div>
      </div>
    </article>
  );
}
