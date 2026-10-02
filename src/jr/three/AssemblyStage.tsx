import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { emptyBuild, itemsMap, type CarBuild, type InvItem, type Slot } from '../store';
import { Car, computeLayout } from './Car';
import { Character, newMotion } from './Character';
import { ItemMesh } from './Parts';
import { Lights, Effects, canvasProps } from './Stage';
import { Mat } from './materials';
import { sfx } from '../game/audio';

interface FlyingPart { uid: number; itemId: string; slot?: Slot; wheel?: number; target: THREE.Vector3 }
function Assembly({ inventory, build, characterId, color, onReady }: {
  inventory: InvItem[]; build: CarBuild; characterId: string; color: string; onReady: () => void;
}) {
  const items = useMemo(() => itemsMap(inventory), [inventory]);
  const [partial, setPartial] = useState(emptyBuild);
  const started = useRef<number | null>(null), done = useRef(false);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const attached = useRef(new Set<number>());
  const motion = useRef(newMotion());
  const flight = useMemo(() => {
    const layout = computeLayout(build, items), d = layout.def;
    const mounts: Record<Slot, [number, number, number]> = {
      body: [0, 0.75, 0], engine: [0, 1.2, -0.8], booster: [0, 0.8, -1.4],
      frontBumper: [0, 0.4, 1.5], rearBumper: [0, 0.4, -1.5], spoiler: [0, 1.4, -1.1],
      exhaust: [0.65, 0.6, -1.4], antenna: [-0.6, 1.5, -0.3], deco: [0.8, 0.8, 0.3],
      brush: [0, 0.5, -1.9], gun: [0, 1.6, 0.4],
    };
    return inventory.map((item, i): FlyingPart => {
      const slot = (Object.keys(build.slots) as Slot[]).find((s) => build.slots[s] === item.uid);
      const wi = build.wheels.indexOf(item.uid);
      let target: THREE.Vector3;
      if (wi >= 0) target = new THREE.Vector3((wi % 2 ? 1 : -1) * (d?.wheelX ?? 1), 0.45, (wi < 2 ? 1 : -1) * (d?.wheelZ ?? 0.9));
      else if (slot) target = new THREE.Vector3(...mounts[slot]);
      else target = new THREE.Vector3(Math.cos(i * 2.3) * 2.6, 0.3, Math.sin(i * 2.3) * 2.6);
      target.x += 1;
      return { ...item, slot, wheel: wi >= 0 ? wi : undefined, target };
    }).sort((a, b) => (a.slot === 'body' ? -10 : a.wheel !== undefined ? -5 : 0) - (b.slot === 'body' ? -10 : b.wheel !== undefined ? -5 : 0));
  }, [build, inventory, items]);
  useEffect(() => { if (done.current) setPartial(build); }, [build]);
  useFrame((s) => {
    if (started.current === null) started.current = s.clock.elapsedTime;
    const elapsed = s.clock.elapsedTime - started.current;
    if (done.current) return;
    flight.forEach((part, i) => {
      const g = groups.current[i]; if (!g) return;
      const t = Math.max(0, Math.min(1, (elapsed - i * 0.055 - 0.15) / 0.58));
      const from = new THREE.Vector3(-2.25, 2.05 + (flight.length - 1 - i) * 0.15, -0.35);
      const ease = t * t * (3 - 2 * t);
      g.position.copy(from).lerp(part.target, ease);
      g.position.y += Math.sin(t * Math.PI) * 1.0;
      g.rotation.set(t * 2, t * Math.PI * 2 + i * 0.8, Math.sin(t * Math.PI) * 0.25);
      g.scale.setScalar((0.32 + i % 3 * 0.035) * (1 - t * 0.9));
      if (t >= 1 && !attached.current.has(part.uid)) {
        attached.current.add(part.uid); g.visible = false;
        setPartial((old) => {
          const next = { slots: { ...old.slots }, wheels: [...old.wheels] };
          if (part.slot) next.slots[part.slot] = part.uid;
          if (part.wheel !== undefined) next.wheels[part.wheel] = part.uid;
          return next;
        });
        sfx.click();
      }
    });
    if (elapsed > Math.max(1.3, flight.length * 0.055 + 0.8)) {
      done.current = true; setPartial(build); onReady(); sfx.clank();
    }
  });
  return <>
    <group position={[-2.25, 0, -0.35]} rotation={[0, 0.3, 0]}><Character characterId={characterId} motion={motion} jersey={color} scale={0.95} /></group>
    <group position={[1, 0, 0]}><Car build={partial} items={items} characterId={characterId} preview noDriver /></group>
    {flight.map((part, i) => <group key={part.uid} ref={(g) => { groups.current[i] = g; }}><ItemMesh itemId={part.itemId} /></group>)}
  </>;
}
export function AssemblyStage({ inventory, build, characterId, color, onReady }: {
  inventory: InvItem[]; build: CarBuild; characterId: string; color: string; onReady: () => void;
}) {
  return <Canvas {...canvasProps} camera={{ position: [5.5, 4.3, 8], fov: 38 }}>
    <color attach="background" args={['#a3c8b5']} /><fog attach="fog" args={['#a3c8b5', 20, 45]} />
    <Suspense fallback={null}>
      <Lights size={12} />
      <Assembly inventory={inventory} build={build} characterId={characterId} color={color} onReady={onReady} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[70, 70]} /><Mat color="#eadbb8" kind="matte" /></mesh>
      <ContactShadows position={[0, 0.01, 0]} scale={14} opacity={0.3} blur={3} far={4} frames={1} />
      <Effects ao={false} />
    </Suspense>
    <OrbitControls target={[0.3, 1.1, 0]} enableZoom={false} enablePan={false} minPolarAngle={0.55} maxPolarAngle={1.35} />
  </Canvas>;
}