import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { logoColor, money, sockSrc } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { pushAccent } from '../lib/accent.js';
import { Plus } from './Icons.jsx';
import './tagcard.css';

// A product as a swing tag, hanging from a punched hole.
export default function TagCard({ p, i = 0, onHover }) {
  const cart = useCart();
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
      style={{ '--sock': p.color, '--tilt': `${[-2.5, 1.8, -1, 2.4, -1.8, 1.2][i % 6]}deg` }}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      <span className="tagc__string" aria-hidden="true" />
      <div className="tagc__body">
        <span className="tagc__hole" aria-hidden="true" />
        <Link to={`/socks/${p.slug}`} className="tagc__link" aria-label={`${p.name}, ${p.subtitle}, ${money(p.price)}`} />
        <div className="tagc__media">
          <img ref={img} src={sockSrc(p.n, 800)} alt={`${p.name}: a single sock with a hole in the toe.`} width="800" height="1000" loading="lazy" />
        </div>
        <div className="tagc__meta">
          <h3 className="tagc__name">{p.name}</h3>
          <p className="tagc__sub small">{p.subtitle}</p>
          <div className="tagc__row">
            <span className="tagc__price">{money(p.price)}</span>
            <button
              type="button"
              className="round-btn tagc__add"
              aria-label={cart.has(p.slug) ? `${p.name} is already in your basket` : `Add ${p.name} to basket`}
              onClick={() => cart.add(p.slug, img.current)}
            >
              <Plus />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
