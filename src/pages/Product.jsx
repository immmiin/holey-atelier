import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import SockStage from '../components/sock3d/SockStage.jsx';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { Rotate } from '../components/Icons.jsx';
import Receipts from '../sections/Receipts.jsx';
import LineUp from '../sections/LineUp.jsx';
import NotFound from './NotFound.jsx';
import PullCard from '../atelier/PullCard.jsx';
import usePullBuy, { laborClock } from '../atelier/usePullBuy.js';
import ProductMobile from './ProductMobile.jsx';
import { bySlug, holeSrc, holeSrcSet, logoColor, money, products, sockSrc } from '../data/products.js';
import { pushAccent } from '../lib/accent.js';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';
import './pages.css';

function galleryFor(p) {
  const g = [
    { kind: 'pull', label: 'Pull' },
    { kind: '3d', label: '360°' },
    { kind: 'img', src: holeSrc(p.n, 1000), srcSet: holeSrcSet(p.n), alt: `The hole in the toe of ${p.name}, up close.`, label: 'The hole' }
  ];
  if (p.n === 1) {
    g.push(
      { kind: 'img', src: '/img/lifestyle/life-1-1000.webp', alt: 'Two feet in Heel Yeah socks, toes out.', label: 'On foot' },
      { kind: 'img', src: '/img/lifestyle/life-2-1000.webp', alt: 'A Holey-painted toenail through the hole.', label: 'Toe detail' }
    );
  }
  return g;
}

const PHONE = '(max-width: 767px)';
/** phones get their own product page layout (ProductMobile); desktop renders exactly as before */
function usePhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

export default function Product() {
  const { slug } = useParams();
  const phone = usePhone();
  const p = bySlug[slug];
  useTitle(p ? p.name : 'Not found');
  const [active, setActive] = useState(0);
  const viewer = useRef(null);
  const buy = usePullBuy(p || products[0]);

  useEffect(() => setActive(0), [slug]);
  useEffect(() => (p ? pushAccent(logoColor(p)) : undefined), [p]);

  if (!p) return <NotFound />;
  if (phone) return <ProductMobile p={p} />;
  const gallery = galleryFor(p);
  const cur = gallery[active] || gallery[0];
  const others = products.filter((x) => x.slug !== p.slug);

  return (
    <>
      <section className="pdp2" style={{ '--sock': p.color }}>
        <div className="pdp2__left">
          <div className="pdp2__hang" aria-hidden="true" />
          <div className="pdp2__viewer" ref={viewer}>
            <span className="pdp2__grommet" aria-hidden="true" />
            <div className={`pdp2__pull ${cur.kind === 'pull' ? '' : 'is-away'}`} aria-hidden={cur.kind !== 'pull' || undefined}>
              <PullCard ref={buy.card} product={p} onHud={buy.onHud} />
            </div>
            {cur.kind === 'pull' ? null : cur.kind === '3d' ? (
              <SockStage product={p} mode="drag" hint eager sizes="(min-width: 900px) 44vw, 92vw" />
            ) : (
              <motion.img
                key={cur.src}
                src={cur.src}
                srcSet={cur.srcSet}
                alt={cur.alt}
                className="pdp2__img"
                initial={{ opacity: 0, scale: 1.06, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              />
            )}
          </div>
          <div className="pdp2__thumbs" role="tablist" aria-label="Product views">
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active === i}
                className={`pdp2__thumb ${active === i ? 'is-active' : ''}`}
                style={{ '--tilt': `${[-4, 3, -2, 4, -3][i]}deg` }}
                onClick={() => setActive(i)}
              >
                <span className="pdp2__thumb-img">
                  {g.kind === 'img' ? <img src={g.src} alt="" loading="lazy" /> : <img src={sockSrc(p.n, 400)} alt="" className="is-contain" />}
                  {g.kind === '3d' && <Rotate className="pdp2__thumb-icon" />}
                  {g.kind === 'pull' && <span className="pdp2__thumb-thread" aria-hidden="true" />}
                </span>
                <span className="pdp2__thumb-label">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pdp2__info">
          <p className="pdp2__chip">{p.subtitle}</p>
          <BounceText as="h1" immediate text={p.name} className="display pdp2__title" />
          {/* emphasis runs title → price & basket → description → care label */}
          <div className="pdp2__buy">
            <div className="pdp2__pricebox">
              <p className="pdp2__price" aria-live="polite">
                {money(buy.hud.price)}
              </p>
              <p className="pdp2__hud">
                Hole {buy.hud.hole}% · Labor {laborClock(buy.hud.laborSec)} · Your wage <b>$0.00</b>
              </p>
            </div>
            <Btn className="pdp2__add" tone={buy.added ? 'paper' : 'hi'} onClick={buy.add} disabled={!buy.canAdd} aria-describedby="pdp-note">
              {buy.added ? 'In your basket ✓' : buy.hud.hole > 0 ? 'Add to basket' : 'Pull first'}
            </Btn>
          </div>
          <p id="pdp-note" className="small pdp2__note">
            {buy.added
              ? 'Yours, at the hole you made. We only have the one.'
              : buy.hud.hole > 0
                ? 'The bigger the hole, the higher the price.'
                : 'Pull the loose thread at the toe: the hole you make sets the price.'}
          </p>
          <p className="pdp2__links">
            <button type="button" className="pdp2__reset" onClick={buy.reset}>
              Reset sock
            </button>
            <Link to={`/atelier?sock=${p.slug}`} className="pdp2__atelier">
              Open in the Atelier ↗
            </Link>
          </p>
          <p className="pdp2__desc">{p.description}</p>
          <div className="pdp2__label stitched">
            <div className="pdp2__label-head">
              <h2 className="pdp2__label-title">Care label</h2>
              <p className="pdp2__label-no">{p.careNo}</p>
            </div>
            <dl>
              {p.specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
      <Receipts title="Other people’s receipts." kicker="They bought one too" />
      <LineUp items={others} title="Also hanging around." kicker="Other singles in your area" />
    </>
  );
}
