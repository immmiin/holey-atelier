import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { holeOf } from './distress.js';

/* The product page's pull-to-set-your-price flow (desktop and phone share it): live price / hole /
   labor from the pull card, "Add to basket" only once there's a hole, and reset. */
export default function usePullBuy(product) {
  const cart = useCart();
  const card = useRef(null);
  const [hud, setHud] = useState({ price: product.price, hole: 0, laborSec: 0 });
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setHud({ price: product.price, hole: 0, laborSec: 0 });
    setAdded(false);
  }, [product.slug, product.price]);

  // the stage reports every frame: only re-render when what's shown changes
  const onHud = useCallback(
    (h) => {
      const next = { price: h.phase === 'pull' || h.phase === 'frozen' ? Math.round(h.price * 100) / 100 : product.price, hole: holeOf(h), laborSec: Math.floor(h.laborMs / 1000) };
      setHud((cur) => (cur.price === next.price && cur.hole === next.hole && cur.laborSec === next.laborSec ? cur : next));
    },
    [product.price]
  );

  const add = useCallback(async () => {
    const c = card.current;
    const distressed = c?.take();
    if (!distressed) {
      cart.say('Pull the thread first: the hole sets the price.');
      return;
    }
    setAdded(true);
    await cart.add(product.slug, c.el, { distressed });
  }, [cart, product.slug]);

  const reset = useCallback(() => {
    card.current?.reset();
    setHud({ price: product.price, hole: 0, laborSec: 0 });
    setAdded(false);
  }, [product.price]);

  return { card, hud, onHud, add, reset, added, canAdd: hud.hole > 0 && !added };
}

export const laborClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
