import { useEffect, useRef } from 'react';
import './hand-cursor.css';

/* The big hand (≈56px, brand ink on cream). The Atelier drives its own (open ↔ pinching on the
   thread); this global one opens over anything marked [data-hand] — the line-ups' socks and cards —
   on fine pointers. The hole cursor stands aside there, so there's only ever one cursor. */

/** open hand: fingertips at (24, 9) */
export const OpenHand = (props) => (
  <svg viewBox="0 0 56 56" {...props}>
    <path d="M14 31V18a3.5 3.5 0 0 1 7 0v8V11a3.5 3.5 0 0 1 7 0v15V13a3.5 3.5 0 0 1 7 0v13v-9a3.5 3.5 0 0 1 7 0v17c0 10-6 17-15 17h-3c-6 0-9-3-12-8l-7-11a3.5 3.5 0 0 1 5.5-4.2Z" />
  </svg>
);
/** pinching hand: the pinch at (16, 21) */
export const PinchHand = (props) => (
  <svg viewBox="0 0 56 56" {...props}>
    <path d="M15 24a6 6 0 0 1 6-6h15a6 6 0 0 1 6 6v10c0 9-6 15-15 15h-2c-8 0-12-6-12-13Z" />
    <path d="M22 18v6M29 18v6M36 19v5" />
    <path d="M15 30c-5-1-6-8-1-10l8 1c3 .5 3 5 0 6Z" />
  </svg>
);

export default function HandCursor() {
  const el = useRef(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const hand = el.current;
    let raf = 0, last = null, on = false;
    const draw = () => {
      raf = 0;
      if (!last) return;
      hand.style.transform = `translate3d(${last.x}px, ${last.y}px, 0)`;
      hand.classList.toggle('is-on', on);
    };
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      last = { x: e.clientX, y: e.clientY };
      on = !!e.target?.closest?.('[data-hand]');
      raf ||= requestAnimationFrame(draw);
    };
    const onOut = (e) => {
      if (!e.relatedTarget) {
        on = false;
        raf ||= requestAnimationFrame(draw);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);
  return (
    <div ref={el} className="hand-cursor" aria-hidden="true">
      <OpenHand />
    </div>
  );
}
