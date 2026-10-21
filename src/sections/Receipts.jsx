import BounceText from '../components/motion/BounceText.jsx';

const receipts = [
  { no: '0417', who: 'Margot V., ceramicist', note: 'I bought one sock to see what the fuss was about. I left with one sock.', stars: 4, aside: 'fifth star lost in the wash', sock: 'Heel Yeah' },
  { no: '0522', who: 'Desmond A., tax attorney', note: 'Finally, a sock that doesn’t make me choose between left and right.', stars: 5, aside: 'would wear again, alone', sock: 'Purple Reign' },
  { no: '0611', who: 'Ines P., pilates instructor', note: 'My big toe hasn’t felt this seen since 2014.', stars: 5, aside: 'toe agrees', sock: 'Big Toe Energy' },
  { no: '0703', who: 'Theo M., record shop owner', note: 'Ordered two. They arrived separately. They haven’t spoken since.', stars: 4, aside: 'drama included', sock: 'Lost in Laundry' }
];

export default function Receipts({ title = 'Receipts.', kicker = 'Proof people did this on purpose' }) {
  return (
    <section className="rcpt" aria-labelledby="rcpt-title">
      <div className="rcpt__head wrap">
        <p className="kicker">{kicker}</p>
        <BounceText id="rcpt-title" text={title} className="h2" />
      </div>
      <ul className="rcpt__row">
        {receipts.map((r, i) => (
          <li key={r.no} className="receipt" style={{ '--tilt': `${[-3, 2, -1.5, 3][i]}deg` }}>
            <div className="receipt__paper">
            <p className="receipt__store">HOLEY STORE #001</p>
            <p className="receipt__meta">1 SOCK AVE · ORDER {r.no}</p>
            <div className="receipt__lines">
              <p>
                <span>1 × {r.sock.toUpperCase()}</span>
                <span>$9.00</span>
              </p>
              <p>
                <span>PAIRS</span>
                <span>0</span>
              </p>
              <p>
                <span>HOLE</span>
                <span>INCL.</span>
              </p>
            </div>
            <blockquote className="receipt__note">“{r.note}”</blockquote>
            <p className="receipt__stars" aria-label={`${r.stars} out of 5 stars`}>
              {'★'.repeat(r.stars)}
              <span className="receipt__lost">{'☆'.repeat(5 - r.stars)}</span>
              <span className="receipt__aside">({r.aside})</span>
            </p>
            <p className="receipt__who">— {r.who}</p>
            <span className="receipt__barcode" aria-hidden="true" />
            <p className="receipt__thanks">THANK YOU · COME BACK (ALONE)</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
