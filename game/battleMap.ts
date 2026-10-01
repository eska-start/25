import type { Obstacle } from './vehicle';

export const BATTLE_DURATION = 90;
export const ARENA_SIZE = 64;
export const HALF = ARENA_SIZE / 2;
export const ARENA_NAME = '컬러 팩토리';
export interface Barrier { x: number; z: number; w: number; d: number; h: number }
export const BARRIERS: Barrier[] = [
  { x: -17, z: 8, w: 2.8, d: 8, h: 1.5 }, { x: 16, z: -8, w: 2.8, d: 8, h: 1.5 },
  { x: -4, z: 17, w: 8, d: 2.5, h: 1.4 }, { x: 5, z: -13, w: 7, d: 2.2, h: 1.2 },
];
export const ARENA_OBSTACLES: Obstacle[] = [
  { x: -9, z: -5, r: 1.55 }, { x: 9, z: 5, r: 1.55 },
  { x: -9, z: 5, r: 1.0 }, { x: 10, z: -6, r: 1.0 },
  { x: -23, z: -18, r: 1.8 }, { x: 24, z: 19, r: 1.8 },
];
export const STARTS = [
  { x: -23, z: 23, heading: Math.PI * 0.75 }, { x: 23, z: -23, heading: -Math.PI * 0.25 },
  { x: -23, z: -23, heading: Math.PI * 0.25 }, { x: 23, z: 23, heading: -Math.PI * 0.75 },
];
export const BOOST_PADS = [
  { x: -23, z: 0, heading: Math.PI }, { x: 23, z: 0, heading: 0 },
  { x: 0, z: -23, heading: Math.PI / 2 }, { x: 12, z: 23, heading: -Math.PI / 2 },
];
export const ITEM_SPOTS = [[0, 0], [-14, -14], [14, 14], [-24, 12], [24, -12], [0, -23]] as const;
export const JUMP_PADS = [{ x: -3, z: 9, heading: Math.PI }, { x: 3, z: -7, heading: 0 }];
export function insideArena(x: number, z: number, margin = 0): boolean {
  const h = HALF - 1.5 - margin;
  if (Math.abs(x) > h || Math.abs(z) > h) return false;
  const cx = Math.max(0, Math.abs(x) - (h - 7)), cz = Math.max(0, Math.abs(z) - (h - 7));
  return cx * cx + cz * cz <= 49;
}
export function blocked(x: number, z: number, margin = 0): boolean {
  if (ARENA_OBSTACLES.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + margin)) return true;
  return BARRIERS.some((b) => Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin);
}
export function paintable(x: number, z: number) { return insideArena(x, z) && !blocked(x, z); }
// A raised shelf and its two ramps are part of the paintable surface, not a separate flat overlay.
export function arenaHeight(x: number, z: number): number {
  let h = 0;
  if (z > -27 && z < -19 && Math.abs(x) < 20) {
    h = 2.2 * Math.min(1, Math.max(0, (20 - Math.abs(x)) / 7));
    h *= Math.min(1, (z + 27) / 1.5, (-19 - z) / 1.5);
  }
  const d = Math.hypot(x + 22, z + 6);
  if (d < 5.5) h = Math.max(h, 1.1 * (0.5 + 0.5 * Math.cos(Math.PI * d / 5.5)));
  return Math.max(0, h);
}
export function surfaceAreaFactor(x: number, z: number): number {
  const e = 0.12;
  const dx = (arenaHeight(x + e, z) - arenaHeight(x - e, z)) / (2 * e);
  const dz = (arenaHeight(x, z + e) - arenaHeight(x, z - e)) / (2 * e);
  return Math.sqrt(1 + dx * dx + dz * dz);
}
export function clampArena(p: { x: number; z: number }) {
  const h = HALF - 2.8;
  p.x = Math.max(-h, Math.min(h, p.x)); p.z = Math.max(-h, Math.min(h, p.z));
  const c = h - 7, ax = Math.abs(p.x), az = Math.abs(p.z);
  if (ax > c && az > c) {
    const d = Math.hypot(ax - c, az - c);
    if (d > 7) { p.x = Math.sign(p.x) * (c + (ax - c) * 7 / d); p.z = Math.sign(p.z) * (c + (az - c) * 7 / d); }
  }
}
export function pushBarrier(p: { x: number; z: number }, radius = 1): boolean {
  let hit = false;
  for (const b of BARRIERS) {
    const hx = b.w / 2 + radius, hz = b.d / 2 + radius, dx = p.x - b.x, dz = p.z - b.z;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      if (hx - Math.abs(dx) < hz - Math.abs(dz)) p.x = b.x + Math.sign(dx || 1) * hx;
      else p.z = b.z + Math.sign(dz || 1) * hz;
      hit = true;
    }
  }
  return hit;
}
export function segmentClear(ax: number, az: number, bx: number, bz: number, margin = 1.4): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.75));
  for (let i = 1; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
    if (!insideArena(x, z, margin) || blocked(x, z, margin)) return false;
  }
  return true;
}
// A* navigation allows territory-seeking bots to route around obstacles.
export function findPath(ax: number, az: number, bx: number, bz: number): [number, number][] {
  const N = 30, step = 2;
  const toCell = (n: number) => Math.max(0, Math.min(N - 1, Math.round((n + 29) / step)));
  const at = (i: number): [number, number] => [i % N * step - 29, Math.floor(i / N) * step - 29];
  const start = toCell(az) * N + toCell(ax), end = toCell(bz) * N + toCell(bx);
  const open = new Set([start]), closed = new Set<number>();
  const cost = new Map([[start, 0]]), prev = new Map<number, number>();
  let found = start;
  for (let iter = 0; iter < 900 && open.size; iter++) {
    let best = Infinity, cur = start;
    for (const i of open) {
      const [x, z] = at(i), c = (cost.get(i) ?? Infinity) + Math.hypot(x - bx, z - bz);
      if (c < best) { best = c; cur = i; }
    }
    open.delete(cur); closed.add(cur); found = cur;
    if (cur === end) break;
    const [x, z] = at(cur);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = cur % N + dx, nz = Math.floor(cur / N) + dz;
      if (nx < 0 || nx >= N || nz < 0 || nz >= N) continue;
      const ni = nz * N + nx, [xx, zz] = at(ni);
      if (closed.has(ni) || !segmentClear(x, z, xx, zz, 1.25)) continue;
      const next = (cost.get(cur) ?? 0) + Math.hypot(dx, dz) * step;
      if (next < (cost.get(ni) ?? Infinity)) { cost.set(ni, next); prev.set(ni, cur); open.add(ni); }
    }
  }
  if (found !== end) return [[bx, bz]];
  const result: [number, number][] = [[bx, bz]];
  let i = end;
  while (i !== start && prev.has(i)) { result.unshift(at(i)); i = prev.get(i)!; }
  return result;
}