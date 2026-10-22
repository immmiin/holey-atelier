import { useNavigate } from 'react-router';
import Clothesline from '../components/Clothesline.jsx';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import LaborCounter from '../components/LaborCounter.jsx';
import { products } from '../data/products.js';

// The only place the socks hang on the home page: "+" buys one as it is ($9); clicking a sock
// takes it to the Atelier to be distressed.
export default function AtelierTeaser() {
  const navigate = useNavigate();
  return (
    <section className="teaser" id="line" aria-labelledby="teaser-title">
      <div className="teaser__head wrap">
        <div>
          <p className="kicker">Today’s line-up · the Atelier</p>
          <BounceText id="teaser-title" text="Pull a thread." className="h2 teaser__title" />
        </div>
        <div className="teaser__side">
          <p className="lead">Tap “+” to buy one as it is. Or take it down and pull the loose thread: the less sock, the higher the price.</p>
          <Btn to="/atelier">Enter the Atelier →</Btn>
        </div>
      </div>
      <div className="wrap teaser__line">
        <Clothesline items={products} variant="teaser" onPick={(p) => navigate(`/atelier?sock=${p.slug}`)} />
      </div>
      <div className="wrap teaser__foot">
        <LaborCounter className="teaser__counter" />
      </div>
    </section>
  );
}
