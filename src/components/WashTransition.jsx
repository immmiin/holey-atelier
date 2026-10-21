import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { reducedMotion } from '../lib/scroll.js';
import './wash.css';

const BUBBLES = Array.from({ length: 18 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { left: 8 + r(1) * 84, top: 10 + r(2) * 80, size: 14 + r(3) * 46, delay: r(4) * 0.5 };
});

/**
 * phase: 'idle' | 'cover' | 'reveal'
 * cover  → door irises shut while the drum spins, then onCovered()
 * reveal → door irises open on the new page, then onRevealed()
 */
export default function WashTransition({ phase, onCovered, onRevealed }) {
  const root = useRef(null);
  const drum = useRef(null);
  const ring = useRef(null);
  const angle = useRef(0);

  useEffect(() => {
    const el = root.current;
    if (!el || phase === 'idle') return undefined;
    let cancelled = false;
    const still = reducedMotion();

    const run = async () => {
      if (still) {
        el.style.clipPath = 'none';
        if (phase === 'cover') {
          await animate(el, { opacity: [0, 1] }, { duration: 0.18 }).finished;
          if (!cancelled) onCovered();
        } else {
          await animate(el, { opacity: [1, 0] }, { duration: 0.22 }).finished;
          if (!cancelled) onRevealed();
        }
        return;
      }
      el.style.opacity = '1';
      // circle(75%) is relative to the viewport diagonal / √2 — size the gasket to match
      const d = (Math.hypot(window.innerWidth, window.innerHeight) / Math.SQRT2) * 0.75 * 2;
      Object.assign(ring.current.style, { width: `${d}px`, height: `${d}px`, margin: `${-d / 2}px 0 0 ${-d / 2}px` });
      const from = angle.current;
      const to = from + (phase === 'cover' ? 220 : 260);
      angle.current = to;
      const dur = phase === 'cover' ? 0.62 : 0.7;
      const ease = phase === 'cover' ? [0.55, 0, 0.45, 1] : [0.5, 0, 0.3, 1];
      const clip = phase === 'cover' ? ['circle(0% at 50% 50%)', 'circle(75% at 50% 50%)'] : ['circle(75% at 50% 50%)', 'circle(0% at 50% 50%)'];
      const ringScale = phase === 'cover' ? [0, 1] : [1, 0];
      await Promise.all([
        animate(el, { clipPath: clip }, { duration: dur, ease }).finished,
        animate(drum.current, { rotate: [from, to] }, { duration: dur + 0.1, ease: 'easeInOut' }).finished,
        animate(ring.current, { scale: ringScale }, { duration: dur, ease }).finished
      ]);
      if (cancelled) return;
      if (phase === 'cover') onCovered();
      else {
        el.style.opacity = '0';
        onRevealed();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`wash ${phase !== 'idle' ? 'is-active' : ''}`} aria-hidden="true">
      <div ref={root} className="wash__door" style={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}>
        <div ref={drum} className="wash__drum">
          <svg className="wash__holes" viewBox="0 0 200 200">
            {[30, 52, 74, 96].map((r, k) => (
              <circle key={r} cx="100" cy="100" r={r} strokeDasharray={`${1.2 + k * 0.4} ${5 + k * 2}`} />
            ))}
          </svg>
          <img className="wash__logo" src="/logo/holey_03_nail-icon-H.svg" alt="" width="1110" height="1260" />
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className="wash__bubble"
              style={{ left: `${b.left}%`, top: `${b.top}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s` }}
            />
          ))}
        </div>
        <span className="wash__glare" />
      </div>
      <div ref={ring} className="wash__ring" style={{ transform: 'scale(0)' }} />
    </div>
  );
}
