import { useRef } from 'react';
import { Link } from 'react-router';
import SnapDots from '../components/SnapDots.jsx';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import Pop from '../components/motion/Pop.jsx';
import Tape from '../components/Tape.jsx';
import { products, sockSrc } from '../data/products.js';
import useTitle from '../lib/useTitle.js';
import './pages.css';

const tenets = [
  ['We lost the other one.', 'Everybody has. Somewhere, a dryer is full of them. We stopped pretending it was coming back and built a company around the one that stayed.', 'var(--hi)'],
  ['The hole is the point.', 'Not a defect, a feature. Every hole is made by hand, on purpose, at the toe, where it gets the most attention. It lets your big toe say what it came to say.', 'var(--pink)'],
  ['Pairs are a construct.', 'Two feet, sure. Nobody said they had to agree. Wear it on the left. Wear it on the right. Wear it on your hand during a hard phone call.', 'var(--paper)'],
  ['Premium is a feeling.', 'One sock, $9, heavyweight cotton, a knit pattern we spent too long on, and packaging that treats it like jewellery. Very serious about being ridiculous.', '#cfe6d6']
];

export default function About() {
  const sockRow = useRef(null);
  useTitle('About');
  return (
    <div className="about">
      <section className="about__hero wrap">
        <p className="kicker">Manifesto</p>
        <BounceText as="h1" immediate text={'One sock.\nOn purpose.'} className="display about__title" />
        <p className="lead about__lead">
          Holey started the way most sock drawers end: with one sock and no explanation. We decided that was enough. More than enough, actually.
        </p>
        <Pop className="about__sticker" rotate={12}>
          <img src="/logo/holey_02_bubble.svg" alt="" width="2880" height="1710" />
        </Pop>
      </section>

      <section className="notes wrap" aria-label="What we believe">
        {tenets.map(([h, b, bg], i) => (
          <article key={h} className="note" style={{ '--bg': bg, '--tilt': `${[-2.5, 2, 1.5, -2][i]}deg` }}>
            <span className="tape" style={{ top: -14, left: '50%', translate: '-50% 0', rotate: `${[-6, 4, -3, 7][i]}deg` }} />
            <span className="note__n">{i + 1}</span>
            <h2 className="h3">{h}</h2>
            <p>{b}</p>
          </article>
        ))}
      </section>

      <Tape items={['Worn in, not worn out', 'Left foot energy', 'The other one is fine, probably']} tone="green" tilt={-1.5} />

      <h2 className="h2 badges__title mobile-only">Holey, by the numbers.</h2>
      <section className="badges wrap" aria-label="Holey in numbers">
        {[
          ['1', 'sock per order'],
          ['0', 'pairs, ever'],
          ['1', 'hole, by hand'],
          [String(products.length), 'ways to be incomplete']
        ].map(([n, l], i) => (
          <div key={l} className="badge" style={{ '--bg': ['var(--hi)', 'var(--pink)', 'var(--paper)', '#cfe6d6'][i], '--tilt': `${[-8, 6, -4, 9][i]}deg` }}>
            <span className="badge__n">{n}</span>
            <span className="badge__l">{l}</span>
          </div>
        ))}
      </section>

      <section className="about__line wrap" aria-label="The six socks">
        <ul ref={sockRow} className="about__socks snaprow">
          {products.map((p, i) => (
            <li key={p.slug} className="about__sock" style={{ '--sock': p.color, '--tilt': `${[-4, 3, -2, 4, -3, 2][i]}deg` }}>
              <Link to={`/socks/${p.slug}`}>
                <img src={sockSrc(p.n, 400)} alt={`${p.name}: one sock, hole included.`} width="400" height="500" loading="lazy" />
                <span>{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <SnapDots scroller={sockRow} count={products.length} label="Sock" />
        <div className="about__cta card-ink">
          <p className="h3">Ready to commit to one?</p>
          <Btn to="/shop">Shop the sock</Btn>
        </div>
      </section>
    </div>
  );
}
