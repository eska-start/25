/**
 * Port of the original 얼음땡 (eska-start/ice) character builder.
 * Same palettes, proportions, face layout, ears, tails, shirt/shorts outfit and toon outlines.
 * Only game-specific FX of the tag game (ice block, ufo, scooter…) are omitted.
 */
import * as THREE from 'three';

export type Animal = 'dog' | 'cat' | 'rabbit' | 'bear' | 'fox' | 'penguin' | 'deer' | 'hamster' | 'tanuki' | 'panda';
type TexName = 'fur' | 'soft' | 'stripe' | 'dots' | 'fabric' | 'bark';

export interface CharModel {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  eyes: THREE.Mesh[];
  stars: THREE.Group;
}

// ─── textures (procedural, multiplied by base colour) ────────────
const texCache: Record<string, THREE.Texture> = {};
function patternTex(name: TexName, rx = 1, ry = 1): THREE.Texture {
  const key = `${name}_${rx}_${ry}`;
  if (texCache[key]) return texCache[key];
  const baseKey = `${name}_base`;
  let base = texCache[baseKey];
  if (!base) {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, s, s);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (name === 'fur' || name === 'soft') {
      const n = name === 'fur' ? 900 : 300;
      for (let i = 0; i < n; i++) {
        const v = 228 + Math.floor(r() * 27);
        g.strokeStyle = `rgb(${v},${v},${v})`;
        g.lineWidth = 1 + r();
        const x = r() * s;
        const y = r() * s;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 4, y + 3 + r() * 5);
        g.stroke();
      }
    } else if (name === 'stripe') {
      for (let y = 0; y < s; y += 32) {
        g.fillStyle = '#d9d9d9';
        g.fillRect(0, y, s, 14);
      }
    } else if (name === 'dots') {
      g.fillStyle = '#dcdcdc';
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          g.beginPath();
          g.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 16, 6, 0, Math.PI * 2);
          g.fill();
        }
    } else if (name === 'fabric') {
      for (let i = 0; i < s; i += 4) {
        g.fillStyle = i % 8 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.09)';
        g.fillRect(i, 0, 2, s);
        g.fillRect(0, i, s, 2);
      }
    } else if (name === 'bark') {
      for (let i = 0; i < 60; i++) {
        g.strokeStyle = `rgba(60,30,10,${0.1 + r() * 0.2})`;
        g.lineWidth = 2;
        const x = r() * s;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + (r() - 0.5) * 10, s);
        g.stroke();
      }
    }
    base = new THREE.CanvasTexture(c);
    base.colorSpace = THREE.SRGBColorSpace;
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    texCache[baseKey] = base;
  }
  if (rx === 1 && ry === 1) return base;
  const t = base.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  texCache[key] = t;
  return t;
}

function gradient(steps: number[]) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const CHAR_GRAD = gradient([150, 205, 255]);
const FACE_GRAD = gradient([195, 240, 255]);

interface StdOpts {
  tex?: TexName;
  rx?: number;
  ry?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  unique?: boolean;
  kind?: 'char';
  spec?: number;
  rim?: number;
  step?: number;
  rough?: number;
}
const matCache: Record<string, THREE.Material> = {};
function std(color: number, o: StdOpts = {}): THREE.MeshToonMaterial {
  const key = `${color}_${JSON.stringify(o)}`;
  if (!o.unique && matCache[key]) return matCache[key] as THREE.MeshToonMaterial;
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: o.step !== undefined ? FACE_GRAD : CHAR_GRAD,
    map: o.tex ? patternTex(o.tex, o.rx ?? 1, o.ry ?? 1) : null,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    depthWrite: o.depthWrite ?? true,
  });
  if (o.spec && o.spec > 1) m.emissive = new THREE.Color(0x111111);
  if (!o.unique) matCache[key] = m;
  return m;
}

// ─── outlines (inverted hull) ────────────────────────────────────
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x3a2622, side: THREE.BackSide });
OUTLINE_MAT.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position) + normalize(normal) * 0.016;');
};
function addCharOutlines(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.noOutline) return;
    const mat = m.material as THREE.Material;
    if (mat.transparent || mat instanceof THREE.MeshBasicMaterial) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    if ((m.geometry.boundingSphere?.radius ?? 0) < 0.06) return;
    meshes.push(m);
  });
  meshes.forEach((m) => {
    const o = new THREE.Mesh(m.geometry, OUTLINE_MAT);
    o.userData.noOutline = true;
    o.castShadow = false;
    m.add(o);
  });
}

// ─── geometry cache ──────────────────────────────────────────────
const geoCache: Record<string, THREE.BufferGeometry> = {};
const sphere = (r: number, w = 28, h = 20) => (geoCache[`s${r}_${w}_${h}`] ??= new THREE.SphereGeometry(r, w, h));
const capsule = (r: number, len: number) => (geoCache[`cap${r}_${len}`] ??= new THREE.CapsuleGeometry(r, len, 6, 14));
const cyl = (rt: number, rb: number, h: number, s = 16) => (geoCache[`c${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s));
const cone = (r: number, h: number, s = 16) => (geoCache[`k${r}_${h}_${s}`] ??= new THREE.ConeGeometry(r, h, s));

interface Palette { fur: number; face: number; accent: number; inner: number; shoe: number; pattern: TexName }
export const PAL: Record<Animal, Palette> = {
  dog: { fur: 0xf0cf9a, face: 0xfff6e6, accent: 0xa8733f, inner: 0xe8b98a, shoe: 0x6b4a33, pattern: 'stripe' },
  cat: { fur: 0xf6ae63, face: 0xfff1de, accent: 0xd97d33, inner: 0xffb9c4, shoe: 0x7a4d8f, pattern: 'dots' },
  rabbit: { fur: 0xfbf8f5, face: 0xffffff, accent: 0xf2d7d0, inner: 0xffb6c8, shoe: 0xe0708e, pattern: 'dots' },
  bear: { fur: 0xa8763f, face: 0xefd2a6, accent: 0x6b4522, inner: 0x7a5230, shoe: 0x4a3a2c, pattern: 'fabric' },
  fox: { fur: 0xf0873a, face: 0xfff8ee, accent: 0x3b2a22, inner: 0xffd9c0, shoe: 0x3b2a22, pattern: 'stripe' },
  penguin: { fur: 0x34466b, face: 0xffffff, accent: 0xffb13b, inner: 0xffffff, shoe: 0xffa41f, pattern: 'fabric' },
  deer: { fur: 0xcc955a, face: 0xf8e8d2, accent: 0x7a5230, inner: 0xf6c8a8, shoe: 0x5a3f2a, pattern: 'fabric' },
  hamster: { fur: 0xf6c56e, face: 0xfff4de, accent: 0xd8913a, inner: 0xffc2cf, shoe: 0xd35b6b, pattern: 'dots' },
  tanuki: { fur: 0x9c8872, face: 0xf5e8d4, accent: 0x3e3129, inner: 0x5a4a3c, shoe: 0x3e3129, pattern: 'fabric' },
  panda: { fur: 0xfbfbfb, face: 0xffffff, accent: 0x26262b, inner: 0x26262b, shoe: 0x26262b, pattern: 'stripe' },
};
const MUZZLE: Record<Animal, [number, number, number]> = {
  dog: [1.1, 0.95, 1.05], cat: [0.82, 0.72, 0.75], rabbit: [0.72, 0.68, 0.7], bear: [1.05, 0.9, 1.0], fox: [0.9, 0.8, 1.15],
  penguin: [0, 0, 0], deer: [0.95, 0.85, 1.0], hamster: [0.78, 0.7, 0.7], tanuki: [0.95, 0.82, 0.95], panda: [0.92, 0.8, 0.85],
};

function mk(g: THREE.BufferGeometry, m: THREE.Material, cast = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = cast;
  return o;
}

const HR = 0.52, HSX = 1.1, HSY = 0.95, HSZ = 1.0;
function surfZ(x: number, y: number) {
  const sx = HR * HSX, sy = HR * HSY, sz = HR * HSZ;
  return sz * Math.sqrt(Math.max(0, 1 - (x / sx) ** 2 - (y / sy) ** 2));
}
function onFace(m: THREE.Object3D, x: number, y: number, lift = 0) {
  const z = surfZ(x, y) + lift;
  m.position.set(x, y, z);
  const nx = x / (HSX * HSX), ny = y / (HSY * HSY), nz = z / (HSZ * HSZ);
  m.rotation.set(-Math.atan2(ny, Math.hypot(nx, nz)), Math.atan2(nx, nz), 0, 'YXZ');
  return m;
}

let starGeo: THREE.BufferGeometry | null = null;
function makeStarGeo(r: number) {
  if (starGeo) return starGeo;
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.closePath();
  starGeo = new THREE.ExtrudeGeometry(shape, { depth: r * 0.4, bevelEnabled: true, bevelThickness: r * 0.12, bevelSize: r * 0.1, bevelSegments: 2 });
  starGeo.center();
  return starGeo;
}

export function buildCharacter(animal: Animal, jersey: number, pants: number): CharModel {
  const P = PAL[animal];
  const furMat = std(P.fur, { tex: 'fur', rx: 2 });
  const faceMat = std(P.face, { tex: 'fur', rx: 2, step: 0.28 });
  const accMat = std(P.accent, { tex: 'fur', rx: 2 });
  const innerMat = std(P.inner, { tex: 'soft' });
  const shirtMat = std(jersey, { kind: 'char', tex: P.pattern, rx: 3, ry: 3, unique: true });
  const pantsMat = std(pants, { kind: 'char', tex: 'fabric', rx: 3, ry: 3, unique: true });
  const shoeMat = std(P.shoe, { kind: 'char', spec: 0.55 });
  const eyeMat = std(0x1d1614, { kind: 'char', spec: 1.3, rim: 0, step: 0.2 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = std(0xff8fa3, { transparent: true, opacity: 0.55, depthWrite: false });
  const noseMat = std(animal === 'rabbit' || animal === 'hamster' ? 0xff8fab : 0x2b1f1c, { kind: 'char', spec: 1.1 });
  const isPenguin = animal === 'penguin';
  const isPanda = animal === 'panda';
  const limbMat = isPanda ? accMat : furMat;

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // legs
  const mkLeg = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.34, 0);
    const l = mk(capsule(0.095, 0.14), isPenguin ? std(P.accent, { tex: 'soft' }) : limbMat);
    l.position.y = -0.13;
    g.add(l);
    const shoe = mk(sphere(0.13, 20, 14), shoeMat);
    shoe.scale.set(1, 0.62, 1.38);
    shoe.position.set(0, -0.27, 0.05);
    g.add(shoe);
    const sole = mk(cyl(0.12, 0.12, 0.03, 16), std(0xf4efe6));
    sole.scale.set(1, 1, 1.35);
    sole.position.set(0, -0.32, 0.05);
    g.add(sole);
    body.add(g);
    return g;
  };
  const legL = mkLeg(0.15);
  const legR = mkLeg(-0.15);

  // torso
  const torso = mk(sphere(0.36), shirtMat);
  torso.scale.set(1, 1.02, 0.9);
  torso.position.y = 0.64;
  body.add(torso);
  const shorts = mk(sphere(0.345), pantsMat);
  shorts.scale.set(1.03, 0.56, 0.92);
  shorts.position.y = 0.46;
  body.add(shorts);
  if (isPenguin) {
    const belly = mk(sphere(0.26), faceMat);
    belly.scale.set(1, 1.1, 0.5);
    belly.position.set(0, 0.64, 0.2);
    body.add(belly);
  }
  const collar = mk(new THREE.TorusGeometry(0.19, 0.055, 10, 28), std(0xffffff, { tex: 'fabric', rx: 2 }));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.93;
  body.add(collar);
  if (!isPenguin) {
    for (let i = 0; i < 2; i++) {
      const b = mk(sphere(0.028, 10, 8), std(0xffffff, { rough: 0.3 }), false);
      b.position.set(0, 0.8 - i * 0.13, 0.32 - i * 0.005);
      body.add(b);
    }
  }
  const emblem = mk(new THREE.CircleGeometry(0.07, 20), std(0xffffff, { rough: 0.6 }), false);
  emblem.position.set(-0.15, 0.78, 0.305);
  emblem.rotation.y = -0.45;
  body.add(emblem);

  // arms
  const mkArm = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.86, 0);
    const sleeve = mk(sphere(0.125, 18, 14), isPenguin ? furMat : shirtMat);
    sleeve.scale.set(1, 1.05, 1);
    sleeve.position.y = -0.04;
    g.add(sleeve);
    if (isPenguin) {
      const flip = mk(sphere(0.1, 18, 14), furMat);
      flip.scale.set(0.55, 1.8, 1);
      flip.position.y = -0.2;
      g.add(flip);
    } else {
      const a = mk(capsule(0.072, 0.14), limbMat);
      a.position.y = -0.17;
      g.add(a);
      const h = mk(sphere(0.095, 18, 14), limbMat);
      h.position.y = -0.31;
      g.add(h);
    }
    body.add(g);
    return g;
  };
  const armL = mkArm(0.34);
  const armR = mkArm(-0.34);
  armL.rotation.z = 0.25;
  armR.rotation.z = -0.25;

  // head
  const head = new THREE.Group();
  head.position.y = 1.28;
  body.add(head);
  const skull = mk(sphere(HR, 36, 28), furMat);
  skull.scale.set(HSX, HSY, HSZ);
  head.add(skull);

  if (isPenguin) {
    for (const s of [-1, 1]) {
      const m = mk(sphere(0.22, 20, 16), faceMat, false);
      m.scale.set(1, 1.15, 0.3);
      onFace(m, s * 0.14, -0.02, -0.058);
      m.userData.noOutline = true;
      head.add(m);
    }
  }
  const darkEyes = isPanda || animal === 'tanuki';
  if (darkEyes) {
    for (const s of [-1, 1]) {
      const m = mk(sphere(0.12, 18, 14), accMat, false);
      m.scale.set(isPanda ? 0.95 : 1.35, isPanda ? 1.25 : 0.8, 0.3);
      onFace(m, s * 0.19, 0.02, -0.028);
      m.rotateZ(s * (isPanda ? -0.5 : 0.1));
      m.userData.noOutline = true;
      head.add(m);
    }
  }

  const [mx, my, mz] = MUZZLE[animal];
  let muzzleFront = surfZ(0, -0.12);
  if (mx > 0) {
    const muz = mk(sphere(0.2, 28, 20), faceMat);
    muz.scale.set(1.25 * mx, 0.85 * my, 0.8 * mz);
    const zc = surfZ(0, -0.12) - 0.06;
    muz.position.set(0, -0.12, zc);
    head.add(muz);
    muzzleFront = zc + 0.16 * mz;
  }

  const eyes: THREE.Mesh[] = [];
  const eyeLift = darkEyes ? 0.012 : isPenguin ? 0.0 : -0.018;
  for (const s of [-1, 1]) {
    if (darkEyes) {
      const sclera = mk(sphere(0.088, 18, 14), std(0xffffff, { rough: 0.3 }), false);
      sclera.scale.set(0.95, 1.15, 0.3);
      onFace(sclera, s * 0.19, 0.04, 0.004);
      sclera.userData.noOutline = true;
      head.add(sclera);
    }
    const e = mk(sphere(0.075, 20, 16), eyeMat, false);
    onFace(e, s * 0.19, 0.04, eyeLift);
    e.scale.set(0.85, 1.15, 0.45);
    e.userData.noOutline = true;
    const sh1 = new THREE.Mesh(sphere(0.024, 10, 8), shineMat);
    sh1.position.set(0.022, 0.03, 0.072);
    e.add(sh1);
    const sh2 = new THREE.Mesh(sphere(0.011, 8, 6), shineMat);
    sh2.position.set(-0.02, -0.03, 0.074);
    e.add(sh2);
    head.add(e);
    eyes.push(e);
    const brow = mk(capsule(0.016, 0.06), std(isPanda ? 0x26262b : P.accent, { tex: 'soft' }), false);
    onFace(brow, s * 0.2, 0.17, 0.004);
    brow.rotateZ(Math.PI / 2 + s * 0.18);
    head.add(brow);
    const bl = mk(sphere(0.07, 16, 10), blushMat, false);
    bl.scale.set(1.3, 0.75, 0.25);
    onFace(bl, s * 0.33, -0.1, -0.005);
    head.add(bl);
  }

  if (isPenguin) {
    const beak = mk(cone(0.075, 0.2, 14), std(P.accent, { rough: 0.4 }));
    beak.rotation.x = Math.PI / 2;
    beak.scale.set(1.3, 1, 0.7);
    beak.position.set(0, -0.1, surfZ(0, -0.1) + 0.07);
    head.add(beak);
  } else {
    const nose = mk(sphere(0.052, 16, 12), noseMat, false);
    nose.scale.set(1.35, 1, 0.9);
    nose.position.set(0, mx > 0 ? -0.065 : -0.07, muzzleFront - 0.01);
    head.add(nose);
    const mouth = mk(new THREE.TorusGeometry(0.042, 0.011, 6, 14, Math.PI), std(0x3a2522, { rough: 0.5 }), false);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.155, muzzleFront - (mx > 0 ? 0.025 : 0.04));
    head.add(mouth);
    if (animal === 'rabbit' || animal === 'hamster') {
      const teeth = mk(new THREE.BoxGeometry(0.05, 0.04, 0.015), std(0xffffff, { rough: 0.3 }), false);
      teeth.position.set(0, -0.19, muzzleFront - 0.03);
      head.add(teeth);
    }
  }
  if (animal === 'cat' || animal === 'fox') {
    const wm = std(0x5a4a44);
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const w = mk(cyl(0.004, 0.004, 0.2, 4), wm, false);
        w.rotation.z = Math.PI / 2 + s * (i - 1) * 0.18;
        w.position.set(s * 0.22, -0.11 + (i - 1) * 0.03, muzzleFront - 0.06);
        head.add(w);
      }
  }

  // ears / horns
  if (animal === 'bear' || animal === 'tanuki' || isPanda || animal === 'hamster') {
    const r = animal === 'hamster' ? 0.12 : 0.15;
    for (const s of [-1, 1]) {
      const e = mk(sphere(r, 20, 16), isPanda ? accMat : furMat);
      e.scale.set(1, 1, 0.55);
      e.position.set(s * 0.36, 0.36, -0.04);
      e.rotation.z = -s * 0.3;
      head.add(e);
      const i = mk(sphere(r * 0.6, 16, 12), animal === 'bear' || animal === 'tanuki' ? std(P.inner, { tex: 'fur' }) : isPanda ? accMat : innerMat, false);
      i.scale.set(1, 1, 0.4);
      i.position.set(s * 0.36, 0.36, 0.02);
      i.rotation.z = -s * 0.3;
      head.add(i);
    }
  } else if (animal === 'rabbit') {
    for (const s of [-1, 1]) {
      const e = mk(capsule(0.1, 0.36), furMat);
      e.scale.set(0.95, 1, 0.55);
      e.position.set(s * 0.17, 0.66, -0.05);
      e.rotation.z = -s * 0.14;
      head.add(e);
      const i = mk(capsule(0.055, 0.3), innerMat, false);
      i.scale.set(1, 1, 0.4);
      i.position.set(s * 0.17, 0.66, 0.0);
      i.rotation.z = -s * 0.14;
      head.add(i);
    }
  } else if (animal === 'cat' || animal === 'fox') {
    const h = animal === 'fox' ? 0.34 : 0.27;
    for (const s of [-1, 1]) {
      const e = mk(cone(0.15, h, 18), furMat);
      e.scale.set(1, 1, 0.55);
      e.position.set(s * 0.3, 0.42 + (h - 0.27) / 2, -0.03);
      e.rotation.z = -s * 0.32;
      head.add(e);
      const i = mk(cone(0.09, h * 0.7, 14), innerMat, false);
      i.scale.set(1, 1, 0.4);
      i.position.set(s * 0.3, 0.4 + (h - 0.27) / 2, 0.02);
      i.rotation.z = -s * 0.32;
      head.add(i);
      if (animal === 'fox') {
        const tip = mk(cone(0.07, 0.12, 12), accMat, false);
        tip.scale.set(1, 1, 0.6);
        tip.position.set(s * 0.36, 0.6, -0.03);
        tip.rotation.z = -s * 0.32;
        head.add(tip);
      }
    }
    if (animal === 'cat') {
      for (let k = -1; k <= 1; k++) {
        const st = mk(capsule(0.02, 0.08), accMat, false);
        onFace(st, k * 0.07, 0.36, 0.002);
        head.add(st);
      }
    }
  } else if (animal === 'dog') {
    for (const s of [-1, 1]) {
      const e = mk(sphere(0.17, 20, 16), accMat);
      e.scale.set(0.55, 1.25, 0.5);
      e.position.set(s * 0.52, 0.05, -0.02);
      e.rotation.z = s * 0.32;
      head.add(e);
    }
    const patch = mk(sphere(0.1, 16, 12), accMat, false);
    patch.scale.set(1.2, 1, 0.3);
    onFace(patch, 0.22, 0.1, -0.03);
    patch.userData.noOutline = true;
    head.add(patch);
  } else if (animal === 'deer') {
    const antler = std(0x8a6038, { tex: 'bark' });
    for (const s of [-1, 1]) {
      const e = mk(sphere(0.13, 16, 12), furMat);
      e.scale.set(0.5, 0.95, 0.35);
      e.position.set(s * 0.52, 0.16, -0.02);
      e.rotation.z = s * 0.9;
      head.add(e);
      const main = mk(capsule(0.035, 0.36), antler);
      main.position.set(s * 0.22, 0.64, -0.06);
      main.rotation.z = -s * 0.35;
      head.add(main);
      const br = mk(capsule(0.03, 0.16), antler);
      br.position.set(s * 0.34, 0.74, -0.06);
      br.rotation.z = -s * 1.1;
      head.add(br);
    }
    for (let i = 0; i < 3; i++) {
      const sp = mk(sphere(0.035, 10, 8), std(0xfff5e6, { tex: 'soft' }), false);
      onFace(sp, (i - 1) * 0.14, 0.34, 0.0);
      head.add(sp);
    }
  } else if (isPenguin) {
    for (let i = 0; i < 3; i++) {
      const t = mk(cone(0.04, 0.16, 10), furMat);
      t.position.set((i - 1) * 0.06, 0.52, 0.02);
      t.rotation.z = (i - 1) * -0.4;
      head.add(t);
    }
  }
  if (animal === 'hamster') {
    for (const s of [-1, 1]) {
      const ch = mk(sphere(0.14, 18, 14), faceMat);
      ch.scale.set(1, 0.85, 0.7);
      onFace(ch, s * 0.3, -0.16, -0.07);
      head.add(ch);
    }
  }
  if (animal === 'dog' || animal === 'bear') {
    const tuft = mk(sphere(0.07, 12, 10), furMat);
    tuft.position.set(0.03, 0.47, 0.12);
    tuft.scale.set(1.3, 0.7, 1);
    head.add(tuft);
  }

  // tail
  if (animal === 'fox') {
    const tail = mk(sphere(0.16, 20, 16), furMat);
    tail.scale.set(0.85, 0.85, 2.2);
    tail.position.set(0, 0.52, -0.52);
    tail.rotation.x = 0.7;
    body.add(tail);
    const tip = mk(sphere(0.12, 16, 12), faceMat);
    tip.position.set(0, 0.8, -0.82);
    body.add(tip);
  } else if (animal === 'tanuki') {
    const tail = mk(sphere(0.15, 20, 16), furMat);
    tail.scale.set(0.9, 0.9, 1.8);
    tail.position.set(0, 0.45, -0.46);
    tail.rotation.x = 0.5;
    body.add(tail);
    for (let i = 0; i < 2; i++) {
      const band = mk(new THREE.TorusGeometry(0.12 - i * 0.02, 0.03, 8, 18), accMat);
      band.position.set(0, 0.49 + i * 0.1, -0.52 - i * 0.12);
      band.rotation.x = 0.5 - Math.PI / 2;
      body.add(band);
    }
  } else if (animal === 'cat' || animal === 'dog') {
    const tail = mk(capsule(0.06, 0.34), furMat);
    tail.position.set(0, 0.62, -0.42);
    tail.rotation.x = animal === 'cat' ? -0.5 : -0.9;
    body.add(tail);
  } else if (!isPenguin) {
    const tail = mk(sphere(animal === 'hamster' ? 0.06 : 0.1, 14, 10), animal === 'deer' || animal === 'rabbit' ? faceMat : isPanda ? accMat : furMat);
    tail.position.set(0, 0.5, -0.35);
    body.add(tail);
  }

  // stun stars
  const stars = new THREE.Group();
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(makeStarGeo(0.11), starMat);
    const a = (i / 3) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    stars.add(s);
  }
  stars.position.y = 2.05;
  stars.visible = false;
  stars.traverse((c) => (c.userData.noOutline = true));
  root.add(stars);

  addCharOutlines(root);
  return { root, body, head, armL, armR, legL, legR, eyes, stars };
}
