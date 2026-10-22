import Hero from '../sections/Hero.jsx';
import AtelierTeaser from '../sections/AtelierTeaser.jsx';
import LaundryDay from '../sections/LaundryDay.jsx';
import Missing from '../sections/Missing.jsx';
import Receipts from '../sections/Receipts.jsx';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';

export default function Home() {
  useTitle(null);
  return (
    <>
      <Hero />
      <AtelierTeaser />
      <LaundryDay />
      <Missing />
      <Receipts />
    </>
  );
}
