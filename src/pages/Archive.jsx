import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import BounceText from '../components/motion/BounceText.jsx';
import LaborCounter from '../components/LaborCounter.jsx';
import Piece from '../components/Piece.jsx';
import { getArchive } from '../lib/api.js';
import { SOCKS } from '../atelier/socks.ts';
import useTitle from '../lib/useTitle.js';
import './archive.css';

const CACHE = 'holey-archive-v1';
const nameOf = (slug) => SOCKS.find((s) => s.slug === slug)?.name || 'A sock';
const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
/* the Atelier's peg, so every piece hangs from the same pin */
const Peg = () => (
  <svg className="arc__peg" viewBox="0 0 26 54" aria-hidden="true">
    <rect x="3" y="2" width="20" height="50" rx="7" />
    <path d="M13 6v42" />
    <circle cx="13" cy="20" r="3.2" />
  </svg>
);

const ROPE_Y = 22; // where the rope crosses a row, from the row's top (through the pegs' grip)

/** one sagging rope per grid row, like the Atelier's line: posts on the grid's edges, and each piece
 *  dropped to the rope's height at its own x (so the ones in the middle hang lowest) */
function useRopes(grid, deps) {
  const [ropes, setRopes] = useState(null);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return undefined;
    const measure = () => {
      const cs = getComputedStyle(el);
      const x0 = parseFloat(cs.paddingLeft) + 2;
      const x1 = el.clientWidth - parseFloat(cs.paddingRight) - 2;
      if (x1 <= x0) return;
      const sag = Math.min(64, (x1 - x0) * 0.045);
      el.style.setProperty('--sag', `${sag.toFixed(1)}px`);
      const rows = new Map();
      for (const li of el.children) {
        if (!li.classList.contains('arc__item')) continue;
        if (!rows.has(li.offsetTop)) rows.set(li.offsetTop, []);
        rows.get(li.offsetTop).push(li);
        const t = (li.offsetLeft + li.offsetWidth / 2 - x0) / (x1 - x0);
        li.style.setProperty('--drop', `${(4 * sag * t * (1 - t)).toFixed(1)}px`);
      }
      setRopes({ w: el.clientWidth, h: el.scrollHeight, x0, x1, sag, ys: [...rows.keys()].map((top) => top + ROPE_Y) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return ropes;
}

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || 'null');
  } catch {
    return null;
  }
};

/* The Atelier Archive: every finished piece, re-rendered from five numbers. */
export default function Archive() {
  useTitle('The Atelier Archive');
  const [items, setItems] = useState(() => readCache()?.items || []);
  const [next, setNext] = useState(0);
  const [state, setState] = useState('loading'); // loading | ok | offline
  const busy = useRef(false);

  const load = useCallback(async (cursor) => {
    if (busy.current || cursor == null) return;
    busy.current = true;
    const page = await getArchive(cursor);
    busy.current = false;
    if (!page) {
      setState((s) => (cursor === 0 ? 'offline' : s));
      return;
    }
    setState('ok');
    setItems((cur) => {
      const merged = cursor === 0 ? page.items : [...cur, ...page.items.filter((x) => !cur.some((c) => c.serial === x.serial))];
      if (cursor === 0) {
        try {
          localStorage.setItem(CACHE, JSON.stringify({ items: page.items }));
        } catch {
          /* fine */
        }
      }
      return merged;
    });
    setNext(page.next);
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  // "Load more", not infinite scroll: phones show 8 at a time, desktop a page (24)
  const step = () => (window.matchMedia('(max-width: 767px)').matches ? 8 : 24);
  const [limit, setLimit] = useState(step);
  const more = () => {
    const nextLimit = limit + step();
    setLimit(nextLimit);
    if (nextLimit > items.length && next != null) load(next);
  };
  const shown = items.slice(0, limit);
  const grid = useRef(null);
  const skeleton = state === 'loading' && !items.length;
  const ropes = useRopes(grid, [shown.length, skeleton]);
  const hasMore = items.length > limit || next != null;

  return (
    <div className="arc">
      <header className="arc__head wrap">
        <p className="kicker">The Atelier Archive</p>
        <BounceText as="h1" immediate text={'Every piece unique.\nEvery artisan unpaid.'} className="h2 arc__title" />
        <LaborCounter className="arc__counter" />
      </header>

      {state === 'offline' && !items.length ? (
        <p className="arc__empty wrap">The Archive is out for a wash. Check back soon.</p>
      ) : (
        <>
          {state === 'offline' && <p className="arc__note wrap">Showing the last pieces we saw. The Archive is out for a wash.</p>}
          <ul ref={grid} className="arc__grid wrap" aria-busy={skeleton}>
            {ropes && (
              <li className="arc__ropes" role="presentation" aria-hidden="true">
                <svg width={ropes.w} height={ropes.h}>
                  {ropes.ys.map((y) => {
                    // a parabola through both posts dipping `sag` at the middle: control point at 2 × sag
                    const d = `M${ropes.x0} ${y} Q${(ropes.x0 + ropes.x1) / 2} ${y + 2 * ropes.sag} ${ropes.x1} ${y}`;
                    return (
                      <g key={y}>
                        <path className="arc__rope-shadow" d={d} />
                        <path className="arc__rope-line" d={d} />
                        <circle className="arc__post" cx={ropes.x0} cy={y} r="9" />
                        <circle className="arc__post" cx={ropes.x1} cy={y} r="9" />
                      </g>
                    );
                  })}
                </svg>
              </li>
            )}
            {skeleton
              ? Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className="arc__item arc__item--skel" aria-hidden="true">
                    <span className="arc__card">
                      <Peg />
                      <span className="skel skel--sock" />
                      <span className="skel skel--line" />
                      <span className="skel skel--line skel--short" />
                    </span>
                  </li>
                ))
              : shown.map((it, i) => (
                  <li key={it.serial} className="arc__item" style={{ '--tilt': `${((it.unravelSeed % 7) - 3) * 0.9}deg`, '--peg': i % 2 ? 'var(--pink)' : 'var(--hi)' }}>
                    <Link to={`/r/${it.serial}`} className="arc__card" aria-label={`${it.serial}: ${nameOf(it.sockSlug)}, ${it.holePct}% hole, labor ${clock(it.laborSec)}, $${it.price.toFixed(2)}`}>
                      <Peg />
                      <Piece slug={it.sockSlug} hole={it.holePct} w={130} h={162} />
                      <span className="arc__serial">{it.serial}</span>
                      <span className="arc__meta">
                        <span>{it.holePct}% hole</span>
                        <span>{clock(it.laborSec)}</span>
                      </span>
                      <span className="arc__price">${it.price.toFixed(2)}</span>
                    </Link>
                  </li>
                ))}
          </ul>
          <div className="arc__more wrap">
            {hasMore && items.length > 0 ? (
              <button type="button" className="arc__more-btn" onClick={more}>
                Load more pieces
              </button>
            ) : items.length > 0 ? (
              <p>That’s every piece so far.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
