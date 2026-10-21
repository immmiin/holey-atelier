import Accordion from '../components/Accordion.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import Pop from '../components/motion/Pop.jsx';
import Btn from '../components/Btn.jsx';
import useTitle from '../lib/useTitle.js';
import './pages.css';

const faqs = [
  { title: 'Where’s the other one?', body: 'We don’t know. Nobody knows. That’s sort of the whole thing.' },
  { title: 'Is the hole extra?', body: 'No. The hole is included in the price. Removing it would cost extra, and we won’t do it.' },
  { title: 'Can I buy two?', body: 'You can. They won’t match.' },
  { title: 'Which foot is it for?', body: 'Yes.' },
  { title: 'Do you sell pairs?', body: 'We sell one sock, twice, if you insist. See above re: matching.' },
  { title: 'What size is it?', body: 'One size fits one foot. Most feet qualify.' },
  { title: 'Will the hole get bigger?', body: 'Only if you believe in yourself.' },
  { title: 'Is it machine washable?', body: 'Yes. Cold, gentle, with a little faith. We can’t promise it comes back. Historically, one of them doesn’t.' },
  { title: 'Can I return it?', body: 'You can return the sock within 30 days. You can’t return the feeling of having owned one sock. Nobody can.' },
  { title: 'How does shipping work?', body: 'Free, worldwide, alone. It travels in a padded envelope sized for exactly one sock, with a note that says “sorry.”' },
  { title: 'Why is the quantity locked at one?', body: 'It’s one sock.' }
];

export default function Faq() {
  useTitle('FAQ');
  return (
    <section className="faq2 wrap">
      <div className="faq2__side">
        <p className="kicker">Frequently asked, rarely answered</p>
        <BounceText as="h1" immediate text={'Questions,\nwith holes\nin them.'} className="display faq2__title" />
        <Pop className="faq2__sticker" rotate={-10}>
          <img src="/logo/holey_07_nail-icon-H-exclaim.svg" alt="" width="1200" height="930" />
        </Pop>
        <p className="lead">Still confused? That’s fair.</p>
        <Btn to="/contact" variant="care">
          Ask us anyway
        </Btn>
      </div>
      <div className="faq2__list">
        <Accordion items={faqs} />
      </div>
    </section>
  );
}
