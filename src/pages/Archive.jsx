import { useCallback, useEffect, useRef, useState } from 'react';
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
  const sentinel = useRef(null);

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

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || next == null || state !== 'ok') return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && load(next), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, state, load]);

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
          <ul className="arc__grid wrap">
            {items.map((it, i) => (
              <li key={it.serial} className="arc__item" style={{ '--tilt': `${((it.unravelSeed % 7) - 3) * 0.9}deg`, '--peg': i % 2 ? 'var(--pink)' : 'var(--hi)' }}>
                <Link to={`/r/${it.serial}`} className="arc__card" aria-label={`${it.serial}: ${nameOf(it.sockSlug)}, ${it.holePct}% hole, labor ${clock(it.laborSec)}, $${it.price.toFixed(2)}`}>
                  <span className="arc__peg" aria-hidden="true" />
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
          <div ref={sentinel} className="arc__more" aria-hidden="true">
            {next == null && items.length > 0 ? 'That’s every piece so far.' : ''}
          </div>
        </>
      )}
    </div>
  );
}
