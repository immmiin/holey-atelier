/** Feel parameters. Exposed in the ?tune panel so they can be dialled in by hand. */
export const tune = {
  /** a full unravel takes roughly this many pulls of `pullLen` px (at desktop scale) */
  pulls: 15,
  pullLen: 350,
  /** multiplies the stick threshold (how hard a stitch holds before it pops) */
  stiffness: 1,
  /** multiplies the yarn thickness (1 = one rib of the photo at the current scale) */
  yarn: 1,
  /** unravel row height in photo px (the photo gauge is ~5.5 px per rib) */
  rowH: 8,
  /** heap silhouette area at 100% as a fraction of the sock silhouette area */
  heapRatio: 0.48,
};

export type Tune = typeof tune;

/** knit gauge measured from the photos: one rib ≈ 5.5 px at native size */
export const GAUGE_IMG = 5.5;
