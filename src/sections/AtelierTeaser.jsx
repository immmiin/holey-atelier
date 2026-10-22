import { useNavigate } from 'react-router';
import Clothesline from '../components/Clothesline.jsx';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { products } from '../data/products.js';

// One compact line: the socks hang still; pick one and you're in the Atelier with it.
export default function AtelierTeaser() {
  const navigate = useNavigate();
  return (
    <section className="teaser" aria-labelledby="teaser-title">
      <div className="teaser__head wrap">
        <div>
          <p className="kicker">The Atelier</p>
          <BounceText id="teaser-title" text="Pull a thread." className="h2 teaser__title" />
        </div>
        <div className="teaser__side">
          <p className="lead">Six socks. Zero pairs. Pick one, pull the loose thread at the toe. The less sock there is, the more it costs.</p>
          <Btn to="/atelier">Enter the Atelier →</Btn>
        </div>
      </div>
      <Clothesline items={products} variant="teaser" onPick={(p) => navigate(`/atelier?sock=${p.slug}`)} />
    </section>
  );
}
