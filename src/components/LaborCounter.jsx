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
export default function LaborCounter({ className = '' }) {
  const [target, setTarget] = useState(cachedStats);
  const [shown, setShown] = useState(cachedStats);
  const raf = useRef(0);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      const s = await getStats();
      if (alive && s) setTarget(s);
    };
    pull();
    const id = setInterval(pull, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // ease the numbers towards the latest values
  useEffect(() => {
    if (!target) return undefined;
    if (reducedMotion() || !shown) {
      setShown(target);
      return undefined;
    }
    const from = shown;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      const e = 1 - Math.pow(1 - k, 3);
      setShown({
        ...target,
        totalLaborSec: from.totalLaborSec + (target.totalLaborSec - from.totalLaborSec) * e,
        brandRevenue: from.brandRevenue + (target.brandRevenue - from.brandRevenue) * e
      });
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  return (
    <p className={`labor ${className}`} aria-live="off" aria-label={`Collective labor ${fmtLabor(shown.totalLaborSec)}. Wages paid $0.00. Brand revenue ${fmtMoney(shown.brandRevenue)}.`}>
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
