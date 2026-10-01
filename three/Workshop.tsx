import { useMemo } from 'react';
import * as THREE from 'three';
import { Mat, makeTexture, roundedBox } from './materials';

export function SoftBox({ size, color, position = [0, 0, 0], rotation = [0, 0, 0], radius = 0.15, metal = false }: {
  size: [number, number, number]; color: string; position?: [number, number, number];
  rotation?: [number, number, number]; radius?: number; metal?: boolean;
}) {
  const geo = useMemo(() => roundedBox(...size, radius, 3), [size[0], size[1], size[2], radius]);
  return <mesh geometry={geo} position={position} rotation={rotation} castShadow receiveShadow><Mat color={color} kind={metal ? 'metal' : 'plastic'} /></mesh>;
}

export function PaintCan({ position, color = '#f56a87', scale = 1, number = '01' }: {
  position: [number, number, number]; color?: string; scale?: number; number?: string;
}) {
  const tex = useMemo(() => makeTexture((g, s) => {
    g.fillStyle = '#f8f2dc'; g.fillRect(0, 0, s, s);
    g.fillStyle = color; g.fillRect(0, s * 0.63, s, s * 0.37);
    g.fillStyle = '#203b3b'; g.textAlign = 'center'; g.font = `900 ${s * 0.12}px sans-serif`;
    g.fillText('LITTLE', s / 2, s * 0.2); g.fillText('BIG COLOR', s / 2, s * 0.34);
    g.font = `900 ${s * 0.06}px sans-serif`; g.fillText('MADE FOR SMALL ADVENTURES', s / 2, s * 0.5);
    g.fillStyle = '#fff9e8'; g.font = `900 ${s * 0.17}px sans-serif`; g.fillText(number, s / 2, s * 0.85);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = color; g.beginPath(); g.arc(i * 37 % s, s * 0.6, s * 0.008 + i % 4, 0, Math.PI * 2); g.fill();
    }
  }, 256), [color, number]);
  return <group position={position} scale={scale}>
    <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.45, 1.35, 3.1, 36]} /><meshStandardMaterial map={tex} roughness={0.58} metalness={0.12} />
    </mesh>
    {[0.1, 3.13].map((y) => <mesh key={y} position={[0, y, 0]} castShadow>
      <cylinderGeometry args={[1.5, 1.5, 0.18, 36]} /><Mat color="#bcc6c1" kind="metal" />
    </mesh>)}
    <mesh position={[0, 3.25, 0]}><cylinderGeometry args={[1.25, 1.25, 0.05, 36]} /><Mat color={color} kind="plastic" /></mesh>
    <mesh position={[0, 2.35, 0]} rotation={[0, 0, 0]}>
      <torusGeometry args={[1.45, 0.065, 8, 32, Math.PI]} /><Mat color="#bbc3bf" kind="metal" />
    </mesh>
    <mesh position={[0, 3.73, 0]}><capsuleGeometry args={[0.12, 0.55, 4, 10]} /><Mat color="#384b46" kind="rubber" /></mesh>
  </group>;
}

export function BigBrush({ position, rotation = [0, 0, 0], scale = 1, color = '#f9b46d' }: {
  position: [number, number, number]; rotation?: [number, number, number]; scale?: number; color?: string;
}) {
  return <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 4, 0]} castShadow><cylinderGeometry args={[0.4, 0.62, 8, 16]} /><Mat color={color} kind="matte" /></mesh>
    <SoftBox size={[2.0, 2.1, 0.8]} position={[0, -0.8, 0]} color="#b8c1ba" metal />
    <SoftBox size={[2.15, 2.5, 0.72]} position={[0, -3, 0]} color="#d5b78d" radius={0.2} />
    {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[(i - 4.5) * 0.2, -3.2, 0.37]}>
      <boxGeometry args={[0.024, 2, 0.02]} /><Mat color={i % 2 ? '#b19775' : '#edd7b5'} kind="matte" />
    </mesh>)}
    <SoftBox size={[2.1, 0.9, 0.75]} position={[0, -3.85, 0]} color="#50ccb6" radius={0.18} />
  </group>;
}

export function WorkshopSign({ text, position, width = 12, sub = 'SMALL RACERS. BIG COLOR.' }: {
  text: string; position: [number, number, number]; width?: number; sub?: string;
}) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#203936'; g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = '#bad9c7'; g.lineWidth = 8; g.strokeRect(14, 14, 996, 228);
    g.fillStyle = '#fff2d7'; g.textAlign = 'center'; g.font = '900 85px sans-serif'; g.fillText(text, 512, 134);
    g.fillStyle = '#9bcbb8'; g.font = '500 25px sans-serif'; g.fillText(sub, 512, 198);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text, sub]);
  return <mesh position={position} castShadow><boxGeometry args={[width, width / 4, 0.16]} /><meshStandardMaterial map={texture} roughness={0.8} /></mesh>;
}