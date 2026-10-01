import * as THREE from 'three';
import { useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ─── Toon gradient ────────────────────────────────────────────────
function makeGradient() {
  const data = new Uint8Array([70, 70, 70, 255, 140, 140, 140, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
export const GRADIENT = makeGradient();

export type MatKind = 'toon' | 'plastic' | 'metal' | 'matte' | 'rubber' | 'glass';

interface MatProps {
  color: string | THREE.Color;
  kind?: MatKind;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  vertexColors?: boolean;
  flatShading?: boolean;
}

/** Shared material component: toon for organic things, PBR for plastic/metal */
export function Mat({ color, kind = 'plastic', emissive, emissiveIntensity = 0, transparent, opacity, side, vertexColors, flatShading }: MatProps) {
  if (kind === 'toon') {
    return (
      <meshToonMaterial
        color={color}
        gradientMap={GRADIENT}
        emissive={emissive ?? '#000'}
        emissiveIntensity={emissiveIntensity}
        transparent={transparent}
        opacity={opacity}
        side={side}
        vertexColors={vertexColors}
      />
    );
  }
  const p =
    kind === 'metal'
      ? { roughness: 0.35, metalness: 0.85 }
      : kind === 'matte'
        ? { roughness: 0.95, metalness: 0 }
        : kind === 'rubber'
          ? { roughness: 0.8, metalness: 0.05 }
          : kind === 'glass'
            ? { roughness: 0.1, metalness: 0.1 }
            : { roughness: 0.45, metalness: 0.05 };
  return (
    <meshStandardMaterial
      color={color}
      roughness={p.roughness}
      metalness={p.metalness}
      emissive={emissive ?? '#000'}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent ?? (opacity !== undefined && opacity < 1)}
      opacity={opacity ?? 1}
      side={side}
      vertexColors={vertexColors}
      flatShading={flatShading}
    />
  );
}

// ─── Seeded random ───────────────────────────────────────────────
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ─── Geometry deformation helpers ────────────────────────────────
export function deform(geo: THREE.BufferGeometry, fn: (v: THREE.Vector3, i: number) => void) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v, i);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** surface noise — hashes position so shared vertices stay welded */
export function noisy(geo: THREE.BufferGeometry, amp: number, freq = 3, seed = 1) {
  return deform(geo, (v) => {
    const n =
      Math.sin(v.x * freq + seed) * Math.cos(v.y * freq * 1.3 + seed * 2) +
      Math.sin(v.z * freq * 0.8 + v.x * 2 + seed) * 0.6;
    const len = v.length() || 1;
    v.addScaledVector(v.clone().divideScalar(len), n * amp);
  });
}

/** squash top/bottom: amount>0 narrows top */
export function taper(geo: THREE.BufferGeometry, amount: number, axis: 'y' | 'z' = 'y') {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  return deform(geo, (v) => {
    const t = axis === 'y' ? (v.y - bb.min.y) / (bb.max.y - bb.min.y) : (v.z - bb.min.z) / (bb.max.z - bb.min.z);
    const s = 1 - amount * t;
    if (axis === 'y') {
      v.x *= s;
      v.z *= s;
    } else {
      v.x *= s;
      v.y *= s;
    }
  });
}

/** bend along length (z) in direction x */
export function bend(geo: THREE.BufferGeometry, amount: number) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  return deform(geo, (v) => {
    const t = (v.z - bb.min.z) / (bb.max.z - bb.min.z) - 0.5;
    v.x += t * t * amount * 4;
  });
}

/** dents on a shape (e.g. crushed can) */
export function dent(geo: THREE.BufferGeometry, cx: number, cy: number, cz: number, radius: number, depth: number) {
  const c = new THREE.Vector3(cx, cy, cz);
  return deform(geo, (v) => {
    const d = v.distanceTo(c);
    if (d < radius) {
      const f = (1 - d / radius) ** 2 * depth;
      const dir = c.clone().normalize();
      v.addScaledVector(dir, -f);
    }
  });
}

export function roundedBox(w: number, h: number, d: number, r = 0.1, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2));
}

/** Bounds relative to a group, independent of its parents' rotations and scale. */
export function localBounds(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)));
  });
  return bounds;
}

export function useGeo<T extends THREE.BufferGeometry>(fn: () => T, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(fn, deps);
}

// ─── Procedural canvas textures ──────────────────────────────────
export function makeTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 512,
  repeat = 1,
) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function grassTexture(repeat = 24) {
  return makeTexture((ctx, s) => {
    ctx.fillStyle = '#6fae4b';
    ctx.fillRect(0, 0, s, s);
    const r = rng(7);
    for (let i = 0; i < 2600; i++) {
      const x = r() * s;
      const y = r() * s;
      const g = 140 + Math.floor(r() * 60);
      ctx.fillStyle = `rgb(${70 + Math.floor(r() * 40)},${g},${50 + Math.floor(r() * 30)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + r() * 4, 8 + r() * 14, r() * 0.6 - 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = r() > 0.5 ? '#fff4a3' : '#f7f7f7';
      ctx.beginPath();
      ctx.arc(r() * s, r() * s, 1.6 + r() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512, repeat);
}

export function woodTexture(repeat = 6) {
  return makeTexture((ctx, s) => {
    ctx.fillStyle = '#c99a63';
    ctx.fillRect(0, 0, s, s);
    const r = rng(3);
    const planks = 6;
    const ph = s / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph;
      const base = 180 + Math.floor(r() * 30);
      ctx.fillStyle = `rgb(${base + 10},${base - 50},${base - 100})`;
      ctx.fillRect(0, y0, s, ph);
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `rgba(90,50,20,${0.08 + r() * 0.12})`;
        ctx.lineWidth = 1 + r() * 2;
        ctx.beginPath();
        const yy = y0 + r() * ph;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(s * 0.3, yy + (r() - 0.5) * 12, s * 0.7, yy + (r() - 0.5) * 12, s, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60,30,10,0.45)';
      ctx.fillRect(0, y0 + ph - 3, s, 3);
    }
  }, 512, repeat);
}

export function soilTexture(repeat = 10) {
  return makeTexture((ctx, s) => {
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(0, 0, s, s);
    const r = rng(11);
    for (let i = 0; i < 2000; i++) {
      const v = 90 + Math.floor(r() * 70);
      ctx.fillStyle = `rgba(${v + 30},${v},${v - 30},0.6)`;
      ctx.beginPath();
      ctx.arc(r() * s, r() * s, 1 + r() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512, repeat);
}
