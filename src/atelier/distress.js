// What a pulled sock becomes in the basket. Shared by the Atelier and the product page's pull card,
// so both put exactly the same thing in the cart.

/** the hole as the price tag shows it: 0–99% while pulling, 100% once there's no sock left */
export const holeOf = (h) => (h.finished ? 100 : Math.min(99, Math.floor(h.p * 100)));

/** the basket line for a sock pulled on `stage` (call after stage.freeze()) */
export function distressedOf(stage, h, { serial, unravelSeed }) {
  return {
    price: Math.round(h.price * 100) / 100,
    hole: holeOf(h),
    laborMs: Math.round(h.laborMs),
    serial,
    unravelSeed,
    outline: stage.outlineImage(110, 150).toDataURL('image/png')
  };
}

export const newSerial = () => String(1000 + Math.floor(Math.random() * 9000));
export const newSeed = () => Math.floor(Math.random() * 1e6);
