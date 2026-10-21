import { useParams } from 'react-router';
import NotFound from './NotFound.jsx';
import useTitle from '../lib/useTitle.js';
import './pages.css';

const pages = {
  terms: {
    title: 'Terms of Wear',
    items: [
      'By purchasing a Holey sock you acknowledge you are purchasing one (1) sock.',
      'The hole is intentional. Complaints about the hole will be forwarded to the hole.',
      'Holey is not responsible for cold toes, warm feelings, or strangers asking “where’s the other one?”',
      'Wearing the sock on your hand is permitted but not endorsed.',
      'This is a fictional brand made for a graphic design school project. No socks were sold in the making of this website.'
    ]
  },
  privacy: {
    title: 'Privacy (Toes Excluded)',
    items: [
      'Your basket lives in your own browser. It never leaves. Much like a sock in a dryer, it just stays there.',
      'We don’t collect payment details, because there is no payment.',
      'Your toes are visible through the hole. That’s on you.',
      'Newsletter sign-ups go nowhere. It’s a front-end demo. Your inbox is safe.'
    ]
  },
  returns: {
    title: 'Returns & Feelings',
    items: [
      'Socks may be returned within 30 days, unworn, with the hole intact.',
      'We cannot accept returns of a second sock you found at the back of the drawer. We’re happy for you, though.',
      'Feelings are non-refundable.',
      'Exchanges are available for a different single sock. Never for a pair.'
    ]
  }
};

export default function Legal() {
  const { page } = useParams();
  const doc = pages[page];
  useTitle(doc ? doc.title : 'Not found');
  if (!doc) return <NotFound />;
  return (
    <section className="legal2 wrap">
      <div className="legal2__paper card-ink stitched">
        <p className="kicker">Legal-ish · Last updated whenever we lost another sock</p>
        <h1 className="h2">{doc.title}</h1>
        <ol>
          {doc.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
