import BounceText from '../components/motion/BounceText.jsx';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './receipts.css';

const receipts = [
  { no: '0417', who: 'Margot V., ceramicist', note: 'I bought one sock to see what the fuss was about. I left with one sock.', stars: 4, aside: 'fifth star lost in the wash', sock: 'Heel Yeah', hole: 12 },
  { no: '0522', who: 'Desmond A., tax attorney', note: 'Finally, a sock that doesn’t make me choose between left and right.', stars: 5, aside: 'would wear again, alone', sock: 'Purple Reign', hole: 0 },
  { no: '0611', who: 'Ines P., pilates instructor', note: 'My big toe hasn’t felt this seen since 2014.', stars: 5, aside: 'toe agrees', sock: 'Big Toe Energy', hole: 64 },
  { no: '0703', who: 'Theo M., record shop owner', note: 'Ordered two. They arrived separately. They haven’t spoken since.', stars: 4, aside: 'drama included', sock: 'Lost in Laundry', hole: 31 }
];

function Line({ l, r, red }) {
  return (
    <p className={`rv__line ${red ? 'is-red' : ''}`}>
      <span>{l}</span>
      <i aria-hidden="true" />
      <span>{r}</span>
    </p>
  );
}

// Reviews, printed like the Atelier receipt you get at checkout.
export default function Receipts({ title = 'Receipts.', kicker = 'Proof people did this on purpose' }) {
  return (
    <section className="rv" aria-labelledby="rv-title">
      <div className="rv__head wrap">
        <p className="kicker">{kicker}</p>
        <BounceText id="rv-title" text={title} className="h2" />
      </div>
      <ul className="rv__row wrap">
        {receipts.map((r, i) => (
          <li key={r.no} className="rv__item" style={{ '--tilt': `${[-2.5, 1.8, -1.2, 2.4][i]}deg` }}>
            <article className="rv__paper">
              <p className="rv__house">Atelier Holey</p>
              <p className="rv__meta">
                <span>Order HOL-{r.no}</span>
                <span>Artisan: {r.hole ? 'them' : '—'}</span>
              </p>
              <hr />
              <Line l={`1 × ${r.sock}`} r="$9.00" />
              {r.hole > 0 && <Line l={`Hand-distressing ${r.hole}%`} r="incl." />}
              <Line l="Pairs" r="0" />
              <Line l="Artisan wage" r="$0.00" red />
              <hr />
              <blockquote className="rv__note">“{r.note}”</blockquote>
              <p className="rv__stars" aria-label={`${r.stars} out of 5 stars`}>
                {'★'.repeat(r.stars)}
                <span className="rv__lost">{'☆'.repeat(5 - r.stars)}</span>
              </p>
              <p className="rv__aside">({r.aside})</p>
              <p className="rv__who">— {r.who}</p>
              <span className="rv__barcode" aria-hidden="true" />
              <p className="rv__foot">No refunds on feelings.</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
