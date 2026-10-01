import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { CarBuild } from '../store';
import { Character, newMotion } from './Character';
import { Car } from './Car';
import { Effects, canvasProps } from './Stage';
import { Mat, makeTexture, woodTexture } from './materials';
import { CardboardBox, Pencil, PetBottle } from './Props';
import { PaintCan, BigBrush, SoftBox, WorkshopSign } from './Workshop';
import { Unsupported3D } from '../ui/GameBoundary';

function ShowroomCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const distance = Math.max(11.5, 11 / Math.max(0.55, aspect));
    camera.position.set(distance * 0.22, distance * 0.34, distance);
    camera.lookAt(0, 1.3, 0);
  }, [camera, size.width, size.height]);
  return null;
}
function ShowroomModels({ characterId, build, items, color }: { characterId: string; build: CarBuild; items: Record<number, string>; color: string }) {
  const car = useRef<THREE.Group>(null), character = useRef<THREE.Group>(null);
  const motion = useRef(newMotion());
  useFrame((s, dt) => {
    if (car.current) car.current.rotation.y += Math.min(dt, 0.05) * 0.18;
    if (character.current) {
      const t = s.clock.elapsedTime;
      character.current.rotation.y = 0.25 + Math.sin(t * 0.42) * 0.13;
    }
  });
  return <>
    {/* The standing original character and the empty car have independent anchors. */}
    <group ref={character} position={[-2.55, 0.04, -0.6]}>
      <Character key={characterId} characterId={characterId} motion={motion} scale={1.65} jersey={color} />
    </group>
    <group position={[1.6, 0.04, 1.0]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.48, 2.51, 64]} /><meshBasicMaterial color="#88bca9" transparent opacity={0.65} />
      </mesh>
      <group ref={car} rotation={[0, -0.65, 0]} scale={1.08}>
        <Car build={build} items={items} characterId={characterId} preview noDriver />
      </group>
    </group>
  </>;
}
function Diorama() {
  const wood = useMemo(() => woodTexture(3), []);
  const pegboard = useMemo(() => makeTexture((g, s) => {
    g.fillStyle = '#607d70'; g.fillRect(0, 0, s, s);
    for (let y = 12; y < s; y += 24) for (let x = 12; x < s; x += 24) {
      g.fillStyle = '#405c50'; g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#829c88'; g.beginPath(); g.arc(x, y + 2, 1, 0, Math.PI * 2); g.fill();
    }
  }, 256, 5), []);
  const lamp = useRef<THREE.Group>(null);
  useFrame((s) => { if (lamp.current) lamp.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.65) * 0.025; });
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[55, 55]} /><meshStandardMaterial map={wood} roughness={0.75} /></mesh>
    <SoftBox position={[0, -0.5, 0]} size={[30, 1, 25]} color="#a88459" radius={0.3} />
    <mesh position={[0, 8, -13]}><planeGeometry args={[60, 26]} /><meshStandardMaterial map={pegboard} roughness={0.9} /></mesh>
    <SoftBox position={[0, 5.5, -11]} size={[24, 0.55, 2.8]} color="#c3976b" />
    <SoftBox position={[0, 10.5, -11]} size={[24, 0.55, 2.8]} color="#c3976b" />
    {[-9, -3, 3, 9].map((x, i) => <group key={x} position={[x, 6, -11]}>
      <PaintCan position={[0, 0, 0]} color={['#c98d78', '#92baa4', '#94a9bb', '#d8bd7d'][i]} scale={0.9} number={`0${i + 1}`} />
    </group>)}
    <WorkshopSign text="THE LITTLE GARAGE" position={[0, 9.3, -12.4]} width={13} sub="COLLECT. BUILD. COLOR EVERYTHING." />
    <PaintCan position={[-7, 0, -6]} color="#de9d80" scale={1.35} number="01" />
    <PaintCan position={[7, 0, -5]} color="#81bca8" scale={1.6} number="02" />
    <PaintCan position={[10, 0, 2]} color="#9ab8c0" scale={1.25} number="03" />
    <PetBottle position={[-10, 0, -6]} scale={0.8} tint="#bddbcc" cap="#6d9c84" />
    <CardboardBox position={[6, 0, -10]} size={[3, 2.8, 2.5]} rotation={[0, 0.18, 0]} open />
    <BigBrush position={[-9, 2.7, 1]} rotation={[0.4, 0.8, 1.05]} scale={0.85} />
    <Pencil position={[6, 0.35, 5.5]} rotation={[0, 0.45, Math.PI / 2]} length={8} color="#d9aa5d" />
    <SoftBox position={[-6, 0.8, -8]} size={[5, 1.6, 2.5]} color="#be7665" radius={0.3} />
    <SoftBox position={[-6, 1.75, -8]} size={[4.7, 0.35, 2.3]} color="#e6bb89" />
    {[[-1.8, 1.8, -6], [0.4, 0.5, -6.5], [3.7, 0.7, -7]].map((p, i) => <group key={i}>
      <SoftBox position={p as [number, number, number]} size={[1.4, 1.2, 1.4]} color={['#d9b568', '#85bca8', '#b8898a'][i]} radius={0.15} />
    </group>)}
    <group ref={lamp} position={[-3, 11, 1]}>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.025, 0.025, 6, 8]} /><Mat color="#213f3a" kind="metal" /></mesh>
      <mesh><coneGeometry args={[1.1, 0.9, 24, 1, true]} /><Mat color="#325a4e" kind="metal" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.24, 0]}><sphereGeometry args={[0.16, 12, 10]} /><meshBasicMaterial color="#fff1cf" toneMapped={false} /></mesh>
    </group>
  </group>;
}
export function MenuShowroom({ characterId, build, items, color = '#f56a87' }: { characterId: string; build: CarBuild; items: Record<number, string>; color?: string }) {
  return <Canvas {...canvasProps} fallback={<Unsupported3D />} camera={{ position: [2.4, 4.5, 12], fov: 39, near: 0.2, far: 100 }}>
    <color attach="background" args={['#4c7264']} /><fog attach="fog" args={['#4c7264', 18, 48]} />
    <Suspense fallback={null}>
      <ShowroomCamera />
      <ambientLight intensity={0.3} /><hemisphereLight args={['#f9f1dd', '#597566', 0.8]} />
      <directionalLight position={[-3, 12, 8]} color="#fff0d3" intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.03}>
        <orthographicCamera attach="shadow-camera" args={[-13, 13, 13, -13, 1, 45]} />
      </directionalLight>
      <directionalLight position={[8, 8, -3]} color="#b9e4d5" intensity={1.1} />
      <Environment resolution={64} frames={1}>
        <Lightformer position={[0, 9, 5]} scale={[10, 8, 1]} intensity={1.7} color="#fff2d4" />
        <Lightformer position={[8, 4, -4]} scale={[8, 8, 1]} intensity={0.8} color="#a9d5c3" />
      </Environment>
      <Diorama />
      <ShowroomModels characterId={characterId} build={build} items={items} color={color} />
      <ContactShadows position={[0, 0.015, 0]} opacity={0.36} scale={18} blur={2.6} far={4} resolution={512} color="#294035" frames={1} />
      <Effects ao={false} />
    </Suspense>
  </Canvas>;
}