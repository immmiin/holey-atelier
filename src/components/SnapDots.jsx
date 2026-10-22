import { useEffect, useState } from 'react';

/* dot indicators for a horizontal scroll-snap row (pass a ref to the scroller) */
export default function SnapDots({ scroller, count, label = 'Items' }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const onScroll = () => {
      const first = el.firstElementChild;
      const step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0') : el.clientWidth;
      setI(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / Math.max(1, step)))));
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scroller, count]);
  const go = (k) => {
    const el = scroller.current;
    const item = el?.children[k];
    if (item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).scrollPaddingLeft || '0'), behavior: 'smooth' });
  };
  return (
    <div className="snapdots" role="tablist" aria-label={label}>
      {Array.from({ length: count }, (_, k) => (
        <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`${label} ${k + 1} of ${count}`} className={k === i ? 'is-on' : ''} onClick={() => go(k)}>
          <span />
        </button>
      ))}
    </div>
  );
}
