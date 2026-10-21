// Lazy-loaded WebGL part of the sock viewer (three + R3F + drei live in their own chunk).
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SOCK_H = 2.6;
const SOCK_W = SOCK_H * 0.8; // textures are padded to 4:5

/* Build a puffy "pillow" surface from the PNG's alpha: distance-to-edge drives depth,
   so the silhouette pinches to zero thickness and the middle bulges. */
function usePuffyGeometry(image) {
  return useMemo(() => {
    const SX = 96;
    const SY = 120;
    const c = document.createElement('canvas');
    c.width = SX;
    c.height = SY;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0, SX, SY);
    const a = g.getImageData(0, 0, SX, SY).data;
    const INF = 1e9;
    const d = new Float32Array(SX * SY);
    for (let i = 0; i < SX * SY; i++) d[i] = a[i * 4 + 3] > 110 ? INF : 0;
    // two-pass chamfer distance transform
    const at = (x, y) => (x < 0 || y < 0 || x >= SX || y >= SY ? 0 : d[y * SX + x]);
    for (let y = 0; y < SY; y++)
      for (let x = 0; x < SX; x++) {
        const i = y * SX + x;
        if (!d[i]) continue;
        d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
      }
    for (let y = SY - 1; y >= 0; y--)
      for (let x = SX - 1; x >= 0; x--) {
        const i = y * SX + x;
        if (!d[i]) continue;
        d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
      }
    const geo = new THREE.PlaneGeometry(SOCK_W, SOCK_H, SX - 1, SY - 1);
    const pos = geo.attributes.position;
    const DEPTH = 0.1;
    const SAT = 11; // samples until full puff
    for (let i = 0; i < pos.count; i++) {
      const ix = i % SX;
      const iy = (i / SX) | 0; // plane rows run top -> bottom, same as the canvas
      const dist = Math.max(0, d[iy * SX + ix] - 1);
      const t = Math.min(dist / SAT, 1);
      pos.setZ(i, DEPTH * Math.sqrt(1 - (1 - t) * (1 - t)));
    }
    geo.computeVertexNormals();
    return geo;
  }, [image]);
}

function PuffySock({ n }) {
  const tex = useLoader(THREE.TextureLoader, `/img/socks/sock-${n}-tex.webp`);
  useLayoutEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);
  const front = usePuffyGeometry(tex.image);
  const back = useMemo(() => {
    const g = front.clone();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, -p.getZ(i));
    g.computeVertexNormals();
    return g;
  }, [front]);
  return (
    <group>
      <mesh geometry={front} castShadow>
        <meshLambertMaterial map={tex} alphaTest={0.5} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={back} castShadow>
        <meshLambertMaterial map={tex} alphaTest={0.5} side={THREE.BackSide} color="#f1ebe6" />
      </mesh>
    </group>
  );
}

function GlbSock({ url }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = SOCK_H / Math.max(size.y, 1e-6);
    s.position.sub(center.multiplyScalar(k));
    s.scale.setScalar(k);
    return s;
  }, [scene]);
  return <primitive object={model} />;
}

function Rig({ ctrl, children }) {
  const group = useRef(null);
  const t0 = useRef(Math.random() * 10);
  useFrame((state, delta) => {
    const c = ctrl.current;
    const dt = Math.min(delta, 1 / 20);
    const t = (t0.current += dt);
    if (c.mode === 'scroll') {
      // scroll drives the turn; idle is a gentle sway so it never parks edge-on
      const target = c.base + c.scroll * Math.PI * 2 * c.turns + (c.reduced ? 0 : Math.sin(t * 0.45) * 0.32);
      c.angle += (target - c.angle) * Math.min(1, dt * 6);
    } else if (!c.dragging) {
      c.velocity *= Math.exp(-dt * 2.6); // inertia
      const idle = c.reduced || c.hovering ? 0 : c.autoSpeed;
      if (Math.abs(c.velocity) < Math.abs(idle)) c.velocity += (idle - c.velocity) * Math.min(1, dt * 1.5);
      c.angle += c.velocity * dt;
    }
    const g = group.current;
    if (!g) return;
    g.rotation.y = c.angle;
    const bob = c.reduced ? 0 : c.float;
    g.position.y = Math.sin(t * 1.3) * 0.06 * bob;
    g.rotation.z = Math.sin(t * 0.9) * 0.05 * bob + c.tilt;
    g.rotation.x = Math.sin(t * 0.7) * 0.04 * bob;
  });
  return <group ref={group}>{children}</group>;
}

// Keep the whole sock in frame: back the camera off when the canvas is too narrow for its width.
function Fit({ zoom }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byHeight = 6.6 / zoom;
    const byWidth = (SOCK_W * 1.12) / (0.92 * k * (size.width / Math.max(size.height, 1)));
    camera.position.z = Math.max(byHeight, byWidth);
    camera.updateProjectionMatrix();
  }, [camera, size, zoom]);
  return null;
}

function Ready({ onReady }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

export default function SockScene({ n, glb, ctrl, active, onReady, shadow = true, zoom = 1 }) {
  return (
    <Canvas
      className="sock3d__canvas"
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 6.6 / zoom], fov: 30 }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <Fit zoom={zoom} />
      {/* three's Lambert divides by π, so intensities are in π units: front faces land at ~1.0× the photo */}
      <ambientLight intensity={Math.PI * 0.76} />
      <directionalLight position={[1.2, 1.8, 5]} intensity={Math.PI * 0.3} />
      <directionalLight position={[-4, 1, -4]} intensity={Math.PI * 0.4} />
      <Suspense fallback={null}>
        <Rig ctrl={ctrl}>{glb ? <GlbSock url={glb} /> : <PuffySock n={n} />}</Rig>
        {shadow && <ContactShadows position={[0, -SOCK_H / 2 - 0.12, 0]} scale={4} blur={2.8} opacity={0.32} far={2.5} resolution={256} color="#1a0f1f" />}
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
