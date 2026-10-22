import Hero from '../sections/Hero.jsx';
import AtelierTeaser from '../sections/AtelierTeaser.jsx';
import LaundryDay from '../sections/LaundryDay.jsx';
import Missing from '../sections/Missing.jsx';
import Receipts from '../sections/Receipts.jsx';
import Seam from '../components/Seam.jsx';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';

export default function Home() {
  useTitle(null);
  return (
    <>
      <Hero />
      <AtelierTeaser />
      <Seam id="seam-film" />
      <LaundryDay />
      <Missing />
      <Receipts />
      <Seam id="seam-foot" />
    </>
  );
}
