import { useEffect, useRef, useState } from 'react';
import { cachedStats, getStats } from '../lib/api.js';
import { reducedMotion } from '../lib/scroll.js';
import './labor-counter.css';

const fmtLabor = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(Math.floor(sec % 60)).padStart(2, '0')}s`;
};
const fmtMoney = (v) => `$${Math.round(v).toLocaleString('en-US')}`;

/* "Collective labor 14h 32m · Wages paid $0.00 · Brand revenue $1,284" — ticks up smoothly,
   shows the last known numbers if the Archive can't be reached, and hides if it never could. */
const ZERO = { totalLaborSec: 0, totalOrders: 0, brandRevenue: 0, wagesPaid: 0 };

export default function LaborCounter({ className = '' }) {
  // every page load counts up from zero: the live numbers (or the last ones we saw) are the target
  const [target, setTarget] = useState(cachedStats);
  const [shown, setShown] = useState(ZERO);
  const [seen, setSeen] = useState(false);
  const [lost, setLost] = useState(false); // the Archive never answered and nothing is cached
  const el = useRef(null);
  const raf = useRef(0);
  const at = useRef(ZERO); // what's on screen right now, for the next tween to start from

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const s = await getStats();
      if (!alive) return;
      if (s) setTarget(s);
      else setLost(true);
    };
    pull();
    const id = setInterval(() => !document.hidden && pull(), 20000);
    const onShow = () => !document.hidden && pull();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);

  // start counting once the counter is on screen, so the count-up is actually seen
  useEffect(() => {
    const node = el.current;
    if (!node || typeof IntersectionObserver === 'undefined') return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.4 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // ease the numbers towards the latest values
  useEffect(() => {
    if (!target || !seen) return undefined;
    if (reducedMotion()) {
      at.current = target;
      setShown(target);
      return undefined;
    }
    const from = at.current;
    const t0 = performance.now();
    const dur = from === ZERO ? 1800 : 1000;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const now = {
        ...target,
        totalLaborSec: from.totalLaborSec + (target.totalLaborSec - from.totalLaborSec) * e,
        brandRevenue: from.brandRevenue + (target.brandRevenue - from.brandRevenue) * e
      };
      at.current = k < 1 ? now : target;
      setShown(at.current);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, seen]);

  if (lost && !target) return null;
  return (
    <p ref={el} className={`labor ${className}`} aria-live="off" aria-label={`Collective labor ${fmtLabor(shown.totalLaborSec)}. Wages paid $0.00. Brand revenue ${fmtMoney(shown.brandRevenue)}.`}>
      <span className="labor__dot" aria-hidden="true" />
      <span>
        Collective labor <b>{fmtLabor(shown.totalLaborSec)}</b>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        Wages paid <b className="labor__wage">$0.00</b>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        Brand revenue <b>{fmtMoney(shown.brandRevenue)}</b>
      </span>
    </p>
  );
}
