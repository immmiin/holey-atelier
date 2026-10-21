import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { lineNote, linePrice, useCart } from '../context/CartContext.jsx';
import { bySlug, money, sockSrc } from '../data/products.js';
import { lockScroll, unlockScroll } from '../lib/scroll.js';
import Btn from './Btn.jsx';
import { BasketIcon } from './Nav.jsx';
import { Close } from './Icons.jsx';
import './basket.css';

export default function BasketDrawer() {
  const { items, line, open, setOpen, remove, subtotal, count } = useCart();
  const panel = useRef(null);
  const lastFocus = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    lockScroll();
    const t = setTimeout(() => panel.current?.querySelector('button, a')?.focus(), 80);
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll('a[href], button:not([disabled])')];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      unlockScroll();
      window.removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [open, setOpen]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <div className="bdrawer" role="presentation">
          <motion.div className="bdrawer__scrim" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            ref={panel}
            className="bdrawer__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="basket-title"
            initial={{ x: '110%', rotate: 6 }}
            animate={{ x: 0, rotate: 0 }}
            exit={{ x: '110%', rotate: 6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <header className="bdrawer__head">
              <span className="bdrawer__icon">
                <BasketIcon />
              </span>
              <h2 id="basket-title" className="h3">
                Laundry basket
              </h2>
              <button type="button" className="round-btn" onClick={close} aria-label="Close basket">
                <Close />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="bdrawer__empty">
                <motion.img
                  src="/logo/holey_04_nail-icon-holey.svg"
                  alt=""
                  width="1110"
                  height="1290"
                  animate={{ rotate: [-8, 6, -8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <p className="h3">Nothing in here.</p>
                <p>Which, frankly, is how most laundry baskets end up.</p>
                <Btn to="/shop" onClick={close}>
                  Find the one
                </Btn>
              </div>
            ) : (
              <>
                <ul className="bdrawer__list" data-lenis-prevent>
                  <AnimatePresence initial={false}>
                    {items.map((slug, i) => {
                      const p = bySlug[slug];
                      const l = line(slug);
                      const note = lineNote(l);
                      return (
                        <motion.li
                          key={slug}
                          className="bdrawer__item"
                          layout
                          style={{ '--sock': p.color, '--tilt': `${i % 2 ? 1.5 : -1.5}deg` }}
                          initial={{ opacity: 0, y: -40, rotate: -10 }}
                          animate={{ opacity: 1, y: 0, rotate: 0 }}
                          exit={{ opacity: 0, x: 80, rotate: 12 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                        >
                          <Link to={`/socks/${p.slug}`} onClick={close} className="bdrawer__thumb">
                            <img src={sockSrc(p.n, 400)} alt={`${p.name} sock`} width="400" height="500" />
                          </Link>
                          <div className="bdrawer__info">
                            <Link to={`/socks/${p.slug}`} onClick={close} className="bdrawer__name">
                              {p.name}
                            </Link>
                            <span className="small">{p.subtitle}</span>
                            {note && <span className="small bdrawer__note-line">{note}</span>}
                            <div className="bdrawer__row">
                              <span className="bdrawer__qty small" title="It's one sock.">
                                Qty 1 · forever
                              </span>
                              <span className="bdrawer__price">{money(linePrice(l))}</span>
                            </div>
                            <button type="button" className="bdrawer__remove small" onClick={() => remove(slug)}>
                              Let it go
                            </button>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
                <footer className="bdrawer__foot">
                  <div className="bdrawer__total">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <p className="small bdrawer__note">Shipping calculated at checkout. Pairs not available at any price.</p>
                  <Btn
                    variant="care"
                    tilt={0}
                    className="bdrawer__checkout"
                    onClick={() => {
                      close();
                      navigate('/checkout');
                    }}
                  >
                    Check out
                  </Btn>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
