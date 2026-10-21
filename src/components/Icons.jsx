const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false };

export const ArrowRight = (p) => (
  <svg viewBox="0 0 30 16" {...base} {...p}>
    <path d="M1 8h27M21 1.5 28 8l-7 6.5" />
  </svg>
);

export const ArrowLong = (p) => (
  <svg viewBox="0 0 34 20" {...base} {...p}>
    <path d="M1 10h31M23.5 1.5 32 10l-8.5 8.5" />
  </svg>
);

export const Search = (p) => (
  <svg viewBox="0 0 16 16" {...base} {...p}>
    <circle cx="7" cy="7" r="4.6" />
    <path d="m10.5 10.5 3.6 3.6" />
  </svg>
);

export const Bag = (p) => (
  <svg viewBox="0 0 16 16" {...base} {...p}>
    <rect x="2.2" y="4.6" width="11.6" height="9.4" rx="2" />
    <path d="M5.4 6.4V4.4a2.6 2.6 0 0 1 5.2 0v2" />
  </svg>
);

export const Plus = (p) => (
  <svg viewBox="0 0 14 14" {...base} {...p}>
    <path d="M7 1v12M1 7h12" />
  </svg>
);

export const Minus = (p) => (
  <svg viewBox="0 0 14 14" {...base} {...p}>
    <path d="M1 7h12" />
  </svg>
);

export const Close = (p) => (
  <svg viewBox="0 0 14 14" {...base} {...p}>
    <path d="m2 2 10 10M12 2 2 12" />
  </svg>
);

export const Instagram = (p) => (
  <svg viewBox="0 0 18 18" {...base} {...p}>
    <rect x="2" y="2" width="14" height="14" rx="4.2" />
    <circle cx="9" cy="9" r="3.3" />
    <circle cx="13.2" cy="4.9" r=".6" fill="currentColor" stroke="none" />
  </svg>
);

export const TikTok = (p) => (
  <svg viewBox="0 0 18 18" {...base} {...p}>
    <path d="M10.2 2v9.6a2.9 2.9 0 1 1-2.9-2.9M10.2 2c.3 2.2 1.7 3.6 3.9 3.8" />
  </svg>
);

export const XLogo = (p) => (
  <svg viewBox="0 0 18 18" {...base} {...p}>
    <path d="M3 3l12 12M15 3 3 15" />
  </svg>
);

export const Rotate = (p) => (
  <svg viewBox="0 0 20 20" {...base} {...p}>
    <path d="M3.5 10a6.5 6.5 0 0 1 11.3-4.4M16.5 10a6.5 6.5 0 0 1-11.3 4.4" />
    <path d="M15.2 2.6v3.3h-3.3M4.8 17.4v-3.3h3.3" />
  </svg>
);
