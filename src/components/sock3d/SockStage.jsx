import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sockSrc, sockSrcSet } from '../../data/products.js';
import { gsap, ScrollTrigger, reducedMotion } from '../../lib/scroll.js';
import { Rotate } from '../Icons.jsx';
import { hasModel, modelUrl } from './modelCheck.js';
import './sock3d.css';

const SockScene = lazy(() => import('./SockScene.jsx'));

const webglOk = (() => {
  let ok;
  return () => {
    if (ok !== undefined) return ok;
    try {
      const c = document.createElement('canvas');
      ok = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      ok = false;
    }
    return ok;
  };
})();

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * A sock you can look at from every angle.
 * mode="drag"   — drag to rotate with inertia, idle auto-rotate, hover pauses (PDP)
 * mode="scroll" — rotation follows scroll progress of `trigger` (home hero / spin section)
 * Uses /models/sock-N.glb when present, otherwise a puffy PNG mesh. The PNG poster is
 * shown until WebGL is ready, and stays as the fallback if WebGL isn't available.
 */
export default function SockStage({
  product,
  mode = 'drag',
  trigger,
  scrollStart = 'top bottom',
  scrollEnd = 'bottom top',
  turns = 1,
  base = -0.35,
  float = 1,
  tilt = 0,
  zoom = 1,
  shadow = true,
  eager = false,
  hint = false,
  className = '',
  sizes = '(min-width: 750px) 40vw, 90vw'
}) {
  const el = useRef(null);
  const ctrl = useRef({
    mode,
    angle: base,
    base,
    velocity: 0,
    autoSpeed: 0.45,
    dragging: false,
    hovering: false,
    scroll: 0,
    turns,
    float,
    tilt,
    reduced: false
  });
  const [inView, setInView] = useState(false);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [glb, setGlb] = useState(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    Object.assign(ctrl.current, { mode, turns, float, tilt, base, reduced: reducedMotion() });
  }, [mode, turns, float, tilt, base]);

  // visibility drives both lazy mounting and the render loop
  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '200px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || mount || !webglOk()) return undefined;
    let cancelled = false;
    const go = () =>
      hasModel(product.n).then((yes) => {
        if (cancelled) return;
        setGlb(yes ? modelUrl(product.n) : null);
        setMount(true);
      });
    // let the page paint first — the 3D chunk is not on the critical path
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    const id = eager ? (go(), 0) : idle(go, { timeout: 1200 });
    return () => {
      cancelled = true;
      if (id) cancelIdle(id);
    };
  }, [inView, mount, product.n, eager]);

  // switching product (PDP → PDP) remounts the scene
  useEffect(() => {
    setReady(false);
    setMount(false);
    ctrl.current.angle = base;
    ctrl.current.velocity = 0;
  }, [product.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll-linked rotation
  useLayoutEffect(() => {
    if (mode !== 'scroll') return undefined;
    const trig = trigger?.current || el.current;
    const st = ScrollTrigger.create({
      trigger: trig,
      start: scrollStart,
      end: scrollEnd,
      onUpdate: (self) => {
        ctrl.current.scroll = self.progress;
      }
    });
    return () => st.kill();
  }, [mode, trigger, scrollStart, scrollEnd]);

  // drag with inertia
  const last = useRef({ x: 0, t: 0 });
  const onPointerDown = useCallback(
    (e) => {
      if (mode !== 'drag' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const c = ctrl.current;
      c.dragging = true;
      c.velocity = 0;
      last.current = { x: e.clientX, t: performance.now() };
      setTouched(true);
    },
    [mode]
  );
  const onPointerMove = useCallback((e) => {
    const c = ctrl.current;
    if (!c.dragging) return;
    const now = performance.now();
    const dx = e.clientX - last.current.x;
    const dt = Math.max(1, now - last.current.t) / 1000;
    const width = el.current?.clientWidth || 500;
    const dA = (dx / width) * Math.PI * 1.6;
    c.angle += dA;
    c.velocity = gsap.utils.clamp(-14, 14, c.velocity * 0.3 + (dA / dt) * 0.7);
    last.current = { x: e.clientX, t: now };
  }, []);
  const endDrag = useCallback((e) => {
    const c = ctrl.current;
    if (!c.dragging) return;
    c.dragging = false;
    // a pause before release means no fling
    if (performance.now() - last.current.t > 90) c.velocity = 0;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);
  const onKeyDown = useCallback(
    (e) => {
      if (mode !== 'drag') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        ctrl.current.velocity += e.key === 'ArrowLeft' ? -3 : 3;
        setTouched(true);
      }
    },
    [mode]
  );

  const drag = mode === 'drag';

  return (
    <div
      ref={el}
      className={`sock3d ${drag ? 'sock3d--drag' : ''} ${ready ? 'is-ready' : ''} ${className}`}
      style={{ '--zoom': zoom }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={(e) => e.pointerType === 'mouse' && (ctrl.current.hovering = true)}
      onPointerLeave={(e) => {
        ctrl.current.hovering = false;
        endDrag(e);
      }}
      onKeyDown={onKeyDown}
      tabIndex={drag ? 0 : undefined}
      role={drag ? 'img' : undefined}
      aria-label={drag ? `${product.name} sock in 3D. Drag, or use the left and right arrow keys, to rotate.` : undefined}
    >
      <img
        className="sock3d__poster"
        src={sockSrc(product.n, 800)}
        srcSet={sockSrcSet(product.n)}
        sizes={sizes}
        alt={drag ? '' : `${product.name} sock`}
        width="800"
        height="1000"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        draggable="false"
      />
      {mount && (
        <Boundary>
          <Suspense fallback={null}>
            <SockScene
              key={product.n}
              n={product.n}
              glb={glb}
              ctrl={ctrl}
              active={inView}
              shadow={shadow}
              zoom={zoom}
              onReady={() => setReady(true)}
            />
          </Suspense>
        </Boundary>
      )}
      {drag && hint && (
        <span className={`sock3d__hint small ${touched ? 'is-hidden' : ''}`} aria-hidden="true">
          <Rotate /> Drag to rotate
        </span>
      )}
    </div>
  );
}
