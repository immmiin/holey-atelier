import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion, useAnimate, useMotionValue, useSpring } from 'motion/react';
import Logo from './Logo.jsx';
import { useCart } from '../context/CartContext.jsx';
import { products, sockSrc, logoColor } from '../data/products.js';
import { pushAccent } from '../lib/accent.js';
import { lockScroll, reducedMotion, unlockScroll } from '../lib/scroll.js';
import './nav.css';

export function BasketIcon(props) {
  return (
    <svg viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2 8.5h24l-2.6 13H4.6z" fill="var(--paper)" />
      <path d="M7 12.5v5M11.3 12.5v5M15.7 12.5v5M20 12.5v5" />
      <path d="M8.5 8.5c0-4.2 2.4-6.3 5.5-6.3s5.5 2.1 5.5 6.3" />
    </svg>
  );
}

export function BasketButton({ className = '' }) {
  const { count, setOpen, spin, registerIcon } = useCart();
  const [scope, animate] = useAnimate();
  const lastSpin = useRef(spin);

  useEffect(() => registerIcon(scope.current), [registerIcon, scope]);

  // a sock just landed: the basket catches it — squash, wobble, settle
  useEffect(() => {
    if (spin === lastSpin.current) return;
    lastSpin.current = spin;
    if (reducedMotion() || !scope.current) return;
    animate(
      scope.current,
      { scaleX: [1, 1.28, 0.86, 1.1, 0.97, 1], scaleY: [1, 0.72, 1.16, 0.92, 1.03, 1], rotate: [0, -8, 7, -4, 2, 0] },
      { duration: 0.75, ease: 'easeOut' }
    );
    animate('.basket-count', { scale: [0.2, 1.5, 1], rotate: [-30, 10, 0] }, { duration: 0.5, delay: 0.15 });
  }, [spin, animate, scope]);

  return (
    <button
      ref={scope}
      type="button"
      className={`round-btn basket-btn ${className}`}
      onClick={() => setOpen(true)}
      aria-label={`Open laundry basket, ${count} ${count === 1 ? 'sock' : 'socks'}`}
    >
      <BasketIcon />
      {count > 0 && (
        <span className="basket-count" aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/#atelier', label: 'The Atelier', hash: true }
];

function MenuTile({ p, onClose }) {
  const release = useRef(null);
  useEffect(() => () => release.current?.(), []);
  return (
    <Link
      to={`/socks/${p.slug}`}
      className="tagmenu__sock"
      style={{ '--sock': p.color }}
      onClick={onClose}
      onPointerEnter={() => (release.current = pushAccent(logoColor(p)))}
      onPointerLeave={() => release.current?.()}
    >
      <img src={sockSrc(p.n, 400)} alt="" width="400" height="500" loading="lazy" />
      <span>{p.name}</span>
    </Link>
  );
}

export default function Nav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  // squish: scroll velocity → spring-driven scale
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const scaleX = useSpring(sx, { stiffness: 380, damping: 14, mass: 0.6 });
  const scaleY = useSpring(sy, { stiffness: 380, damping: 14, mass: 0.6 });

  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let settle = 0;
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const v = (y - lastY) / Math.max(8, now - lastT); // px/ms
      lastY = y;
      lastT = now;
      setCompact(y > 60);
      if (reducedMotion()) return;
      const k = Math.min(Math.abs(v) / 6, 1) * 0.14;
      sx.set(1 + k * 0.55);
      sy.set(1 - k);
      clearTimeout(settle);
      settle = setTimeout(() => {
        sx.set(1);
        sy.set(1);
      }, 90);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(settle);
    };
  }, [sx, sy]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className={`nav ${compact ? 'is-compact' : ''}`}>
      <motion.div className="nav__tag" style={{ scaleX, scaleY }}>
        <svg className="nav__string" viewBox="0 0 120 90" aria-hidden="true">
          <path d="M112 62 C 86 58, 70 30, 52 22 S 16 -6, -4 4" />
        </svg>
        <span className="nav__point" aria-hidden="true">
          <svg viewBox="0 0 40 100" preserveAspectRatio="none">
            <path d="M41 1.5H17L1.8 50 17 98.5H41" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="nav__hole" />
        </span>
        <div className="nav__body">
          <Link to="/" className="nav__logo" aria-label="Holey home">
            <Logo />
          </Link>
          <nav className="nav__links" aria-label="Main">
            {links.map((l) =>
              l.hash ? (
                <Link key={l.to} to={l.to} className="nav__link">
                  {l.label}
                </Link>
              ) : (
                <NavLink key={l.to} to={l.to} className="nav__link">
                  {l.label}
                </NavLink>
              )
            )}
          </nav>
          <BasketButton />
          <button
            type="button"
            className="nav__menu-btn"
            aria-expanded={open}
            aria-controls="tag-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="nav__burger" data-open={open || undefined} aria-hidden="true">
              <i />
              <i />
            </span>
            <span className="visually-hidden">Menu</span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="tagmenu__scrim"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              id="tag-menu"
              className="tagmenu"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              data-lenis-prevent
              initial={{ y: -40, rotate: -4, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, rotate: 3, opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              <nav className="tagmenu__links" aria-label="Mobile">
                <Link to="/" onClick={() => setOpen(false)}>Home</Link>
                {links.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
                    {l.label}
                  </Link>
                ))}
                <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
              </nav>
              <p className="kicker tagmenu__kicker">On the line today</p>
              <div className="tagmenu__socks">
                {products.map((p) => (
                  <MenuTile key={p.slug} p={p} onClose={() => setOpen(false)} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
