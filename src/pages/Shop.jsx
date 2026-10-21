import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Clothesline from '../components/Clothesline.jsx';
import TagCard from '../components/TagCard.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { products } from '../data/products.js';
import useTitle from '../lib/useTitle.js';
import './pages.css';

// by the colour of each sock's swoosh
const filters = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'warm', label: 'Warm', test: (p) => [1, 4, 5].includes(p.n) },
  { id: 'cool', label: 'Cool', test: (p) => [2, 3, 6].includes(p.n) }
];
const sorts = [
  { id: 'line', label: 'Line order', fn: (a, b) => a.n - b.n },
  { id: 'az', label: 'A → Z', fn: (a, b) => a.name.localeCompare(b.name) },
  { id: 'za', label: 'Z → A', fn: (a, b) => b.name.localeCompare(a.name) },
  { id: 'price', label: 'Price (all $9)', fn: (a, b) => a.price - b.price || b.n - a.n }
];

export default function Shop() {
  useTitle('Shop');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('line');
  const [hover, setHover] = useState(null);
  const list = products.filter(filters.find((f) => f.id === filter).test).sort(sorts.find((s) => s.id === sort).fn);

  return (
    <div className="shop" style={{ '--sec-bg': hover ? `color-mix(in srgb, ${hover.color} 50%, var(--cream))` : 'var(--cream)' }}>
      <header className="shop__head wrap">
        <div>
          <p className="kicker">The collection, such as it is</p>
          <BounceText as="h1" immediate text="The whole line." className="display shop__title" />
        </div>
        <div className="shop__tools">
          <div className="chips" role="group" aria-label="Filter socks">
            {filters.map((f, i) => (
              <button
                key={f.id}
                type="button"
                className={`chip ${filter === f.id ? 'is-on' : ''}`}
                style={{ '--tilt': `${[-3, 2, -1.5][i]}deg` }}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="chip chip--select">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {sorts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <p className="shop__count" aria-live="polite">
            {list.length} {list.length === 1 ? 'sock' : 'socks'} · 0 pairs
          </p>
        </div>
      </header>

      <section className="shop__line" aria-label="Socks on the line">
        <Clothesline key={filter} items={list} onHover={setHover} />
      </section>

      <section className="shop__pile wrap" aria-labelledby="pile-title">
        <h2 id="pile-title" className="h3">The laundry pile</h2>
        <motion.ul className="pile" layout>
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0, y: -40, rotate: -8 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              >
                <TagCard p={p} i={i} onHover={setHover} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </section>
    </div>
  );
}
