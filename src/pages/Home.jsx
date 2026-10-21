import Hero from '../sections/Hero.jsx';
import Atelier from '../sections/Atelier.jsx';
import LaundryDay from '../sections/LaundryDay.jsx';
import CareLabel from '../sections/CareLabel.jsx';
import Missing from '../sections/Missing.jsx';
import Receipts from '../sections/Receipts.jsx';
import Tape from '../components/Tape.jsx';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';

export default function Home() {
  useTitle(null);
  return (
    <>
      <Hero />
      <Atelier />
      <LaundryDay />
      <div className="tape-cross" aria-hidden="false">
        <Tape items={['One sock only', 'Hole included', 'No pairs', 'No refunds on feelings']} tilt={-3} />
        <Tape items={['Do not pair', 'Wash with feelings', 'Left or right, who’s counting']} tone="pink" tilt={2.5} reverse speed={38} />
      </div>
      <CareLabel />
      <Missing />
      <Receipts />
    </>
  );
}
