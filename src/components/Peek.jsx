import { useEffect, useRef, useState } from 'react';
import './peek.css';

const HINT = 'holey-peek-seen';
const seen = () => {
  try {
    return localStorage.getItem(HINT) === '1';
  } catch {
    return true;
  }
};
function markSeen() {
  try {
    if (localStorage.getItem(HINT) === '1') return;
    localStorage.setItem(HINT, '1');
  } catch {
    /* fine */
  }
  window.dispatchEvent(new Event('holey-peek'));
}

/* A hotspot: the hole cursor becomes a lens onto a hidden layer (`alt`). Mouse: hover.
   Touch: press and hold (without moving) to look through. */
export default function Peek({ as: Tag = 'div', alt, r = 70, className = '', altClassName = '', children, ...rest }) {
  const ref = useRef(null);
  const altRef = useRef(null);

  useEffect(() => {
    const el = ref.current, layer = altRef.current;
    if (!el || !layer) return undefined;
    let target = 0, cur = 0, x = 0, y = 0, raf = 0, hold = 0, start = null;
    const paint = () => (layer.style.clipPath = `circle(${cur.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`);
    const tick = () => {
      cur += (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.4) {
        cur = target;
        raf = 0;
      } else raf = requestAnimationFrame(tick);
      paint();
    };
    const kick = () => !raf && (raf = requestAnimationFrame(tick));
    const pos = (e) => {
      const b = el.getBoundingClientRect();
      x = e.clientX - b.left;
      y = e.clientY - b.top;
    };
    const open = () => {
      target = r;
      kick();
      markSeen();
    };
    const close = () => {
      target = 0;
      kick();
    };
    const enter = (e) => e.pointerType === 'mouse' && (pos(e), open());
    const move = (e) => {
      if (e.pointerType !== 'mouse' && start && !cur && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
        clearTimeout(hold);
        start = null;
      }
      if (e.pointerType === 'mouse' || cur > 0) {
        pos(e);
        if (!raf) paint();
      }
    };
    const leave = (e) => e.pointerType === 'mouse' && close();
    const down = (e) => {
      if (e.pointerType === 'mouse') return;
      pos(e);
      start = { x: e.clientX, y: e.clientY };
      clearTimeout(hold);
      hold = setTimeout(open, 280);
    };
    const up = (e) => {
      if (e.pointerType === 'mouse') return;
      clearTimeout(hold);
      start = null;
      close();
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hold);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [r]);

  return (
    <Tag ref={ref} className={`peek ${className}`} data-peek={r} {...rest}>
      {children}
      <span ref={altRef} className={`peek__alt ${altClassName}`} aria-hidden="true">
        {alt}
      </span>
    </Tag>
  );
}

/** a one-time nudge to look through the hole */
export function PeekHint({ className = '' }) {
  const [show, setShow] = useState(() => !seen());
  useEffect(() => {
    const off = () => setShow(false);
    window.addEventListener('holey-peek', off);
    return () => window.removeEventListener('holey-peek', off);
  }, []);
  if (!show) return null;
  return (
    <span className={`peek-hint ${className}`} role="note">
      <span className="peek-hint__hole" aria-hidden="true" />
      peek through the hole
    </span>
  );
}
