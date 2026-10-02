import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { Mat, bend, dent, deform, noisy, roundedBox, taper } from './materials';

// ─── Body definitions (dimensions + mount points) ──────────────────
export interface BodyDef {
  w: number;
  h: number;
  l: number;
  seat: [number, number, number];
  wheelX: number;
  wheelZ: number;
  clearance: number; // body bottom above axle line
}

export const BODIES: Record<string, BodyDef> = {
  can: { w: 1.5, h: 1.5, l: 2.6, seat: [0, 1.4, -0.15], wheelX: 0.95, wheelZ: 0.85, clearance: 0.1 },
  tub: { w: 1.9, h: 0.95, l: 2.8, seat: [0, 0.35, -0.1], wheelX: 1.15, wheelZ: 0.95, clearance: 0.12 },
  brick: { w: 1.7, h: 0.8, l: 2.9, seat: [0, 0.78, -0.15], wheelX: 1.05, wheelZ: 1.0, clearance: 0.12 },
  matchbox: { w: 1.7, h: 0.7, l: 2.6, seat: [0, 0.45, -0.35], wheelX: 1.05, wheelZ: 0.85, clearance: 0.15 },
  soap: { w: 1.6, h: 0.85, l: 2.7, seat: [0, 0.8, -0.1], wheelX: 1.0, wheelZ: 0.9, clearance: 0.12 },
  teabox: { w: 1.5, h: 1.0, l: 2.2, seat: [0, 0.95, -0.1], wheelX: 0.92, wheelZ: 0.78, clearance: 0.12 },
  sardine: { w: 1.85, h: 0.5, l: 2.9, seat: [0, 0.5, -0.2], wheelX: 1.12, wheelZ: 1.0, clearance: 0.1 },
  lunchbox: { w: 1.8, h: 1.15, l: 2.75, seat: [0, 1.1, -0.15], wheelX: 1.1, wheelZ: 0.95, clearance: 0.13 },
  thermos: { w: 1.25, h: 1.25, l: 3.1, seat: [0, 1.2, -0.25], wheelX: 0.9, wheelZ: 1.0, clearance: 0.1 },
  dishboat: { w: 1.75, h: 0.7, l: 3.0, seat: [0, 0.6, -0.15], wheelX: 1.05, wheelZ: 1.0, clearance: 0.11 },
};

export function Tape({ position, rotation = [0, 0, 0], size = [0.5, 0.02, 0.18], color = '#e8d9a8' }: { position: [number, number, number]; rotation?: [number, number, number]; size?: [number, number, number]; color?: string }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <Mat color={color} kind="matte" opacity={0.92} transparent />
    </mesh>
  );
}

// ─── Wheels ──────────────────────────────────────────────────────
export function Wheel({ itemId, spinRef, side = 1 }: { itemId: string; spinRef?: React.MutableRefObject<number>; side?: number }) {
  const def = ITEMS[itemId];
  const r = def.radius ?? 0.4;
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current && spinRef) ref.current.rotation.y = (-spinRef.current / r) * side;
  });
  const capGeo = useMemo(() => {
    if (itemId !== 'cap') return null;
    const g = new THREE.CylinderGeometry(r, r * 0.96, 0.26, 36, 1);
    return deform(g, (v) => {
      const a = Math.atan2(v.z, v.x);
      const rad = Math.hypot(v.x, v.z);
      if (rad > r * 0.9 && v.y < 0.1) {
        const s = 1 + Math.sin(a * 18) * 0.035;
        v.x = Math.cos(a) * rad * s;
        v.z = Math.sin(a) * rad * s;
      }
    });
  }, [itemId, r]);

  return (
    <group rotation={[0, 0, (Math.PI / 2) * side]}>
      <group ref={ref}>
        {itemId === 'cap' && capGeo && (
          <>
            <mesh geometry={capGeo} castShadow>
              <Mat color={def.color} kind="metal" />
            </mesh>
            <mesh position={[0, 0.13, 0]}>
              <cylinderGeometry args={[r * 0.72, r * 0.72, 0.02, 24]} />
              <Mat color="#f7f3ea" kind="plastic" />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[r * 0.3, r * 0.3, 0.02, 16]} />
              <Mat color={def.color} kind="metal" />
            </mesh>
          </>
        )}
        {itemId === 'toywheel' && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[r, r, 0.36, 28]} />
              <Mat color="#2d2d33" kind="rubber" />
            </mesh>
            <mesh>
              <cylinderGeometry args={[r * 0.68, r * 0.68, 0.4, 20]} />
              <Mat color={def.color} kind="plastic" />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]} position={[0, 0.2, 0]}>
                <boxGeometry args={[r * 0.9, 0.04, 0.1]} />
                <Mat color="#ffffff" kind="plastic" />
              </mesh>
            ))}
          </>
        )}
        {itemId === 'rubber' && (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[r * 0.7, r * 0.3, 14, 28]} />
              <Mat color={def.color} kind="rubber" />
            </mesh>
            <mesh>
              <cylinderGeometry args={[r * 0.72, r * 0.72, 0.18, 20]} />
              <Mat color="#cfd4d8" kind="metal" />
            </mesh>
            <mesh>
              <cylinderGeometry args={[r * 0.2, r * 0.2, 0.26, 12]} />
              <Mat color="#8a9299" kind="metal" />
            </mesh>
          </>
        )}
        {itemId === 'gear' && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[r * 0.82, r * 0.82, 0.3, 24]} />
              <Mat color={def.color} kind="metal" />
            </mesh>
            {Array.from({ length: 10 }).map((_, i) => (
              <mesh key={i} rotation={[0, (i / 10) * Math.PI * 2, 0]}>
                <boxGeometry args={[r * 1.95, 0.28, r * 0.32]} />
                <Mat color={def.color} kind="metal" />
              </mesh>
            ))}
            <mesh>
              <cylinderGeometry args={[r * 0.3, r * 0.3, 0.34, 12]} />
              <Mat color="#5a6168" kind="metal" />
            </mesh>
          </>
        )}
        {itemId === 'button' && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[r, r * 0.9, 0.18, 28]} />
              <Mat color={def.color} kind="plastic" />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <torusGeometry args={[r * 0.75, 0.03, 6, 24]} />
              <Mat color="#2d6aa8" kind="plastic" />
            </mesh>
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
              <mesh key={i} position={[a * r * 0.22, 0, b * r * 0.22]}>
                <cylinderGeometry args={[r * 0.08, r * 0.08, 0.22, 10]} />
                <Mat color="#1d3f63" kind="matte" />
              </mesh>
            ))}
          </>
        )}
        {itemId === 'coin' && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[r, r, 0.1, 32]} />
              <Mat color={def.color} kind="metal" />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <cylinderGeometry args={[r * 0.68, r * 0.68, 0.02, 24]} />
              <Mat color="#f0d998" kind="metal" />
            </mesh>
            {Array.from({ length: 22 }).map((_, i) => (
              <mesh key={i} rotation={[0, (i / 22) * Math.PI * 2, 0]} position={[r * 0.99, 0, 0]}>
                <boxGeometry args={[0.03, 0.1, 0.035]} />
                <Mat color="#b8954a" kind="metal" />
              </mesh>
            ))}
          </>
        )}
        {itemId === 'spool' && (
          <>
            {[-0.16, 0.16].map((y) => (
              <mesh key={y} position={[0, y, 0]} castShadow>
                <cylinderGeometry args={[r, r, 0.07, 24]} />
                <Mat color={def.color} kind="matte" />
              </mesh>
            ))}
            <mesh>
              <cylinderGeometry args={[r * 0.62, r * 0.62, 0.3, 20]} />
              <Mat color="#9c7b4f" kind="matte" />
            </mesh>
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={i} position={[0, -0.11 + i * 0.037, 0]}>
                <torusGeometry args={[r * 0.68, 0.022, 6, 20]} />
                <Mat color="#e8d5f0" kind="matte" />
              </mesh>
            ))}
          </>
        )}
        {itemId === 'jarlid' && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[r, r, 0.3, 30]} />
              <Mat color={def.color} kind="metal" />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[r * 0.88, r * 0.88, 0.03, 26]} />
              <Mat color="#e35b4f" kind="plastic" />
            </mesh>
            {Array.from({ length: 30 }).map((_, i) => (
              <mesh key={i} rotation={[0, (i / 30) * Math.PI * 2, 0]} position={[r * 0.99, 0, 0]}>
                <boxGeometry args={[0.035, 0.28, 0.05]} />
                <Mat color="#6f7c8a" kind="metal" />
              </mesh>
            ))}
          </>
        )}
        {itemId === 'oring' && (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[r * 0.74, r * 0.26, 12, 26]} />
              <Mat color={def.color} kind="rubber" />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh key={i} rotation={[Math.PI / 2, 0, (i / 3) * Math.PI]} >
                <torusGeometry args={[r * 0.74, r * 0.07, 6, 20]} />
                <Mat color="#8b7a85" kind="rubber" />
              </mesh>
            ))}
            <mesh>
              <cylinderGeometry args={[r * 0.26, r * 0.26, 0.2, 12]} />
              <Mat color="#cfd4d8" kind="metal" />
            </mesh>
          </>
        )}
        {itemId === 'inline' && (
          <>
            <mesh castShadow>
              <cylinderGeometry args={[r, r * 0.92, 0.28, 30]} />
              <Mat color={def.color} kind="glass" opacity={0.85} transparent />
            </mesh>
            <mesh>
              <cylinderGeometry args={[r * 0.52, r * 0.52, 0.34, 20]} />
              <Mat color="#f8f8fa" kind="plastic" />
            </mesh>
            <mesh>
              <cylinderGeometry args={[r * 0.22, r * 0.22, 0.4, 14]} />
              <Mat color="#8a9299" kind="metal" />
            </mesh>
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={i} rotation={[0, (i / 6) * Math.PI * 2, 0]} position={[r * 0.36, 0.18, 0]}>
                <sphereGeometry args={[0.045, 8, 6]} />
                <Mat color="#d8dee6" kind="metal" />
              </mesh>
            ))}
          </>
        )}
      </group>
    </group>
  );
}

// ─── Bodies ──────────────────────────────────────────────────────
export function Body({ itemId }: { itemId: string }) {
  const def = ITEMS[itemId];
  const d = BODIES[itemId];
  const geo = useMemo(() => {
    switch (itemId) {
      case 'can': {
        const g = new THREE.CylinderGeometry(0.75, 0.75, d.l, 36, 12);
        deform(g, (v) => {
          // ridges at ends
          const ay = Math.abs(v.y);
          if (ay > d.l / 2 - 0.2) {
            const s = ay > d.l / 2 - 0.02 ? 0.88 : 0.94;
            v.x *= s;
            v.z *= s;
          }
        });
        dent(g, 0.6, 0.3, 0.5, 0.65, 0.22);
        dent(g, -0.55, -0.6, 0.45, 0.5, 0.14);
        noisy(g, 0.008, 6, 2);
        g.rotateX(Math.PI / 2);
        return g;
      }
      case 'tub': {
        const g = roundedBox(d.w, d.h, d.l, 0.18, 4);
        taper(g, -0.18);
        noisy(g, 0.006, 4, 3);
        return g;
      }
      case 'brick': {
        const g = roundedBox(d.w, d.h, d.l, 0.06, 2);
        return g;
      }
      case 'matchbox': {
        const g = roundedBox(d.w, d.h, d.l * 0.8, 0.04, 2);
        deform(g, (v) => {
          v.x += v.y * 0.05;
        });
        return g;
      }
      case 'soap': {
        const g = roundedBox(d.w, d.h, d.l, 0.36, 5);
        taper(g, 0.25);
        bend(g, 0.04);
        return g;
      }
      case 'teabox': {
        const g = roundedBox(d.w, d.h, d.l, 0.05, 2);
        noisy(g, 0.012, 5, 7);
        return g;
      }
      case 'sardine': {
        const g = roundedBox(d.w, d.h, d.l, 0.22, 4);
        taper(g, 0.1);
        return g;
      }
      case 'lunchbox': {
        const g = roundedBox(d.w, d.h, d.l, 0.16, 3);
        taper(g, -0.1);
        return g;
      }
      case 'thermos': {
        const g = new THREE.CylinderGeometry(0.62, 0.58, d.l, 28, 10);
        deform(g, (v) => {
          const t = (v.y + d.l / 2) / d.l;
          if (t > 0.84) {
            const s = 1 - (t - 0.84) * 1.5;
            v.x *= s;
            v.z *= s;
          }
        });
        g.rotateX(Math.PI / 2);
        return g;
      }
      case 'dishboat': {
        const g = roundedBox(d.w, d.h, d.l, 0.3, 5);
        taper(g, -0.3);
        bend(g, 0.09);
        return g;
      }
    }
    return roundedBox(1.5, 0.8, 2.5, 0.1);
  }, [itemId, d]);

  const col = def.color;
  const cylinderBody = itemId === 'can' || itemId === 'thermos';
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow position={[0, cylinderBody ? (itemId === 'can' ? 0.75 : 0.66) : d.h / 2, 0]}>
        <Mat color={col} kind={itemId === 'can' ? 'metal' : itemId === 'tub' ? 'plastic' : itemId === 'matchbox' || itemId === 'teabox' ? 'matte' : itemId === 'sardine' ? 'metal' : 'plastic'} />
      </mesh>
      {itemId === 'can' && (
        <>
          <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.76, 0.76, 1.2, 36, 1, true]} />
            <Mat color="#f6f1e6" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.77, 0.77, 0.3, 36, 1, true]} />
            <Mat color="#1f2a44" kind="plastic" />
          </mesh>
          <mesh position={[0.2, 1.42, 0.3]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.18, 0.03, 0.5]} />
            <Mat color="#c9cfd6" kind="metal" />
          </mesh>
        </>
      )}
      {itemId === 'tub' && (
        <>
          <mesh position={[0, d.h, 0]}>
            <boxGeometry args={[d.w * 1.12, 0.1, d.l * 1.08]} />
            <Mat color="#dcd7cb" kind="plastic" />
          </mesh>
          <mesh position={[0, d.h - 0.02, 0]}>
            <boxGeometry args={[d.w * 0.95, 0.12, d.l * 0.92]} />
            <Mat color="#9aa6ad" kind="matte" />
          </mesh>
          <mesh position={[0.6, d.h * 0.5, d.l / 2 + 0.01]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.7, 0.4, 0.03]} />
            <Mat color="#ffb74d" kind="matte" />
          </mesh>
        </>
      )}
      {itemId === 'brick' &&
        [-1, 1].map((sx) =>
          [-1.5, -0.5, 0.5, 1.5].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * d.w * 0.25, d.h + 0.08, sz * d.l * 0.24]}>
              <cylinderGeometry args={[0.2, 0.2, 0.16, 18]} />
              <Mat color={col} kind="plastic" />
            </mesh>
          )),
        )}
      {itemId === 'matchbox' && (
        <>
          <mesh position={[0, d.h / 2, -0.55]}>
            <boxGeometry args={[d.w * 0.9, d.h * 0.85, d.l * 0.75]} />
            <Mat color="#efe3c8" kind="matte" />
          </mesh>
          <mesh position={[0, d.h * 0.25, -d.l / 2]}>
            <boxGeometry args={[d.w * 0.92, d.h * 0.5, 0.06]} />
            <Mat color="#efe3c8" kind="matte" />
          </mesh>
          <mesh position={[0, d.h / 2 + 0.01, d.l * 0.1]}>
            <boxGeometry args={[d.w * 0.95, d.h * 0.98, d.l * 0.78]} />
            <Mat color="#e35b4f" kind="matte" />
          </mesh>
          <mesh position={[-d.w / 2 - 0.01, d.h / 2, d.l * 0.1]}>
            <boxGeometry args={[0.03, d.h * 0.7, d.l * 0.6]} />
            <Mat color="#5b3a1e" kind="matte" />
          </mesh>
          <mesh position={[0, d.h + 0.01, d.l * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.35, 24]} />
            <Mat color="#ffd54f" kind="matte" />
          </mesh>
        </>
      )}
      {itemId === 'soap' && (
        <>
          <mesh position={[0, d.h * 0.6, 0]}>
            <boxGeometry args={[d.w * 0.98, 0.06, d.l * 0.98]} />
            <Mat color="#ffffff" kind="plastic" />
          </mesh>
          {[-0.6, 0, 0.6].map((z) => (
            <mesh key={z} position={[0.15, d.h * 0.86, z]}>
              <cylinderGeometry args={[0.06, 0.06, 0.05, 10]} />
              <Mat color="#4fb3a1" kind="plastic" />
            </mesh>
          ))}
        </>
      )}
      {itemId === 'teabox' && (
        <>
          <mesh position={[0, d.h * 0.62, d.l / 2 + 0.012]}>
            <boxGeometry args={[d.w * 0.74, d.h * 0.44, 0.02]} />
            <Mat color="#f6f2e2" kind="matte" />
          </mesh>
          <mesh position={[0, d.h * 0.62, d.l / 2 + 0.025]} rotation={[0, 0, 0]}>
            <circleGeometry args={[0.18, 18]} />
            <Mat color="#5c9150" kind="matte" />
          </mesh>
          <mesh position={[0, d.h + 0.015, 0]}>
            <boxGeometry args={[0.5, 0.03, d.l * 0.96]} />
            <Mat color="#dcd0ad" kind="matte" />
          </mesh>
          <mesh position={[d.w * 0.3, d.h + 0.1, -d.l * 0.2]} rotation={[0, 0.5, 0.25]}>
            <boxGeometry args={[0.02, 0.2, 0.26]} />
            <Mat color="#f8f4e6" kind="matte" />
          </mesh>
        </>
      )}
      {itemId === 'sardine' && (
        <>
          <mesh position={[0, d.h + 0.015, 0]}>
            <boxGeometry args={[d.w * 0.86, 0.04, d.l * 0.84]} />
            <Mat color="#9aa6b2" kind="metal" />
          </mesh>
          <mesh position={[0, d.h + 0.12, -d.l * 0.34]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.2, 0.035, 8, 18]} />
            <Mat color="#c3ccd4" kind="metal" />
          </mesh>
          <mesh position={[0, d.h * 0.5, d.l / 2 + 0.012]}>
            <boxGeometry args={[d.w * 0.6, d.h * 0.6, 0.02]} />
            <Mat color="#4f7fb5" kind="matte" />
          </mesh>
        </>
      )}
      {itemId === 'lunchbox' && (
        <>
          <mesh position={[0, d.h + 0.05, 0]}>
            <boxGeometry args={[d.w * 1.04, 0.12, d.l * 1.03]} />
            <Mat color="#f4e3c2" kind="plastic" />
          </mesh>
          <mesh position={[0, d.h * 0.52, 0]}>
            <boxGeometry args={[d.w * 1.02, 0.07, d.l * 1.01]} />
            <Mat color="#2f4858" kind="plastic" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (d.w / 2 + 0.03), d.h * 0.52, 0]}>
              <boxGeometry args={[0.1, 0.22, 0.4]} />
              <Mat color="#f2c14e" kind="plastic" />
            </mesh>
          ))}
          <mesh position={[0, d.h + 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 10]} />
            <Mat color="#2f4858" kind="rubber" />
          </mesh>
        </>
      )}
      {itemId === 'thermos' && (
        <>
          <mesh position={[0, 0.66, d.l * 0.38]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.45, 24]} />
            <Mat color="#cfd8e4" kind="metal" />
          </mesh>
          <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.635, 0.635, 0.9, 28, 1, true]} />
            <Mat color="#f4f6fa" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.66, -d.l * 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.6, 0.05, 8, 24]} />
            <Mat color="#33547d" kind="plastic" />
          </mesh>
          <mesh position={[0, 1.25, -d.l * 0.1]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.8, 10]} />
            <Mat color="#33547d" kind="rubber" />
          </mesh>
        </>
      )}
      {itemId === 'dishboat' && (
        <>
          <mesh position={[0, d.h * 0.78, 0]}>
            <boxGeometry args={[d.w * 0.72, 0.06, d.l * 0.76]} />
            <Mat color="#fff4e0" kind="plastic" />
          </mesh>
          {[-0.75, -0.25, 0.25, 0.75].map((t) => (
            <mesh key={t} position={[0, d.h * 0.84, t * d.l * 0.38]}>
              <boxGeometry args={[d.w * 0.66, 0.04, 0.07]} />
              <Mat color="#f0b878" kind="plastic" />
            </mesh>
          ))}
          <mesh position={[0, d.h * 0.55, d.l / 2 - 0.06]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[d.w * 0.5, 0.05, 0.4]} />
            <Mat color="#ffe6bd" kind="plastic" />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Generic parts ───────────────────────────────────────────────
export function Part({ itemId, active = false, spin }: { itemId: string; active?: boolean; spin?: React.MutableRefObject<number> }) {
  const def = ITEMS[itemId];
  const propRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (propRef.current) propRef.current.rotation.z += dt * (active ? 40 : 4 + (spin ? Math.abs(spin.current) * 0.1 : 0));
  });
  const wireGeo = useMemo(() => {
    if (itemId !== 'wire') return null;
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.4, 0.05), new THREE.Vector3(-0.12, 0.8, -0.05), new THREE.Vector3(0.1, 1.1, 0.1), new THREE.Vector3(0.3, 1.25, 0)];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 8, false);
  }, [itemId]);
  const boltGeo = useMemo(() => {
    if (itemId !== 'sticker') return null;
    const s = new THREE.Shape();
    s.moveTo(0.05, 0.5);
    s.lineTo(-0.25, 0.05);
    s.lineTo(-0.02, 0.05);
    s.lineTo(-0.15, -0.5);
    s.lineTo(0.25, 0.0);
    s.lineTo(0.03, 0.0);
    s.lineTo(0.15, 0.5);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.01, bevelSegments: 2 });
  }, [itemId]);
  const wedgeGeo = useMemo(() => {
    if (itemId !== 'plastic') return null;
    const g = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 3, 1);
    g.rotateZ(Math.PI / 2);
    return g;
  }, [itemId]);
  const springGeo = useMemo(() => {
    if (itemId !== 'springbumper' && itemId !== 'springant') return null;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 70; i++) {
      const a = (i / 70) * Math.PI * 2 * 5;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.14, (i / 70) * 0.62 - 0.31, Math.sin(a) * 0.14));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.03, 6, false);
  }, [itemId]);
  const hoseGeo = useMemo(() => {
    if (itemId !== 'hosepipe') return null;
    const pts = [
      new THREE.Vector3(0, 0, -0.45),
      new THREE.Vector3(0.14, 0.1, -0.15),
      new THREE.Vector3(-0.1, 0.18, 0.15),
      new THREE.Vector3(0.08, 0.1, 0.42),
      new THREE.Vector3(0.02, 0.02, 0.6),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.1, 10, false);
  }, [itemId]);
  const starGeo = useMemo(() => {
    if (itemId !== 'starsticker') return null;
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? 0.36 : 0.16;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 });
    g.center();
    return g;
  }, [itemId]);
  const leafGeo = useMemo(() => {
    if (itemId !== 'leaf') return null;
    const g = new THREE.SphereGeometry(0.5, 20, 12);
    g.scale(1.6, 0.08, 1);
    deform(g, (v) => {
      v.y += (v.x * v.x) * 0.25 - Math.abs(v.z) * 0.15;
      if (v.x > 0.6) v.z *= 0.6;
    });
    return g;
  }, [itemId]);

  switch (itemId) {
    case 'motor':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.62, 20]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.32, 0.32, 0.2, 20]} />
            <Mat color="#b5651d" kind="metal" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.36]}>
            <cylinderGeometry args={[0.05, 0.05, 0.14, 10]} />
            <Mat color="#666" kind="metal" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 0.08, -0.34]} rotation={[0.3 * s, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
              <Mat color={s < 0 ? '#e53935' : '#222'} kind="plastic" />
            </mesh>
          ))}
        </group>
      );
    case 'battery':
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.9, 24]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.305, 0.305, 0.25, 24]} />
            <Mat color="#c8a62a" kind="metal" />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.305, 0.305, 0.25, 24]} />
            <Mat color="#1f1f1f" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.1, 12]} />
            <Mat color="#d7dbe0" kind="metal" />
          </mesh>
        </group>
      );
    case 'windup':
      return (
        <group ref={propRef} rotation={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 10]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.3, 0, -0.1]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.22, 0.07, 10, 20]} />
              <Mat color={def.color} kind="metal" />
            </mesh>
          ))}
        </group>
      );
    case 'spray':
      return (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.22, 0.6, 16]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.35, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.09, 0.55, 12]} />
            <Mat color="#fff" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.2, 0.3]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.1, 0.3, 0.06]} />
            <Mat color="#fff" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.35, -0.2]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <Mat color={active ? '#fff2a8' : '#ff8fb1'} kind="plastic" emissive={active ? '#ffcc33' : '#000'} emissiveIntensity={active ? 3 : 0} />
          </mesh>
        </group>
      );
    case 'propeller':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.25, 12]} />
            <Mat color="#444" kind="metal" />
          </mesh>
          <group ref={propRef}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} rotation={[0, 0.5, (i / 3) * Math.PI * 2]} position={[0, 0, 0]}>
                <boxGeometry args={[0.1, 1.0, 0.04]} />
                <Mat color={def.color} kind="plastic" />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.12, 12, 10]} />
              <Mat color="#fff" kind="plastic" />
            </mesh>
          </group>
        </group>
      );
    case 'balloon':
      return (
        <group>
          <mesh position={[0, 0.9, 0]} scale={[1, 1.2, 1]} castShadow>
            <sphereGeometry args={[0.42, 24, 18]} />
            <Mat color={def.color} kind="glass" />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <coneGeometry args={[0.08, 0.1, 8]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.5, 4]} />
            <Mat color="#eee" kind="matte" />
          </mesh>
        </group>
      );
    case 'clothespin':
      return (
        <group rotation={[0, Math.PI / 2, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, s * 0.11, 0]} rotation={[s * 0.08, 0, 0]} castShadow>
              <boxGeometry args={[1.6, 0.16, 0.22]} />
              <Mat color={def.color} kind="matte" />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.16, 0.035, 8, 16]} />
            <Mat color="#9aa3ad" kind="metal" />
          </mesh>
        </group>
      );
    case 'chopstick':
      return (
        <group>
          {[0, 1].map((i) => (
            <mesh key={i} rotation={[0, 0, Math.PI / 2 + i * 0.08]} position={[0, i * 0.12, i * 0.1]} castShadow>
              <cylinderGeometry args={[0.055, 0.075, 2.4, 10]} />
              <Mat color={i ? '#d9b27a' : def.color} kind="matte" />
            </mesh>
          ))}
        </group>
      );
    case 'eraser':
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.4, 0.42]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0.5, 0, 0]}>
            <boxGeometry args={[0.62, 0.41, 0.43]} />
            <Mat color="#7fb3e6" kind="matte" />
          </mesh>
          <mesh position={[-0.3, 0, 0.1]}>
            <boxGeometry args={[0.9, 0.46, 0.3]} />
            <Mat color="#fff" kind="matte" />
          </mesh>
        </group>
      );
    case 'plastic':
      return (
        <mesh geometry={wedgeGeo!} rotation={[0, 0, 0]} castShadow>
          <Mat color={def.color} kind="glass" opacity={0.85} transparent />
        </mesh>
      );
    case 'popsicle':
      return (
        <group>
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} position={[x, 0.35, 0]} rotation={[0, 0, x * 0.1]}>
              <boxGeometry args={[0.16, 0.7, 0.05]} />
              <Mat color={def.color} kind="matte" />
            </mesh>
          ))}
          <mesh position={[0, 0.75, 0]} rotation={[0.25, 0, 0.06]} castShadow>
            <boxGeometry args={[1.9, 0.06, 0.4]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0.5, 0.78, 0]} rotation={[0.25, 0, 0.06]}>
            <boxGeometry args={[0.4, 0.07, 0.3]} />
            <Mat color="#b98a5a" kind="matte" />
          </mesh>
        </group>
      );
    case 'card':
      return (
        <group>
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 0.3, 0]}>
              <boxGeometry args={[0.08, 0.6, 0.08]} />
              <Mat color="#444" kind="metal" />
            </mesh>
          ))}
          <mesh position={[0, 0.62, 0]} rotation={[0.3, 0, 0.05]} castShadow>
            <boxGeometry args={[1.5, 0.03, 1.0]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, 0.66, 0]} rotation={[0.3, 0, 0.05]} scale={[1, 0.3, 1]}>
            <sphereGeometry args={[0.22, 14, 10]} />
            <Mat color="#e53935" kind="matte" />
          </mesh>
        </group>
      );
    case 'leaf':
      return (
        <group>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
            <Mat color="#8d6e4a" kind="matte" />
          </mesh>
          <mesh geometry={leafGeo!} position={[0.2, 0.72, 0]} rotation={[0.15, 0, 0.1]} castShadow>
            <Mat color={def.color} kind="toon" />
          </mesh>
        </group>
      );
    case 'straw':
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.9, 14]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, -0.45 - i * 0.07, 0]}>
              <torusGeometry args={[0.09, 0.035, 8, 16]} />
              <Mat color={def.color} kind="plastic" />
            </mesh>
          ))}
          <mesh position={[0, -0.8, -0.1]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.35, 14]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          {[-0.2, 0.15].map((z) => (
            <mesh key={z} position={[0, 0.2 + z, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.09, 0.02, 6, 16]} />
              <Mat color="#ffffff" kind="plastic" />
            </mesh>
          ))}
        </group>
      );
    case 'pencap':
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.13, 0.7, 14]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, -0.45, 0]}>
            <coneGeometry args={[0.1, 0.25, 14]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0.12, 0.05, 0]}>
            <boxGeometry args={[0.05, 0.5, 0.08]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
        </group>
      );
    case 'wire':
      return (
        <group>
          <mesh geometry={wireGeo!}>
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0.3, 1.25, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <Mat color="#e53935" kind="plastic" emissive="#e53935" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case 'toothpick':
      return (
        <group>
          <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0.08]}>
            <cylinderGeometry args={[0.015, 0.04, 1.3, 8]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0.22, 1.05, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.2, 0.42, 3]} />
            <Mat color="#e53935" kind="matte" side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    case 'rubberband':
      return (
        <mesh rotation={[0, 0, 0]} scale={[1, 0.6, 1]}>
          <torusGeometry args={[1, 0.06, 8, 32]} />
          <Mat color={def.color} kind="rubber" />
        </mesh>
      );
    case 'sticker':
      return (
        <mesh geometry={boltGeo!}>
          <Mat color={def.color} kind="plastic" emissive="#ffb300" emissiveIntensity={0.25} />
        </mesh>
      );
    case 'bell':
      return (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 18, 14]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, -0.05, 0.19]}>
            <boxGeometry args={[0.3, 0.05, 0.1]} />
            <Mat color="#4a3000" kind="matte" />
          </mesh>
          <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.02, 6, 12]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
        </group>
      );

    // ─── 붓 계열: 손잡이가 위, 끝(붓털/심)이 아래쪽(바닥 방향) ───
    case 'ballpen':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.065, 0.8, 10]} />
            <Mat color="#f4f1ea" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.25, 10]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <coneGeometry args={[0.065, 0.18, 10]} />
            <Mat color="#c9cfd6" kind="metal" />
          </mesh>
          <mesh position={[0, -0.29, 0]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
        </group>
      );
    case 'crayon':
      return (
        <group>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.75, 12]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.45, 12, 1, true]} />
            <Mat color="#f6e7b0" kind="matte" />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <coneGeometry args={[0.11, 0.2, 12]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
        </group>
      );
    case 'thinbrush':
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, 0.9, 10]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.06, 0.05, 0.14, 10]} />
            <Mat color="#c9cfd6" kind="metal" />
          </mesh>
          <mesh position={[0, -0.3, 0]} scale={[1, 1.4, 1]}>
            <coneGeometry args={[0.05, 0.22, 10]} />
            <Mat color="#3a2a22" kind="matte" />
          </mesh>
        </group>
      );
    case 'marker':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.8, 14]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.102, 0.102, 0.3, 14, 1, true]} />
            <Mat color="#f4f1ea" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 0.12, 14]} />
            <Mat color="#1a1a1e" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.16, 14]} />
            <Mat color="#4a4a52" kind="matte" />
          </mesh>
        </group>
      );
    case 'widebrush':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.16, 0.7, 0.08]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.62, 0.14, 0.12]} />
            <Mat color="#c9cfd6" kind="metal" />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.6, 0.36, 0.1]} />
            <Mat color="#e0b97d" kind="matte" />
          </mesh>
          {[-0.22, -0.11, 0, 0.11, 0.22].map((x) => (
            <mesh key={x} position={[x, -0.42, 0]}>
              <boxGeometry args={[0.1, 0.06, 0.09]} />
              <Mat color="#8d6e4a" kind="matte" />
            </mesh>
          ))}
        </group>
      );
    case 'roller':
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
          <mesh position={[0.2, 0.15, 0]} rotation={[0, 0, 1.1]}>
            <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.3, 10]} />
            <Mat color="#ff7043" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.7, 16]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
        </group>
      );
    case 'paintbucket':
      return (
        <group>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.26, 0.5, 20]} />
            <Mat color="#c9cfd6" kind="metal" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.305, 0.305, 0.25, 20, 1, true]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 20]} />
            <Mat color={def.color} kind="glass" />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.28, 0.02, 6, 20, Math.PI]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
          {/* 흘러내리는 물감 */}
          {[[0.18, 0.3], [-0.1, 0.4], [0.02, 0.22]].map(([x, h], i) => (
            <mesh key={i} position={[x, -0.15 - h * 0.5, 0.25]}>
              <capsuleGeometry args={[0.04, h, 4, 8]} />
              <Mat color={def.color} kind="glass" />
            </mesh>
          ))}
        </group>
      );

    // ─── 추가 엔진 ───
    case 'rubberband_engine':
      return (
        <group>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.75, 10]} />
            <Mat color="#9aa3ad" kind="metal" />
          </mesh>
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.14, 14]} />
              <Mat color="#7d858c" kind="metal" />
            </mesh>
          ))}
          {[-0.1, 0, 0.1].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.25]}>
              <torusGeometry args={[0.2, 0.035, 6, 20]} />
              <Mat color={def.color} kind="rubber" />
            </mesh>
          ))}
        </group>
      );
    case 'fanmotor':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.26, 20]} />
            <Mat color="#4a5560" kind="metal" />
          </mesh>
          <group ref={propRef}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, 0.4, (i / 4) * Math.PI * 2]} position={[0, 0, 0.2]}>
                <boxGeometry args={[0.12, 0.52, 0.03]} />
                <Mat color={def.color} kind="plastic" />
              </mesh>
            ))}
          </group>
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.025, 6, 22]} />
            <Mat color="#cfd4d8" kind="metal" />
          </mesh>
        </group>
      );
    case 'clockwork':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.16, 26]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 24]} />
            <Mat color="#f6f1e0" kind="plastic" />
          </mesh>
          <group ref={propRef} position={[0, 0, 0.12]}>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.03, 0.22, 0.02]} />
              <Mat color="#2b2b30" kind="metal" />
            </mesh>
            <mesh position={[0.07, 0, 0]} rotation={[0, 0, 1.2]}>
              <boxGeometry args={[0.025, 0.15, 0.02]} />
              <Mat color="#8a3a3a" kind="metal" />
            </mesh>
          </group>
          {Array.from({ length: 14 }).map((_, i) => (
            <mesh key={i} rotation={[0, 0, (i / 14) * Math.PI * 2]} position={[0, 0, 0]}>
              <boxGeometry args={[0.78, 0.07, 0.14]} />
              <Mat color="#b99a62" kind="metal" />
            </mesh>
          ))}
        </group>
      );
    case 'solar':
      return (
        <group>
          <mesh rotation={[-0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.85, 0.05, 0.6]} />
            <Mat color={def.color} kind="glass" />
          </mesh>
          {[-0.26, 0, 0.26].map((x) => (
            <mesh key={x} position={[x, 0.035, 0]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.03, 0.02, 0.56]} />
              <Mat color="#cfe4ff" kind="metal" />
            </mesh>
          ))}
          <mesh position={[0, -0.16, -0.1]}>
            <boxGeometry args={[0.3, 0.26, 0.2]} />
            <Mat color="#8d99ae" kind="metal" />
          </mesh>
        </group>
      );
    case 'turbine':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.28, 0.8, 22]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <group ref={propRef} position={[0, 0, 0.3]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={i} rotation={[0, 0.6, (i / 8) * Math.PI * 2]}>
                <boxGeometry args={[0.07, 0.5, 0.04]} />
                <Mat color="#e8eef5" kind="metal" />
              </mesh>
            ))}
          </group>
          <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.3, 0.3, 20]} />
            <Mat color="#8a9299" kind="metal" />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.04, 8, 24]} />
            <Mat color="#ffb703" kind="metal" />
          </mesh>
        </group>
      );

    // ─── 추가 부스터 ───
    case 'bellows':
      return (
        <group>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[0, 0, -0.3 + i * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2 + (i % 2) * 0.06, 0.055, 6, 18]} />
              <Mat color={def.color} kind="matte" />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.14, 0.3, 14]} />
            <Mat color="#6b4a33" kind="matte" />
          </mesh>
        </group>
      );
    case 'sodacan':
      return (
        <group rotation={[0, 0, 0.35]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.68, 20]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.255, 0.255, 0.3, 20, 1, true]} />
            <Mat color="#f8f3e2" kind="plastic" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[(i % 2 ? 0.14 : -0.12), 0.1 + i * 0.09, -0.4 - i * 0.07]}>
              <sphereGeometry args={[0.05 + (i % 3) * 0.02, 8, 6]} />
              <Mat color="#fffdf2" kind="glass" opacity={0.8} transparent />
            </mesh>
          ))}
        </group>
      );
    case 'firework':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.8, 16]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          {[0.2, 0.0, -0.2].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.165, 0.165, 0.08, 16]} />
              <Mat color="#ffe9a8" kind="matte" />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.16, 0.26, 16]} />
            <Mat color="#ffd166" kind="matte" />
          </mesh>
          <mesh position={[0, 0.06, -0.52]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
            <Mat color="#8d6e4a" kind="matte" />
          </mesh>
        </group>
      );
    case 'jetnozzle':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 0.62, 20]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.2, 0.3, 20, 1, true]} />
            <Mat color="#2f4858" kind="metal" side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]} position={[0, 0, 0.18]}>
              <boxGeometry args={[0.52, 0.04, 0.16]} />
              <Mat color="#cfe9f0" kind="metal" />
            </mesh>
          ))}
        </group>
      );
    case 'rocketpack':
      return (
        <group>
          {[-0.2, 0.2].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.17, 0.17, 0.8, 16]} />
                <Mat color={def.color} kind="plastic" />
              </mesh>
              <mesh position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.17, 0.3, 16]} />
                <Mat color="#f8f3e2" kind="plastic" />
              </mesh>
              <mesh position={[0, 0, -0.46]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.13, 0.2, 16, 1, true]} />
                <Mat color="#4a5560" kind="metal" side={THREE.DoubleSide} />
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]} position={[0, 0, -0.3]}>
                  <boxGeometry args={[0.42, 0.03, 0.22]} />
                  <Mat color="#f8f3e2" kind="plastic" />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );

    // ─── 추가 범퍼 ───
    case 'sponge':
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.42, 0.5]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[1.52, 0.14, 0.52]} />
            <Mat color="#4caf7d" kind="matte" />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-0.6 + i * 0.15, -0.08 + (i % 3) * 0.1, 0.26]}>
              <sphereGeometry args={[0.045, 6, 5]} />
              <Mat color="#e0b23f" kind="matte" />
            </mesh>
          ))}
        </group>
      );
    case 'cork':
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.26, 0.3, 0.9, 18]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.12, 18]} />
            <Mat color="#b88a52" kind="matte" />
          </mesh>
          {Array.from({ length: 16 }).map((_, i) => (
            <mesh key={i} position={[Math.cos(i * 2.1) * 0.2, -0.2 + (i % 5) * 0.1, Math.sin(i * 2.1) * 0.2]}>
              <sphereGeometry args={[0.032, 6, 5]} />
              <Mat color="#9d7442" kind="matte" />
            </mesh>
          ))}
        </group>
      );
    case 'springbumper': {
      const coil = springGeo;
      return (
        <group>
          <mesh position={[0, 0, 0.1]}>
            <boxGeometry args={[1.3, 0.1, 0.1]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
          {[-0.45, 0, 0.45].map((x) => (
            <group key={x} position={[x, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
              {coil ? (
                <mesh geometry={coil} castShadow>
                  <Mat color={def.color} kind="metal" />
                </mesh>
              ) : (
                <mesh castShadow>
                  <cylinderGeometry args={[0.16, 0.16, 0.5, 12]} />
                  <Mat color={def.color} kind="metal" />
                </mesh>
              )}
            </group>
          ))}
          {[-0.45, 0, 0.45].map((x) => (
            <mesh key={`c${x}`} position={[x, 0, -0.42]}>
              <sphereGeometry args={[0.12, 10, 8]} />
              <Mat color="#e35b4f" kind="rubber" />
            </mesh>
          ))}
        </group>
      );
    }
    case 'ruler':
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[1.8, 0.28, 0.07]} />
            <Mat color={def.color} kind="glass" opacity={0.9} transparent />
          </mesh>
          {Array.from({ length: 15 }).map((_, i) => (
            <mesh key={i} position={[-0.8 + i * 0.115, i % 5 === 0 ? -0.02 : 0.03, 0.04]}>
              <boxGeometry args={[0.012, i % 5 === 0 ? 0.18 : 0.09, 0.01]} />
              <Mat color="#2b4a3a" kind="matte" />
            </mesh>
          ))}
          <mesh position={[0, -0.18, 0]}>
            <boxGeometry args={[1.82, 0.06, 0.1]} />
            <Mat color="#3f8f6a" kind="plastic" />
          </mesh>
        </group>
      );
    case 'capshield':
      return (
        <group>
          {[-0.42, 0, 0.42].map((x, i) => (
            <group key={x} position={[x, i === 1 ? 0.06 : 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.32, 0.3, 0.16, 26]} />
                <Mat color={i === 1 ? '#e8453c' : def.color} kind="metal" />
              </mesh>
              <mesh position={[0, 0.09, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.03, 18]} />
                <Mat color="#f7f3ea" kind="plastic" />
              </mesh>
              {Array.from({ length: 18 }).map((_, k) => (
                <mesh key={k} rotation={[0, (k / 18) * Math.PI * 2, 0]} position={[0.315, 0, 0]}>
                  <boxGeometry args={[0.025, 0.15, 0.03]} />
                  <Mat color="#8a4349" kind="metal" />
                </mesh>
              ))}
            </group>
          ))}
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[1.2, 0.07, 0.12]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
        </group>
      );

    // ─── 추가 스포일러 ───
    case 'feather':
      return (
        <group>
          <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0.12]} castShadow>
            <cylinderGeometry args={[0.018, 0.03, 1.1, 8]} />
            <Mat color="#c9b89a" kind="matte" />
          </mesh>
          {Array.from({ length: 11 }).map((_, i) => {
            const t = i / 10;
            const len = Math.sin(t * Math.PI) * 0.46 + 0.08;
            return (
              <group key={i} position={[0.05 + t * 0.13, 0.08 + t * 0.78, 0]}>
                {[-1, 1].map((s) => (
                  <mesh key={s} position={[s * len * 0.5, 0, 0]} rotation={[0, 0, s * 0.42]}>
                    <boxGeometry args={[len, 0.055, 0.012]} />
                    <Mat color={def.color} kind="matte" />
                  </mesh>
                ))}
              </group>
            );
          })}
        </group>
      );
    case 'spoon':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[0.1, 0.9, 0.05]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, 0.85, 0.04]} rotation={[0.4, 0, 0]} scale={[1, 1.5, 0.45]}>
            <sphereGeometry args={[0.26, 18, 14]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.3, 0.1, 0.16]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
        </group>
      );
    case 'paperfan':
      return (
        <group rotation={[0.3, 0, 0]}>
          {Array.from({ length: 9 }).map((_, i) => {
            const a = -0.85 + (i / 8) * 1.7;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.45, 0.42 + Math.cos(a) * 0.12, 0]} rotation={[0, 0, -a]} castShadow>
                <boxGeometry args={[0.16, 0.9, 0.025]} />
                <Mat color={i % 2 ? '#ffffff' : def.color} kind="matte" />
              </mesh>
            );
          })}
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.14, 12]} />
            <Mat color="#8d6e4a" kind="matte" />
          </mesh>
        </group>
      );
    case 'comb':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.4, 0.26, 0.09]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          {Array.from({ length: 16 }).map((_, i) => (
            <mesh key={i} position={[-0.63 + i * 0.084, 0.16, 0]}>
              <boxGeometry args={[0.03, 0.36, 0.07]} />
              <Mat color={def.color} kind="plastic" />
            </mesh>
          ))}
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[1.42, 0.06, 0.1]} />
            <Mat color="#c7bdf0" kind="plastic" />
          </mesh>
        </group>
      );
    case 'planewing':
      return (
        <group>
          <mesh position={[0, 0.5, 0]} rotation={[0.12, 0, 0]} castShadow scale={[1, 0.16, 1]}>
            <sphereGeometry args={[0.85, 20, 10]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.8, 0.62, 0]} rotation={[0, 0, s * 0.5]}>
              <boxGeometry args={[0.08, 0.3, 0.3]} />
              <Mat color="#c8d6e4" kind="plastic" />
            </mesh>
          ))}
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} position={[x, 0.2, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.6, 10]} />
              <Mat color="#8d99ae" kind="metal" />
            </mesh>
          ))}
        </group>
      );

    // ─── 추가 배기구 ───
    case 'whistle':
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.5, 18]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0.16, 0.12, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.09, 0.2, 0.18]} />
            <Mat color="#f6f1e0" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.08, 0.025, 6, 14]} />
            <Mat color="#c3ccd4" kind="metal" />
          </mesh>
        </group>
      );
    case 'hosepipe': {
      const curve = hoseGeo;
      return curve ? (
        <mesh geometry={curve} castShadow>
          <Mat color={def.color} kind="rubber" />
        </mesh>
      ) : null;
    }
    case 'funnel':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.12, 0.5, 20, 1, true]} />
            <Mat color={def.color} kind="plastic" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.3, 14]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.42, 0.03, 6, 22]} />
            <Mat color="#c87a2a" kind="plastic" />
          </mesh>
        </group>
      );
    case 'chimney':
      return (
        <group>
          {[-0.22, 0.22].map((x, i) => (
            <group key={x} position={[x, 0.3 + i * 0.1, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.13, 0.15, 0.7, 14]} />
                <Mat color={def.color} kind="metal" />
              </mesh>
              <mesh position={[0, 0.38, 0]}>
                <cylinderGeometry args={[0.17, 0.17, 0.08, 14]} />
                <Mat color="#5f6a75" kind="metal" />
              </mesh>
              {[-0.15, 0.1].map((y) => (
                <mesh key={y} position={[0, y, 0]}>
                  <torusGeometry args={[0.145, 0.02, 6, 14]} />
                  <Mat color="#5f6a75" kind="metal" />
                </mesh>
              ))}
            </group>
          ))}
          <mesh position={[0, -0.08, 0]}>
            <boxGeometry args={[0.6, 0.08, 0.2]} />
            <Mat color="#6b747e" kind="metal" />
          </mesh>
        </group>
      );
    case 'trumpet':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.7, 14]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.36, 0.1, 0.42, 20, 1, true]} />
            <Mat color={def.color} kind="metal" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.36, 0.035, 8, 22]} />
            <Mat color="#fff0b8" kind="metal" />
          </mesh>
          {[-0.12, 0, 0.12].map((z) => (
            <mesh key={z} position={[0, 0.12, z]}>
              <cylinderGeometry args={[0.04, 0.04, 0.14, 10]} />
              <Mat color="#c3ccd4" kind="metal" />
            </mesh>
          ))}
        </group>
      );

    // ─── 추가 안테나 ───
    case 'paperclip':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.3 + i * 0.12, 0]} rotation={[Math.PI / 2, 0, i * 0.4]} scale={[1, 1.7, 1]}>
              <torusGeometry args={[0.16 - i * 0.03, 0.022, 6, 18, Math.PI * 1.6]} />
              <Mat color={def.color} kind="metal" />
            </mesh>
          ))}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.14, 10]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
        </group>
      );
    case 'springant': {
      const coil = springGeo;
      return (
        <group>
          {coil ? (
            <mesh geometry={coil} position={[0, 0.5, 0]} scale={[0.75, 1.3, 0.75]} castShadow>
              <Mat color={def.color} kind="metal" />
            </mesh>
          ) : null}
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <Mat color="#ff8fb1" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.12, 12]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
        </group>
      );
    }
    case 'balloonant':
      return (
        <group>
          <mesh position={[0, 1.0, 0]} scale={[1, 1.25, 1]} castShadow>
            <sphereGeometry args={[0.33, 20, 16]} />
            <Mat color={def.color} kind="glass" opacity={0.9} transparent />
          </mesh>
          <mesh position={[0.1, 1.22, 0.14]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <Mat color="#ffffff" kind="glass" opacity={0.6} transparent />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <coneGeometry args={[0.07, 0.12, 8]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.58, 4]} />
            <Mat color="#f2efe4" kind="matte" />
          </mesh>
        </group>
      );
    case 'pinwheel':
      return (
        <group>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.035, 0.9, 8]} />
            <Mat color="#c9a36a" kind="matte" />
          </mesh>
          <group ref={propRef} position={[0, 0.9, 0.06]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} rotation={[0, 0.35, (i / 6) * Math.PI * 2]} position={[0, 0, 0]}>
                <boxGeometry args={[0.1, 0.46, 0.02]} />
                <Mat color={i % 2 ? '#ff9ec4' : def.color} kind="matte" />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.055, 10, 8]} />
              <Mat color="#ffd166" kind="plastic" />
            </mesh>
          </group>
        </group>
      );
    case 'radardish':
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.7, 10]} />
            <Mat color="#8d99ae" kind="metal" />
          </mesh>
          <group ref={propRef} position={[0, 0.78, 0]} rotation={[0.5, 0, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
              <Mat color={def.color} kind="plastic" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
              <Mat color="#7d858c" kind="metal" />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <Mat color="#e35b4f" kind="plastic" emissive="#e35b4f" emissiveIntensity={0.5} />
            </mesh>
          </group>
        </group>
      );

    // ─── 추가 장식 ───
    case 'beads':
      return (
        <group>
          {Array.from({ length: 9 }).map((_, i) => {
            const a = (i / 9) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.3, Math.sin(a) * 0.12, Math.sin(a) * 0.3]}>
                <sphereGeometry args={[0.085, 12, 10]} />
                <Mat color={['#8fd3e8', '#ff9ec4', '#ffd166', '#a6e3a1'][i % 4]} kind="glass" />
              </mesh>
            );
          })}
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.4]}>
            <torusGeometry args={[0.3, 0.012, 6, 24]} />
            <Mat color="#f2efe4" kind="matte" />
          </mesh>
        </group>
      );
    case 'pompom':
      return (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.28, 16, 12]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          {Array.from({ length: 22 }).map((_, i) => {
            const a = i * 2.4, b = i * 1.1;
            return (
              <mesh key={i} position={[Math.cos(a) * Math.sin(b) * 0.27, Math.cos(b) * 0.27, Math.sin(a) * Math.sin(b) * 0.27]} rotation={[a, b, 0]}>
                <capsuleGeometry args={[0.035, 0.12, 4, 6]} />
                <Mat color={i % 3 ? def.color : '#ffd9e8'} kind="matte" />
              </mesh>
            );
          })}
        </group>
      );
    case 'ribbon':
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.24, 0.05, 0]} rotation={[0, 0, s * 0.6]} scale={[1, 0.62, 0.42]}>
              <sphereGeometry args={[0.26, 16, 12]} />
              <Mat color={def.color} kind="matte" />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.1, 12, 10]} />
            <Mat color="#ffd9e8" kind="matte" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`t${s}`} position={[s * 0.18, -0.3, 0]} rotation={[0, 0, s * 0.3]}>
              <boxGeometry args={[0.12, 0.42, 0.02]} />
              <Mat color={def.color} kind="matte" />
            </mesh>
          ))}
        </group>
      );
    case 'starsticker': {
      const star = starGeo;
      return star ? (
        <mesh geometry={star} castShadow>
          <Mat color={def.color} kind="plastic" emissive="#ffb300" emissiveIntensity={0.3} />
        </mesh>
      ) : null;
    }
    case 'crown':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 20, 1, true]} />
            <Mat color={def.color} kind="metal" side={THREE.DoubleSide} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <group key={i} position={[Math.cos(a) * 0.32, 0.18, Math.sin(a) * 0.32]} rotation={[0, -a, 0]}>
                <mesh castShadow>
                  <coneGeometry args={[0.09, 0.26, 4]} />
                  <Mat color={def.color} kind="metal" />
                </mesh>
                <mesh position={[0, 0.17, 0]}>
                  <sphereGeometry args={[0.055, 10, 8]} />
                  <Mat color={['#e35b4f', '#4a8ff0', '#43b96b'][i % 3]} kind="glass" />
                </mesh>
              </group>
            );
          })}
          <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.32, 0.04, 8, 22]} />
            <Mat color="#e0a92a" kind="metal" />
          </mesh>
        </group>
      );

    // ─── 추가 붓 ───
    case 'chalk':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.13, 0.78, 14]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.132, 0.132, 0.24, 14, 1, true]} />
            <Mat color="#d8e8f0" kind="matte" />
          </mesh>
          <mesh position={[0, -0.24, 0]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.13, 14, 10]} />
            <Mat color="#fffdf6" kind="matte" />
          </mesh>
        </group>
      );
    case 'highlighter':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.22, 0.75, 0.16]} />
            <Mat color={def.color} kind="plastic" />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.23, 0.2, 0.17]} />
            <Mat color="#f6f1e0" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.14, 0]}>
            <boxGeometry args={[0.2, 0.14, 0.14]} />
            <Mat color="#4a4a52" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.3, 0.02]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.24, 0.2, 0.08]} />
            <Mat color={def.color} kind="matte" emissive={def.color} emissiveIntensity={0.25} />
          </mesh>
        </group>
      );
    case 'spongebrush':
      return (
        <group>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.065, 0.78, 10]} />
            <Mat color="#8d6e4a" kind="matte" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.36, 0.16, 0.2]} />
            <Mat color="#c3ccd4" kind="metal" />
          </mesh>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.52, 0.42, 0.3]} />
            <Mat color={def.color} kind="matte" />
          </mesh>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[-0.2 + (i % 4) * 0.13, -0.3 - Math.floor(i / 4) * 0.1, 0.16]}>
              <sphereGeometry args={[0.04, 6, 5]} />
              <Mat color="#e0a63f" kind="matte" />
            </mesh>
          ))}
        </group>
      );
    case 'mop':
      return (
        <group>
          <mesh position={[0, 0.62, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.07, 1.1, 10]} />
            <Mat color="#c9a36a" kind="matte" />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.16, 14]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.16, -0.3, Math.sin(a) * 0.16]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}>
                <capsuleGeometry args={[0.035, 0.44, 4, 6]} />
                <Mat color={i % 3 ? def.color : '#b9dcef'} kind="matte" />
              </mesh>
            );
          })}
        </group>
      );
    // ─── 총 7종 (총구가 +Z = 차량 앞쪽) ───
    case 'waterpistol':
      return (
        <group>
          <mesh position={[0, 0.12, 0.05]} castShadow><boxGeometry args={[0.26, 0.26, 0.7]} /><Mat color={def.color} kind="plastic" /></mesh>
          <mesh position={[0, 0.33, -0.08]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.42, 16]} /><Mat color="#9fe3ff" kind="glass" opacity={0.7} transparent /></mesh>
          <mesh position={[0, 0.12, 0.5]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.07, 0.3, 10]} /><Mat color="#ffcf3a" kind="plastic" /></mesh>
          <mesh position={[0, -0.16, -0.15]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[0.2, 0.42, 0.2]} /><Mat color="#ffcf3a" kind="plastic" /></mesh>
        </group>
      );
    case 'rubbergun':
      return (
        <group>
          <mesh position={[0, 0.1, 0.1]} castShadow><boxGeometry args={[0.12, 0.12, 1.0]} /><Mat color={def.color} kind="matte" /></mesh>
          <mesh position={[0, -0.14, -0.3]} rotation={[0.3, 0, 0]} castShadow><boxGeometry args={[0.12, 0.45, 0.14]} /><Mat color={def.color} kind="matte" /></mesh>
          <mesh position={[0, 0.17, 0.12]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.07, 0.025, 6, 14]} /><Mat color="#f5c242" kind="rubber" /></mesh>
          <mesh position={[0, 0.17, 0.58]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.07, 0.025, 6, 14]} /><Mat color="#f5c242" kind="rubber" /></mesh>
          <Tape position={[0, 0.0, -0.2]} rotation={[0, 0, 0]} size={[0.18, 0.18, 0.08]} />
        </group>
      );
    case 'slingshot':
      return (
        <group>
          <mesh position={[0, -0.12, 0]} castShadow><cylinderGeometry args={[0.07, 0.08, 0.5, 10]} /><Mat color={def.color} kind="matte" /></mesh>
          <mesh position={[-0.16, 0.25, 0]} rotation={[0, 0, 0.45]} castShadow><cylinderGeometry args={[0.055, 0.065, 0.48, 10]} /><Mat color={def.color} kind="matte" /></mesh>
          <mesh position={[0.16, 0.25, 0]} rotation={[0, 0, -0.45]} castShadow><cylinderGeometry args={[0.055, 0.065, 0.48, 10]} /><Mat color={def.color} kind="matte" /></mesh>
          <mesh position={[0, 0.44, -0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.62, 6]} /><Mat color="#e8453c" kind="rubber" /></mesh>
          <mesh position={[0, 0.44, -0.16]}><sphereGeometry args={[0.09, 12, 10]} /><Mat color="#c3ccd4" kind="metal" /></mesh>
        </group>
      );
    case 'corkgun':
      return (
        <group>
          <mesh position={[0, 0.12, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.1, 0.12, 0.9, 14]} /><Mat color={def.color} kind="plastic" /></mesh>
          <mesh position={[0, 0.12, 0.58]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.085, 0.16, 12]} /><Mat color="#d2a56d" kind="matte" /></mesh>
          <mesh position={[0, 0.12, -0.42]} castShadow><boxGeometry args={[0.18, 0.24, 0.3]} /><Mat color="#8d5a3a" kind="matte" /></mesh>
          <mesh position={[0, -0.12, -0.22]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.13, 0.36, 0.15]} /><Mat color="#8d5a3a" kind="matte" /></mesh>
          <mesh position={[0, 0.28, 0.0]}><boxGeometry args={[0.04, 0.08, 0.5]} /><Mat color="#f8f3e2" kind="plastic" /></mesh>
        </group>
      );
    case 'dartgun':
      return (
        <group>
          <mesh position={[0, 0.14, 0.05]} castShadow><boxGeometry args={[0.24, 0.3, 0.86]} /><Mat color={def.color} kind="plastic" /></mesh>
          <mesh position={[0, 0.34, 0.05]}><boxGeometry args={[0.16, 0.1, 0.6]} /><Mat color="#2b2b30" kind="plastic" /></mesh>
          {[-0.06, 0.06].map((x) => <mesh key={x} position={[x, 0.14, 0.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2, 10]} /><Mat color="#3fb6f0" kind="plastic" /></mesh>)}
          <mesh position={[0, -0.15, -0.22]} rotation={[0.3, 0, 0]} castShadow><boxGeometry args={[0.18, 0.4, 0.18]} /><Mat color="#2b2b30" kind="plastic" /></mesh>
          <mesh position={[0, 0.14, 0.7]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.12, 10]} /><Mat color="#ff8a3d" kind="rubber" /></mesh>
        </group>
      );
    case 'peashotgun':
      return (
        <group>
          {[[-0.08, 0.08], [0.08, 0.08], [0, 0.2], [-0.08, 0.32], [0.08, 0.32]].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.15]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.055, 0.055, 0.9, 10]} /><Mat color={i % 2 ? '#ff7043' : '#f8f3e2'} kind="plastic" /></mesh>
          ))}
          <mesh position={[0, 0.2, -0.38]} castShadow><boxGeometry args={[0.3, 0.38, 0.24]} /><Mat color={def.color} kind="plastic" /></mesh>
          <Tape position={[0, 0.2, 0.2]} rotation={[0, 0, 0]} size={[0.32, 0.42, 0.08]} />
          <mesh position={[0, -0.05, -0.38]} rotation={[0.25, 0, 0]}><boxGeometry args={[0.16, 0.36, 0.16]} /><Mat color="#4f8a3a" kind="plastic" /></mesh>
        </group>
      );
    case 'paintcannon':
      return (
        <group>
          <mesh position={[0, 0.2, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.2, 0.26, 1.0, 18]} /><Mat color={def.color} kind="metal" /></mesh>
          <mesh position={[0, 0.2, 0.62]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.05, 8, 20]} /><Mat color="#ffd35c" kind="metal" /></mesh>
          <mesh position={[0, 0.2, 0.6]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.16, 16]} /><meshBasicMaterial color="#ff5fa2" /></mesh>
          <mesh position={[0, 0.2, -0.45]}><sphereGeometry args={[0.27, 16, 12]} /><Mat color={def.color} kind="metal" /></mesh>
          {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.08, -0.05]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 0.08, 14]} /><Mat color="#ffd35c" kind="metal" /></mesh>)}
          <mesh position={[0, 0.5, -0.45]}><cylinderGeometry args={[0.03, 0.03, 0.2, 6]} /><Mat color="#e8453c" kind="rubber" /></mesh>
        </group>
      );
    case 'spraycan':
      return (
        <group>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.82, 20]} />
            <Mat color={def.color} kind="metal" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.265, 0.265, 0.3, 20, 1, true]} />
            <Mat color="#f8f3e2" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.2, 0.26, 0.14, 20]} />
            <Mat color="#4a4a52" kind="plastic" />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.14, 14]} />
            <Mat color="#e8453c" kind="plastic" />
          </mesh>
          <mesh position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.2, 0.24, 16, 1, true]} />
            <Mat color={def.color} kind="glass" opacity={0.55} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
  }
  return null;
}

/** Renders any item as a standalone object (pickups, inventory previews) */
export function ItemMesh({ itemId }: { itemId: string }) {
  const def = ITEMS[itemId];
  if (def.cat === 'wheel') return <Wheel itemId={itemId} />;
  if (def.cat === 'body') {
    return (
      <group scale={0.55} position={[0, 0, 0]}>
        <Body itemId={itemId} />
      </group>
    );
  }
  return <Part itemId={itemId} />;
}
