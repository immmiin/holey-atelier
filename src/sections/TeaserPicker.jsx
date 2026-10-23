import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { money, sockSrc } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { reducedMotion } from '../lib/scroll.js';

/* Phones: the home line-up as ONE large sock on a short, flat line, with the six socks as split-colour
   swatches under it, then its name, price, "Add +" and "Pull a thread →". (Desktop keeps the full
   clothesline.) */
export default function TeaserPicker({ items }) {
  const cart = useCart();
  const [slug, setSlug] = useState(items[0].slug);
  const p = items.find((x) => x.slug === slug) || items[0];
  const inCart = cart.has(p.slug);
  const still = reducedMotion();

  return (
    <div className="tpick" style={{ '--sock': p.color }}>
      <div className="tpick__line" aria-hidden="true">
        <svg className="tpick__rope" viewBox="0 0 300 24" preserveAspectRatio="none">
          <path d="M10 12 H290" />
          <circle cx="10" cy="12" r="8" />
          <circle cx="290" cy="12" r="8" />
        </svg>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.figure
          key={p.slug}
          className="tpick__sock"
          initial={still ? false : { opacity: 0, y: -24, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={still ? undefined : { opacity: 0, y: 12, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        >
          <svg className="tpick__peg" viewBox="0 0 26 54" aria-hidden="true">
            <rect x="3" y="2" width="20" height="50" rx="7" />
            <path d="M13 6v42" />
            <circle cx="13" cy="20" r="3.2" />
          </svg>
          <img src={sockSrc(p.n, 400)} alt={`${p.name}: one sock, hole included.`} width="400" height="500" />
        </motion.figure>
      </AnimatePresence>

      <div className="tpick__swatches" role="radiogroup" aria-label="Pick a sock">
        {items.map((x) => (
          <button
            key={x.slug}
            type="button"
            role="radio"
            aria-checked={x.slug === p.slug}
            aria-label={x.name}
            className={`tpick__swatch ${x.slug === p.slug ? 'is-on' : ''}`}
            style={{ '--a': x.color, '--b': x.accent }}
            onClick={() => setSlug(x.slug)}
          >
            <span />
          </button>
        ))}
      </div>

      <div className="tpick__info">
        <p className="tpick__name">{p.name}</p>
        <p className="tpick__price">{money(p.price)}</p>
      </div>
      <div className="tpick__actions">
        <button
          type="button"
          className={`tpick__add ${inCart ? 'is-in' : ''}`}
          onClick={(e) => cart.add(p.slug, e.currentTarget.closest('.tpick')?.querySelector('.tpick__sock img'))}
        >
          {inCart ? 'In basket ✓' : 'Add +'}
        </button>
        <Link to={`/atelier?sock=${p.slug}`} className="tpick__pull">
          Pull a thread →
        </Link>
      </div>
    </div>
  );
}
