import { useEffect, useState } from 'react';

const SEEN = 'holey-swiped';
const swiped = () => {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
};

/* dot indicators for a horizontal scroll-snap row (pass a ref to the scroller), plus a subtle
   "swipe →" hint until the visitor has swiped any row once */
export default function SnapDots({ scroller, count, label = 'Items' }) {
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(() => !swiped());
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    // the item whose centre is nearest the row's centre
    const onScroll = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, dist = Infinity;
      [...el.children].forEach((c, k) => {
        const d = Math.abs(c.offsetLeft - el.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < dist) (dist = d), (best = k);
      });
      setI(Math.min(count - 1, best));
      if (el.scrollLeft > 24) {
        setHint(false);
        try {
          localStorage.setItem(SEEN, '1');
        } catch {
          /* fine */
        }
      }
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scroller, count]);
  const go = (k) => {
    const el = scroller.current;
    const item = el?.children[k];
    if (item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft - (el.clientWidth - item.offsetWidth) / 2, behavior: 'smooth' });
  };
  return (
    <div className="snapdots" role="tablist" aria-label={label}>
      {Array.from({ length: count }, (_, k) => (
        <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`${label} ${k + 1} of ${count}`} className={k === i ? 'is-on' : ''} onClick={() => go(k)}>
          <span />
        </button>
      ))}
      {hint && (
        <span className="snaphint" aria-hidden="true">
          swipe →
        </span>
      )}
    </div>
  );
}
