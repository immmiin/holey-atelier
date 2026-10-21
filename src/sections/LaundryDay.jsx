import { useCallback, useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../lib/scroll.js';

const SRC = '/video/holey-laundry-day-1920x1080';
const POSTER = '/video/holey-laundry-day-poster';
const posterSet = `${POSTER}-960.webp 960w, ${POSTER}-1920.webp 1920w`;

// Full-width brand intro. Sources attach only once the section is on screen; it plays only
// while visible; reduced motion gets the poster alone. The poster <img> stays on top until
// the video actually fires `playing`, so a blocked autoplay never shows an empty box.
export default function LaundryDay() {
  const box = useRef(null);
  const video = useRef(null);
  const [still] = useState(reducedMotion);
  const [load, setLoad] = useState(false);
  const [started, setStarted] = useState(false); // first `playing` event seen
  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false); // autoplay refused (iOS Low Power Mode etc.)
  const userPaused = useRef(false);
  const visible = useRef(false);

  // iOS only autoplays when the *attribute* `muted` is present; React sets the property only.
  const muteHard = (v) => {
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
  };

  const tryPlay = useCallback(() => {
    const v = video.current;
    if (!v || userPaused.current) return;
    muteHard(v);
    const p = v.play();
    if (p && p.catch) {
      p.then(() => setBlocked(false)).catch((err) => {
        // AbortError = interrupted by a newer load()/pause(); not a refusal
        if (err?.name !== 'AbortError') setBlocked(true);
      });
    }
  }, []);

  // sources were just attached: make the element pick them up
  useEffect(() => {
    const v = video.current;
    if (!load || !v) return;
    muteHard(v);
    v.load();
    if (visible.current) tryPlay();
  }, [load, tryPlay]);

  useEffect(() => {
    if (still) return undefined;
    const el = box.current;
    // threshold > 0: an edge merely touching the viewport counts as "intersecting"
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting && e.intersectionRatio >= 0.25;
        if (e.isIntersecting) setLoad(true);
        const v = video.current;
        if (!v) return;
        if (visible.current) tryPlay();
        else v.pause();
      },
      { threshold: [0.01, 0.25] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still, tryPlay]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      if (!load) setLoad(true);
      tryPlay();
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  const posterImg = (cls, eager = false) => (
    <img
      className={cls}
      src={`${POSTER}-1920.webp`}
      srcSet={posterSet}
      sizes="100vw"
      alt={still ? 'Holey wordmark in cream on Holey green.' : ''}
      width="1920"
      height="1080"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );

  return (
    <section ref={box} className="laundry" aria-label="Laundry Day — the Holey brand intro">
      {still ? (
        posterImg('laundry__media')
      ) : (
        <>
          <video
            ref={(el) => {
              video.current = el;
              if (el) muteHard(el);
            }}
            className="laundry__media"
            poster={`${POSTER}-1920.webp`}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            aria-label="Laundry Day: a short animated Holey brand intro. No sound."
            onCanPlay={(e) => !visible.current && e.currentTarget.pause()}
            onPlaying={() => {
              setStarted(true);
              setBlocked(false);
              setPaused(false);
            }}
            onPause={() => setPaused(true)}
          >
            {load && (
              <>
                {/* MP4 first: iOS Safari picks the first playable source */}
                <source src={`${SRC}.mp4`} type="video/mp4" />
                <source src={`${SRC}.webm`} type="video/webm" />
              </>
            )}
          </video>
          {/* poster on top until the first frame is actually playing */}
          <div className={`laundry__poster ${started ? 'is-hidden' : ''}`} aria-hidden={started || undefined}>
            {posterImg('laundry__media')}
          </div>
          {blocked && !started ? (
            <button type="button" className="laundry__tap" onClick={toggle}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              </svg>
              Tap to play
            </button>
          ) : (
            // not native controls — just a way to stop moving content (WCAG 2.2.2)
            started && (
              <button type="button" className="laundry__pause" onClick={toggle} aria-label={paused ? 'Play the intro video' : 'Pause the intro video'}>
                {paused ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" /></svg>
                )}
              </button>
            )
          )}
        </>
      )}
    </section>
  );
}
