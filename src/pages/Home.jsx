import Hero from '../sections/Hero.jsx';
import AtelierTeaser from '../sections/AtelierTeaser.jsx';
import LaundryDay from '../sections/LaundryDay.jsx';
import ShopGrid from '../sections/ShopGrid.jsx';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';

export default function Home() {
  useTitle(null);
  return (
    <>
      <Hero />
      <AtelierTeaser />
      <LaundryDay />
      <ShopGrid />
    </>
  );
}
