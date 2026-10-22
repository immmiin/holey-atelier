import { useEffect, useRef, useState } from 'react';
import { tap } from '../atelier/sound.ts';

const KEY = 'holey-footer-holes';
const load = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.slice(0, 200) : [];
  } catch {
    return [];
  }
};

/* The footer wordmark: every click punches a hole in it (kept for this visit). Value goes up. */
export default function HolePunchLogo() {
  const [holes, setHoles] = useState(load);
  const box = useRef(null);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(holes));
    } catch {
      /* fine */
    }
  }, [holes]);
  const punch = (e) => {
    const r = box.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const keyboard = e.detail === 0;
    setHoles((h) => [...h, keyboard ? [0.2 + Math.random() * 0.6, 0.3 + Math.random() * 0.4, Math.random()] : [x, y, Math.random()]]);
    tap();
  };
  const n = holes.length;
  return (
    <div className="punch">
      <button ref={box} type="button" className="punch__logo" onClick={punch} aria-label={`Holey logo. Click to punch a hole. ${n} so far.`}>
        <img className="foot__bubble" src="/logo/holey_05_bubble-pink.svg" alt="" width="1620" height="930" loading="lazy" />
        {holes.map(([x, y, s], i) => (
          <span key={i} className="punch__hole" style={{ left: `${x * 100}%`, top: `${y * 100}%`, '--s': 0.8 + s * 0.5, '--r': `${s * 360}deg` }} aria-hidden="true" />
        ))}
      </button>
      <p className="punch__count" aria-live="polite">
        {n > 0 ? (
          <>
            You made {n} {n === 1 ? 'hole' : 'holes'}. Value <b>+${(n / 100).toFixed(2)}</b>.
          </>
        ) : (
          'Go on. Make a hole.'
        )}
      </p>
    </div>
  );
}
