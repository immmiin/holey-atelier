// The entire catalogue. Six socks. No pairs.
export const products = [
  {
    slug: 'heel-yeah',
    n: 1,
    name: 'Heel Yeah',
    subtitle: 'Worn Heel X Pure Confidence',
    color: '#F2A7B5',
    accent: '#1E6B3A',
    price: 9,
    description:
      "Bubblegum pink with a green heel that has clearly been places. Walks in like it owns the room, leaves through the toe. The hole is load-bearing.",
    specs: [
      ['Pairs included', '0'],
      ['Hole size', 'Generous'],
      ['Fits', 'One foot, emotionally'],
      ['Material', '80% cotton, 20% audacity'],
      ['Care', 'Machine wash. It comes back. Mostly.']
    ]
  },
  {
    slug: 'lost-in-laundry',
    n: 2,
    name: 'Lost in Laundry',
    subtitle: 'Tumble Dry X Missing Twin',
    color: '#A9C6EE',
    accent: '#5A1F14',
    price: 9,
    description:
      "Sky blue with chocolate trim, sole survivor of a spin cycle nobody talks about. It went in as a pair. It came out as a statement.",
    specs: [
      ['Pairs included', '0 (see: laundry)'],
      ['Hole size', 'Tumble-dried'],
      ['Fits', 'Whichever foot is colder'],
      ['Last seen with', 'Its twin, 2019'],
      ['Care', 'Do not leave unattended near a dryer']
    ]
  },
  {
    slug: 'purple-reign',
    n: 3,
    name: 'Purple Reign',
    subtitle: 'Ube X Unmatched',
    color: '#D4B8EE',
    accent: '#1E2440',
    price: 9,
    description:
      "Lavender and navy. Rich where you expect it, drafty where you don't. Royalty doesn't match. Royalty doesn't have to.",
    specs: [
      ['Pairs included', '0'],
      ['Hole size', 'Regal'],
      ['Fits', 'One foot, crowned'],
      ['Title', 'Sovereign of the sock drawer'],
      ['Care', 'Cold wash, warm regard']
    ]
  },
  {
    slug: 'big-toe-energy',
    n: 4,
    name: 'Big Toe Energy',
    subtitle: 'Left Foot X Right Hole',
    color: '#F6E7A0',
    accent: '#4E7FB8',
    price: 9,
    description:
      "Butter yellow with a blue toe that has something to say, and says it through the hole. Made for your left foot. Or your right. It isn't your mother.",
    specs: [
      ['Pairs included', '0'],
      ['Hole size', 'Exactly one big toe'],
      ['Fits', 'Left foot, right hole'],
      ['Confidence', 'Unearned, fully felt'],
      ['Care', 'Hand wash. Hold its hand.']
    ]
  },
  {
    slug: 'toe-jam',
    n: 5,
    name: 'Toe Jam',
    subtitle: 'Strawberry X Stubbed Toe',
    color: '#F2EADB',
    accent: '#B3122A',
    price: 9,
    description:
      "Cream with strawberry red, like a jam jar someone stubbed their toe on. Sweet at the cuff, a little sore at the tip.",
    specs: [
      ['Pairs included', '0'],
      ['Hole size', 'Stubbed-to-fit'],
      ['Fits', 'One foot, gingerly'],
      ['Tasting notes', 'Strawberry, regret'],
      ['Care', 'Wash with reds. It already is one.']
    ]
  },
  {
    slug: 'grass-stain',
    n: 6,
    name: 'Grass Stain',
    subtitle: 'Picnic X Knee Slide',
    color: '#C9DEC1',
    accent: '#1F5B3A',
    price: 9,
    description:
      "Cream with deep green swirls, like the knees of your best jeans after a picnic that got out of hand. It won't wash out. It was never meant to.",
    specs: [
      ['Pairs included', '0'],
      ['Hole size', 'Rolled-down-a-hill'],
      ['Fits', 'One foot, outdoors'],
      ['Origin', 'A lawn, allegedly'],
      ['Care', 'Wash cold. Accept what remains.']
    ]
  }];

export const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

export const logoColor = (p) => p.logo || p.accent;

export const sockSrc = (n, w = 800) => `/img/socks/sock-${n}-${w}.webp`;
export const sockSrcSet = (n) => [400, 800, 1200].map((w) => `/img/socks/sock-${n}-${w}.webp ${w}w`).join(', ');
export const holeSrc = (n, w = 600) => `/img/socks/sock-${n}-hole-${w}.webp`;
export const holeSrcSet = (n) => [600, 1000].map((w) => `/img/socks/sock-${n}-hole-${w}.webp ${w}w`).join(', ');

export const money = (v) => `$${v.toFixed(2)}`;
