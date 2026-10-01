import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { isTouchDevice } from '../game/input';

export const LOW_QUALITY = typeof window !== 'undefined' && isTouchDevice() && Math.min(window.innerWidth, window.innerHeight) < 820;

export type Target = { x: number; y: number; z: number };

export function Lights({ target, size = 42 }: { target?: React.MutableRefObject<Target>; size?: number }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const configured = useRef(false);
  useFrame(() => {
    if (!light.current) return;
    if (!configured.current) {
      configured.current = true;
      const c = light.current.shadow.camera;
      c.left = -size;
      c.right = size;
      c.top = size;
      c.bottom = -size;
      c.near = 5;
      c.far = 120;
      c.updateProjectionMatrix();
    }
    const t = target?.current ?? { x: 0, y: 0, z: 0 };
    light.current.position.set(t.x + 18, 34, t.z + 14);
    tgt.position.set(t.x, 0, t.z);
    tgt.updateMatrixWorld();
  });
  return (
    <>
      <hemisphereLight args={['#dff3ff', '#7a8f5a', 0.75]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={light}
        castShadow
        intensity={2.4}
        color="#fff4e0"
        target={tgt}
        shadow-mapSize={LOW_QUALITY ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={5}
        shadow-camera-far={120}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
      />
      <primitive object={tgt} />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.6} position={[0, 10, -8]} scale={[12, 6, 1]} color="#fff6e6" />
        <Lightformer intensity={0.8} position={[-10, 6, 4]} scale={[6, 6, 1]} color="#cfe8ff" />
        <Lightformer intensity={0.6} position={[10, 4, 6]} scale={[6, 3, 1]} color="#ffe3c9" />
        <Lightformer intensity={0.4} position={[0, -5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 20, 1]} color="#86b36a" />
      </Environment>
    </>
  );
}

export function Effects({ ao = true }: { ao?: boolean }) {
  if (LOW_QUALITY) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom luminanceThreshold={1.0} intensity={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.55} />
      </EffectComposer>
    );
  }
  if (!ao) {
    return (
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <Bloom luminanceThreshold={0.95} intensity={0.55} mipmapBlur radius={0.6} />
        <Vignette eskil={false} offset={0.25} darkness={0.4} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={1.5} halfRes quality="performance" color="#1a1430" />
      <Bloom luminanceThreshold={0.95} intensity={0.55} mipmapBlur radius={0.6} />
      <Vignette eskil={false} offset={0.25} darkness={0.5} />
    </EffectComposer>
  );
}

export const canvasProps = {
  shadows: { type: THREE.PCFSoftShadowMap } as const,
  dpr: (LOW_QUALITY ? [1, 1.5] : [1, 2]) as [number, number],
  gl: { antialias: true, powerPreference: 'high-performance' as const, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 },
};
