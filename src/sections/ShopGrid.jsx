import { useState } from 'react';
import Btn from '../components/Btn.jsx';
import TagCard from '../components/TagCard.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { products } from '../data/products.js';
import '../pages/pages.css';

// The six socks as swing tags, ready to buy as they are (or to take to the Atelier first).
export default function ShopGrid() {
  const [hover, setHover] = useState(null);
  return (
    <section
      className="shopgrid"
      style={{ '--sec-bg': hover ? `color-mix(in srgb, ${hover.color} 40%, var(--cream))` : 'var(--cream)' }}
      aria-labelledby="shopgrid-title"
    >
      <div className="shopgrid__head wrap">
        <div>
          <p className="kicker">The collection, such as it is</p>
          <BounceText id="shopgrid-title" text="Six socks. No pairs." className="h2" />
        </div>
        <Btn to="/shop" variant="care" tilt={1.5}>
          See the whole line
        </Btn>
      </div>
      <div className="wrap">
        <ul className="pile">
          {products.map((p, i) => (
            <li key={p.slug}>
              <TagCard p={p} i={i} onHover={setHover} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
