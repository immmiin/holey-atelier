import { useState } from 'react';
import Clothesline from '../components/Clothesline.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import Btn from '../components/Btn.jsx';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

// The product grid, replaced: socks pegged on a sagging line. Hovering one floods the section with its colour.
export default function LineUp({ items, title = "Today's line-up.", kicker = 'Freshly washed, individually', cta = true }) {
  const [hover, setHover] = useState(null);
  return (
    <section className="line-sec" style={{ '--sec-bg': hover ? `color-mix(in srgb, ${hover.color} 55%, var(--cream))` : 'var(--cream)' }} aria-labelledby="line-title">
      <div className="line-sec__head wrap">
        <div>
          <p className="kicker">{kicker}</p>
          <BounceText id="line-title" text={title} className="h2" />
        </div>
        <div>
          <p className="lead">
            {WORDS[items.length] || items.length} {items.length === 1 ? 'sock' : 'socks'}. Zero pairs. Brush past to make them swing — or grab one and give it a tug.
          </p>
          <p className="line-sec__hint" aria-hidden="true">
            ↔ swipe the line · ↕ pull a sock
          </p>
        </div>
      </div>
      <Clothesline items={items} onHover={setHover} />
      {cta && (
        <div className="line-sec__cta">
          <Btn to="/shop" tone="pink" tilt={1.5}>
            See the whole line
          </Btn>
        </div>
      )}
    </section>
  );
}
