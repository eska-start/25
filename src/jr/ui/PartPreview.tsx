import { memo, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ItemMesh } from '../three/Parts';
import { localBounds } from '../three/materials';
import { GRADE_COLOR, ITEMS } from '../data/items';

function RotatingPart({ itemId }: { itemId: string }) {
  const turntable = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!model.current) return;
    const bounds = localBounds(model.current);
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.01);
    model.current.position.set(-center.x, -center.y, -center.z);
    turntable.current?.scale.setScalar(1.16 / span);
  }, [itemId]);
  useFrame((state, delta) => {
    if (!turntable.current) return;
    turntable.current.rotation.y += Math.min(delta, 0.05) * 0.85;
    turntable.current.rotation.x = -0.16 + Math.sin(state.clock.elapsedTime * 1.3) * 0.07;
  });
  return <group ref={turntable} rotation={[-0.16, 0.45, 0]}><group ref={model}><ItemMesh itemId={itemId} /></group></group>;
}

/** Rotating preview of the same 3D mesh used on the arena floor and assembled vehicle. */
export const PartPreview = memo(function PartPreview({ itemId, className = '' }: { itemId: string; className?: string }) {
  const def = ITEMS[itemId];
  const host = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  // Mount a WebGL context only while the thumbnail is in its scroll viewport.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  if (!def) return null;
  return <span ref={host} className={`jr-model-preview ${className}`} style={{ '--part-accent': GRADE_COLOR[def.grade] } as React.CSSProperties} aria-hidden="true">
    {visible ? <Canvas
      orthographic
      camera={{ position: [2.6, 2.2, 3.6], zoom: 28, near: 0.1, far: 20 }}
      dpr={1}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<span className="jr-preview-fallback" style={{ background: def.color }} />}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff5dc" />
        <directionalLight position={[-3, 2, -3]} intensity={0.6} color="#b1d9ef" />
        <RotatingPart itemId={itemId} />
      </Suspense>
    </Canvas> : <span className="jr-preview-loading" />}
  </span>;
});