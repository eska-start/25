import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GRADIENT, Mat, deform, noisy, roundedBox, rng, taper } from './materials';
import { Part } from './Parts';

type V3 = [number, number, number];

export function PetBottle({ position, rotation = [0, 0, 0], scale = 1, tint = '#bfe6ff', cap = '#2d7ddb' }: { position: V3; rotation?: V3; scale?: number; tint?: string; cap?: string }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1.6, 1.7, 9, 32, 24);
    deform(g, (v) => {
      const t = (v.y + 4.5) / 9;
      let s = 1;
      if (t > 0.78) s = 1 - (t - 0.78) * 1.9; // shoulder
      if (t > 0.35 && t < 0.62) s *= 0.93 + Math.sin((t - 0.35) / 0.27 * Math.PI) * 0.04; // grip waist ribs
      const ribs = Math.sin(t * 90) * 0.012;
      v.x *= s + ribs;
      v.z *= s + ribs;
    });
    return g;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} position={[0, 4.5, 0]} castShadow>
        <meshPhysicalMaterial color={tint} transparent opacity={0.45} roughness={0.15} metalness={0} transmission={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 9.6, 0]}>
        <cylinderGeometry args={[0.6, 0.65, 1.4, 24]} />
        <meshPhysicalMaterial color={tint} transparent opacity={0.5} roughness={0.15} />
      </mesh>
      <mesh position={[0, 10.5, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.6, 24]} />
        <Mat color={cap} kind="plastic" />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1.66, 1.68, 2.2, 32, 1, true]} />
        <Mat color="#ffffff" kind="plastic" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1.69, 1.7, 0.8, 32, 1, true]} />
        <Mat color={cap} kind="plastic" side={THREE.DoubleSide} />
      </mesh>
      {/* water inside */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[1.45, 1.55, 3.1, 24]} />
        <meshPhysicalMaterial color="#5fc0ff" transparent opacity={0.55} roughness={0.05} />
      </mesh>
    </group>
  );
}

export function GiantCan({ position, rotation = [0, 0, 0], color = '#e2362f', label = '#f9f3e3', scale = 1 }: { position: V3; rotation?: V3; color?: string; label?: string; scale?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1.5, 1.5, 5, 36, 10);
    deform(g, (v) => {
      const ay = Math.abs(v.y);
      if (ay > 2.3) {
        const s = ay > 2.48 ? 0.88 : 0.94;
        v.x *= s;
        v.z *= s;
      }
    });
    const c = new THREE.Vector3(1.2, 0.6, 1.0);
    deform(g, (v) => {
      const d = v.distanceTo(c);
      if (d < 1.5) v.addScaledVector(c.clone().normalize(), -((1 - d / 1.5) ** 2) * 0.5);
    });
    return g;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} position={[0, 2.5, 0]} castShadow receiveShadow>
        <Mat color={color} kind="metal" />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[1.52, 1.52, 2.2, 36, 1, true]} />
        <Mat color={label} kind="plastic" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 5.0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.1, 32]} />
        <Mat color="#c9cfd6" kind="metal" />
      </mesh>
      <mesh position={[0.2, 5.07, 0.3]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.05, 1]} />
        <Mat color="#b0b7bf" kind="metal" />
      </mesh>
    </group>
  );
}

export function Pencil({ position, rotation = [0, 0, 0], length = 16, color = '#f2c230' }: { position: V3; rotation?: V3; length?: number; color?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, length, 6]} />
        <Mat color={color} kind="plastic" flatShading />
      </mesh>
      <mesh position={[0, length / 2 + 0.9, 0]}>
        <coneGeometry args={[0.6, 1.8, 6]} />
        <Mat color="#e6c79c" kind="matte" flatShading />
      </mesh>
      <mesh position={[0, length / 2 + 2.0, 0]}>
        <coneGeometry args={[0.18, 0.5, 8]} />
        <Mat color="#333" kind="matte" />
      </mesh>
      <mesh position={[0, -length / 2 - 0.4, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.9, 16]} />
        <Mat color="#c9ccd1" kind="metal" />
      </mesh>
      <mesh position={[0, -length / 2 - 1.2, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.8, 16]} />
        <Mat color="#f6a5b7" kind="matte" />
      </mesh>
    </group>
  );
}

export function FlowerPot({ position, scale = 1, flower = '#ff6f91' }: { position: V3; scale?: number; flower?: string }) {
  const leafGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 12);
    g.scale(2.6, 0.12, 1.2);
    deform(g, (v) => {
      v.y += v.x * v.x * 0.12 - Math.abs(v.z) * 0.2;
    });
    return g;
  }, []);
  const potGeo = useMemo(() => noisy(new THREE.CylinderGeometry(3.2, 2.4, 5, 36, 8), 0.02, 3, 5), []);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={potGeo} position={[0, 2.5, 0]} castShadow receiveShadow>
        <Mat color="#c96a3b" kind="matte" />
      </mesh>
      <mesh position={[0, 4.75, 0]}>
        <cylinderGeometry args={[3.45, 3.3, 0.7, 36]} />
        <Mat color="#d57a48" kind="matte" />
      </mesh>
      <mesh position={[0, 5.0, 0]}>
        <cylinderGeometry args={[3.0, 3.0, 0.3, 36]} />
        <Mat color="#4a3426" kind="matte" />
      </mesh>
      {/* plant */}
      <mesh position={[0, 7.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.3, 5.5, 10]} />
        <Mat color="#4f9b3a" kind="toon" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={leafGeo} position={[Math.cos(i * 1.26) * 1.4, 6 + i * 0.5, Math.sin(i * 1.26) * 1.4]} rotation={[0, -i * 1.26, -0.5]} castShadow>
          <Mat color={i % 2 ? '#5fae3f' : '#6cc04a'} kind="toon" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <group position={[0, 10.4, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.05) * 0.9, 0, Math.sin(i * 1.05) * 0.9]} rotation={[Math.PI / 2, 0, -i * 1.05]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.7, 14, 10]} />
            <Mat color={flower} kind="toon" />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.6, 14, 10]} />
          <Mat color="#ffd54f" kind="toon" />
        </mesh>
      </group>
    </group>
  );
}

export function CardboardBox({ position, rotation = [0, 0, 0], size = [6, 5, 6], open = false }: { position: V3; rotation?: V3; size?: V3; open?: boolean }) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat color="#c9a46b" kind="matte" />
      </mesh>
      {open ? (
        <>
          <mesh position={[-w / 2, h, 0]} rotation={[0, 0, 1.2]}>
            <boxGeometry args={[w / 2, 0.08, d]} />
            <Mat color="#b48f58" kind="matte" />
          </mesh>
          <mesh position={[w / 2, h, 0]} rotation={[0, 0, -1.0]}>
            <boxGeometry args={[w / 2, 0.08, d]} />
            <Mat color="#b48f58" kind="matte" />
          </mesh>
          <mesh position={[0, h - 0.4, 0]}>
            <boxGeometry args={[w - 0.3, 0.1, d - 0.3]} />
            <Mat color="#5b4425" kind="matte" />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h + 0.02, 0]}>
            <boxGeometry args={[0.9, 0.04, d + 0.1]} />
            <Mat color="#dcc29a" kind="matte" opacity={0.9} transparent />
          </mesh>
          <mesh position={[0, h / 2, d / 2 + 0.02]}>
            <boxGeometry args={[w * 0.6, h * 0.3, 0.02]} />
            <Mat color="#fff" kind="matte" />
          </mesh>
          <mesh position={[0, h / 2 + 0.3, d / 2 + 0.04]}>
            <boxGeometry args={[w * 0.4, h * 0.06, 0.02]} />
            <Mat color="#e35b4f" kind="matte" />
          </mesh>
        </>
      )}
    </group>
  );
}

export function Shoe({ position, rotation = [0, 0, 0], color = '#3b6fd6', scale = 1 }: { position: V3; rotation?: V3; color?: string; scale?: number }) {
  const geo = useMemo(() => {
    const g = roundedBox(4, 3.2, 10, 1.2, 5);
    deform(g, (v) => {
      const t = (v.z + 5) / 10; // 0 heel .. 1 toe
      if (t > 0.6) v.y *= 1 - (t - 0.6) * 1.3; // toe slopes down
      if (t < 0.25) v.y *= 1 + (0.25 - t) * 0.6; // heel collar
      if (v.y > 1.2 && t > 0.3 && t < 0.75) v.y -= 0.6 * Math.sin(((t - 0.3) / 0.45) * Math.PI); // tongue dip
      v.x *= 1 - Math.abs(t - 0.6) * 0.25;
    });
    g.translate(0, 1.6, 0);
    return g;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} castShadow receiveShadow>
        <Mat color={color} kind="matte" />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[4.3, 0.8, 10.4]} />
        <Mat color="#f4f1ea" kind="plastic" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[4.35, 0.3, 10.5]} />
        <Mat color="#d9a066" kind="rubber" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 2.9 - i * 0.25, 0.4 + i * 0.9]} rotation={[0.3, 0, i % 2 ? 0.3 : -0.3]}>
          <boxGeometry args={[1.6, 0.12, 0.3]} />
          <Mat color="#fff" kind="matte" />
        </mesh>
      ))}
      <mesh position={[2.05, 1.6, -0.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.06, 0.6, 3]} />
        <Mat color="#fff" kind="matte" />
      </mesh>
    </group>
  );
}

export function Stone({ position, scale = 1, seed = 1, color = '#8e9196' }: { position: V3; scale?: number; seed?: number; color?: string }) {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const r = rng(seed);
    const sx = 0.8 + r() * 0.6;
    const sz = 0.8 + r() * 0.6;
    g.scale(sx, 0.7, sz);
    return noisy(g, 0.12, 2.2, seed);
  }, [seed]);
  return (
    <mesh geometry={geo} position={position} scale={scale} castShadow receiveShadow>
      <Mat color={color} kind="matte" flatShading />
    </mesh>
  );
}

export function GiantLeaf({ position, rotation = [0, 0, 0], scale = 1, color = '#6cc04a' }: { position: V3; rotation?: V3; scale?: number; color?: string }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 24, 12);
    g.scale(3, 0.1, 1.6);
    deform(g, (v) => {
      v.y += v.x * v.x * 0.1 + Math.abs(v.z) * 0.25 - 0.1;
      if (v.x > 1.8) v.z *= 0.5;
    });
    return g;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} castShadow receiveShadow>
        <Mat color={color} kind="toon" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 5.6, 8]} />
        <Mat color="#4f8f3a" kind="matte" />
      </mesh>
    </group>
  );
}

export function Hose({ points, color = '#3ea35b', radius = 0.6 }: { points: V3[]; color?: string; radius?: number }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 64, radius, 12, false);
  }, [points, radius]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <Mat color={color} kind="rubber" />
    </mesh>
  );
}

export function ToyCar({ position, rotation = [0, 0, 0], color = '#ff5252', scale = 1 }: { position: V3; rotation?: V3; color?: string; scale?: number }) {
  const geo = useMemo(() => taper(roundedBox(2.4, 1.0, 4.6, 0.35, 4), 0.1), []);
  const cabin = useMemo(() => taper(roundedBox(2.0, 1.0, 2.4, 0.4, 4), 0.3), []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} position={[0, 1.1, 0]} castShadow>
        <Mat color={color} kind="plastic" />
      </mesh>
      <mesh geometry={cabin} position={[0, 2.0, -0.3]} castShadow>
        <Mat color={color} kind="plastic" />
      </mesh>
      <mesh position={[0, 2.05, -0.3]}>
        <boxGeometry args={[2.05, 0.6, 2.0]} />
        <Mat color="#a8e1ff" kind="glass" />
      </mesh>
      {[[-1.25, 1.4], [1.25, 1.4], [-1.25, -1.4], [1.25, -1.4]].map(([x, z], i) => (
        <group key={i} position={[x, 0.6, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.5, 20]} />
            <Mat color="#2b2b30" kind="rubber" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.35, 0.35, 0.54, 16]} />
            <Mat color="#eceff1" kind="plastic" />
          </mesh>
        </group>
      ))}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.2, 2.3]}>
          <sphereGeometry args={[0.22, 12, 10]} />
          <Mat color="#fff8c4" kind="plastic" emissive="#fff3a0" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function BigPart({ itemId, position, rotation = [0, 0, 0], scale = 4 }: { itemId: string; position: V3; rotation?: V3; scale?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Part itemId={itemId} />
    </group>
  );
}

export function Fence({ radius, segments = 48, height = 5 }: { radius: number; segments?: number; height?: number }) {
  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => {
        const a = (i / segments) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const h = height + Math.sin(i * 7.3) * 0.5;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -a, 0]}>
            <mesh position={[0, h / 2, 0]} castShadow>
              <boxGeometry args={[0.5, h, (Math.PI * 2 * radius) / segments * 0.72]} />
              <Mat color={i % 3 === 0 ? '#c69a68' : '#b98c5c'} kind="matte" />
            </mesh>
            <mesh position={[0, h, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.5, 0.5, (Math.PI * 2 * radius) / segments * 0.72]} />
              <Mat color="#b98c5c" kind="matte" />
            </mesh>
          </group>
        );
      })}
      {[height * 0.3, height * 0.7].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius - 0.3, 0.18, 6, 96]} />
          <Mat color="#a97d4e" kind="matte" />
        </mesh>
      ))}
    </group>
  );
}

export function GrassTufts({ count = 120, radius = 50, inner = 0, seed = 3 }: { count?: number; radius?: number; inner?: number; seed?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const total = count * 3;
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const r = rng(seed);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    let idx = 0;
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = inner + r() * (radius - inner);
      const s = 0.6 + r() * 0.9;
      const rot = r() * Math.PI;
      const c = r() > 0.5 ? '#7cc45a' : '#6ab34c';
      for (let k = 0; k < 3; k++) {
        dummy.position.set(Math.cos(a) * d + Math.cos(rot) * (k - 1) * 0.25 * s, 0.5 * s, Math.sin(a) * d - Math.sin(rot) * (k - 1) * 0.25 * s);
        dummy.rotation.set(0, rot, (k - 1) * 0.35);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        m.setMatrixAt(idx, dummy.matrix);
        m.setColorAt(idx, col.set(c));
        idx++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count, radius, inner, seed]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, total]} castShadow>
      <coneGeometry args={[0.16, 1.1, 5]} />
      <meshToonMaterial gradientMap={GRADIENT} color="#ffffff" />
    </instancedMesh>
  );
}

export function Mushroom({ position, scale = 1, color = '#e74c3c' }: { position: V3; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.6, 1.6, 14]} />
        <Mat color="#f6ead6" kind="toon" />
      </mesh>
      <mesh position={[0, 1.7, 0]} scale={[1, 0.65, 1]} castShadow>
        <sphereGeometry args={[1.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={color} kind="toon" />
      </mesh>
      {[[0.5, 0.3], [-0.6, 0.1], [0.1, -0.7], [-0.2, 0.8]].map(([x, z], i) => (
        <mesh key={i} position={[x, 2.2 - (x * x + z * z) * 0.35, z]} scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <Mat color="#fff" kind="toon" />
        </mesh>
      ))}
    </group>
  );
}
