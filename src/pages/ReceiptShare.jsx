import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Btn from '../components/Btn.jsx';
import Piece from '../components/Piece.jsx';
import ReceiptPrint from '../atelier/ReceiptPrint.tsx';
import { sockModel } from '../atelier/models.ts';
import { outlineFor } from '../atelier/silhouette.ts';
import { SOCKS } from '../atelier/socks.ts';
import { getEntry } from '../lib/api.js';
import useTitle from '../lib/useTitle.js';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '../atelier/atelier.css';
import './checkout.css';
import './archive.css';

const lastOrder = () => {
  try {
    return JSON.parse(sessionStorage.getItem('holey-last-order-v2') || 'null');
  } catch {
    return null;
  }
};

/* /r/HOL-1234: one piece from the Archive — its receipt, its payslip, the sock as it was left. */
export default function ReceiptShare() {
  const { serial } = useParams();
  useTitle(serial);
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      const e = await getEntry(serial);
      if (!alive) return;
      if (!e) {
        // offline, but it might be your own receipt
        const mine = lastOrder();
        if (mine?.id === serial) return setState({ phase: 'ok', order: mine, entry: null });
        return setState({ phase: 'missing' });
      }
      const def = SOCKS.find((s) => s.slug === e.sockSlug);
      const m = await sockModel(def.id);
      if (!alive) return;
      const order = {
        id: e.serial,
        date: new Date(e.t || Date.now()).toISOString(),
        lines: [
          {
            slug: e.sockSlug,
            n: def.id,
            name: def.name,
            base: 9,
            price: e.price,
            hole: e.holePct,
            laborMs: e.laborSec * 1000,
            outline: outlineFor(m, e.holePct).toDataURL('image/png')
          }
        ]
      };
      setState({ phase: 'ok', order, entry: e });
    })();
    return () => {
      alive = false;
    };
  }, [serial]);

  if (state.phase === 'loading') return <section className="cko cko--printed" aria-busy="true" />;

  if (state.phase === 'missing')
    return (
      <section className="cko cko--printed">
        <div className="cko__head">
          <p className="kicker">{serial}</p>
          <h1 className="h2">This receipt is still in the wash.</h1>
          <p className="lead">It may not exist, or the Archive is out for a moment. Try again soon.</p>
        </div>
        <div className="share__ctas">
          <Btn to="/atelier">Pull your own →</Btn>
          <Btn to="/archive" variant="care" tilt={1.5}>
            See the Archive
          </Btn>
        </div>
      </section>
    );

  const { order, entry } = state;
  const slug = entry?.sockSlug || order.lines[0]?.slug;
  return (
    <section className="cko cko--printed share">
      <div className="cko__head">
        <p className="kicker">The Atelier Archive · {order.id}</p>
        <h1 className="h2">Hand-distressed by You.</h1>
      </div>
      <div className="share__grid">
        {slug && (
          <figure className="share__piece">
            <Piece slug={slug} hole={order.lines[0]?.hole ?? 0} w={240} h={300} label={`What is left of the sock: ${order.lines[0]?.hole ?? 0}% hole.`} />
            <figcaption>{order.lines[0]?.hole ?? 0}% hole · sold</figcaption>
            <Btn to={`/atelier${slug ? `?sock=${slug}` : ''}`}>Pull your own →</Btn>
          </figure>
        )}
        <ReceiptPrint order={order} instant link={`${location.origin}/r/${order.id}`} onArchive={() => navigate('/archive')} onBack={() => navigate('/atelier')} />
      </div>
    </section>
  );
}
