import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'motion';
import { bySlug, money, sockSrc } from '../data/products.js';
import { reducedMotion } from '../lib/scroll.js';

const CartContext = createContext(null);
const KEY = 'holey-cart-v1';

/* Every line is a sock you pulled yourself: { slug, price, hole, laborMs, serial, outline } (outline: a
   small line drawing of what's left, for the receipt). Pulling is the only way in, so older saves
   (plain slug strings, or { slug } "as sold") are dropped on load. */
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((e) => e && typeof e === 'object' && bySlug[e.slug] && e.hole > 0 && Number.isFinite(e.price));
  } catch {
    return [];
  }
}

const laborOf = (ms = 0) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const lineNote = (line) => (line?.hole != null ? `${line.hole}% hole · labor ${laborOf(line.laborMs)}` : null);
export const linePrice = (line) => (line?.price != null ? line.price : bySlug[line.slug].price);

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load); // quantity is always 1
  const items = useMemo(() => lines.map((l) => l.slug), [lines]);
  const [open, setOpen] = useState(false);
  const [spin, setSpin] = useState(0); // bump to make the cart icon do a spin cycle
  const [toast, setToast] = useState(null);
  const iconRefs = useRef(new Set());
  const toastTimer = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* private mode: the sock lives in memory only */
    }
  }, [lines]);

  // keep tabs in sync
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setLines(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const registerIcon = useCallback((el) => {
    if (!el) return undefined;
    iconRefs.current.add(el);
    return () => iconRefs.current.delete(el);
  }, []);

  const say = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast({ text, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const visibleIcon = () =>
    [...iconRefs.current].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

  const fly = useCallback(async (fromEl, n) => {
    const target = visibleIcon();
    if (!fromEl || !target || reducedMotion()) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const size = Math.min(Math.max(a.width * 0.6, 90), 220);
    const img = document.createElement('img');
    img.src = sockSrc(n, 400);
    img.alt = '';
    img.className = 'fly-sock';
    Object.assign(img.style, {
      position: 'fixed',
      left: `${a.left + a.width / 2 - size / 2}px`,
      top: `${a.top + a.height / 2 - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      zIndex: 9000,
      pointerEvents: 'none',
      filter: 'drop-shadow(0 10px 14px rgba(26,15,31,.25))'
    });
    document.body.appendChild(img);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const lift = Math.min(160, Math.abs(dy) * 0.4 + 60);
    await animate(
      img,
      {
        x: [0, dx * 0.45, dx],
        y: [0, dy * 0.45 - lift, dy],
        scale: [1, 0.75, 0.12],
        rotate: [0, -25, -300],
        opacity: [1, 1, 0.9]
      },
      { duration: 0.85, ease: [0.55, 0, 0.35, 1], times: [0, 0.45, 1] }
    ).finished;
    img.remove();
  }, []);

  /* opts.distressed = { price, hole, laborMs, serial, outline } from the Atelier; opts.openDrawer = false to skip the drawer */
  const add = useCallback(
    async (slug, fromEl, opts = {}) => {
      const { distressed, openDrawer = true, quiet = false } = opts;
      // the only way into the basket is pulling the thread first
      if (!distressed || !(distressed.hole > 0)) {
        say('Pull the thread first: the hole you make sets the price.');
        return false;
      }
      const had = items.includes(slug);
      const p = bySlug[slug];
      const line = { slug, ...distressed };
      const flight = fly(fromEl, p.n);
      setLines((cur) => (had ? cur.map((l) => (l.slug === slug ? line : l)) : [...cur, line]));
      if (had && !quiet) say(`Updated: ${distressed.hole}% hole, now ${money(distressed.price)}.`);
      await flight;
      setSpin((s) => s + 1);
      if (openDrawer) setTimeout(() => setOpen(true), reducedMotion() ? 0 : 650);
      return true;
    },
    [items, fly, say]
  );

  const remove = useCallback((slug) => setLines((cur) => cur.filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      items,
      lines,
      line: (slug) => lines.find((l) => l.slug === slug),
      count: items.length,
      subtotal: lines.reduce((t, l) => t + linePrice(l), 0),
      has: (slug) => items.includes(slug),
      add,
      remove,
      clear,
      open,
      setOpen,
      spin,
      registerIcon,
      toast,
      say
    }),
    [items, lines, add, remove, clear, open, spin, registerIcon, toast, say]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
