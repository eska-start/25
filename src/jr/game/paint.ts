import * as THREE from 'three';
import { ARENA_SIZE, HALF, paintable, surfaceAreaFactor } from './battleMap';

export const PAINT_COLORS = ['#f56a87', '#50ccb6', '#699cfa', '#ffc16b'];
export const PAINT_RESOLUTION = 384;
export const NEUTRAL = 255;
const EXCLUDED = 254;

/** Rendering and area scoring share one exact owner buffer; overwriting subtracts the previous owner's area. */
export class TerritoryMap {
  readonly resolution = PAINT_RESOLUTION;
  readonly owners = new Uint8Array(PAINT_RESOLUTION ** 2);
  readonly pixels = new Uint8Array(PAINT_RESOLUTION ** 2 * 4);
  readonly areas = new Float64Array(PAINT_RESOLUTION ** 2);
  readonly totals = new Float64Array(4);
  readonly cells = new Uint32Array(4);
  readonly overpaint = new Float64Array(4);
  readonly texture: THREE.DataTexture;
  readonly colors: string[];
  totalArea = 0;
  version = 0;
  private rgb: number[][];
  private dirty = true;
  private last: ({ x: number; z: number } | null)[] = [null, null, null, null];
  constructor(colors = PAINT_COLORS) {
    this.colors = colors;
    this.rgb = colors.map((hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; });
    const step = ARENA_SIZE / this.resolution;
    for (let y = 0; y < this.resolution; y++) for (let x = 0; x < this.resolution; x++) {
      const i = y * this.resolution + x, wx = (x + 0.5) * step - HALF, wz = (y + 0.5) * step - HALF;
      if (paintable(wx, wz)) {
        this.owners[i] = NEUTRAL; this.areas[i] = step * step * surfaceAreaFactor(wx, wz); this.totalArea += this.areas[i];
      } else this.owners[i] = EXCLUDED;
    }
    this.texture = new THREE.DataTexture(this.pixels, this.resolution, this.resolution, THREE.RGBAFormat);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false; this.texture.flipY = false; this.texture.needsUpdate = true;
  }
  ownerAt(x: number, z: number): number {
    const gx = Math.floor((x + HALF) / ARENA_SIZE * this.resolution), gz = Math.floor((z + HALF) / ARENA_SIZE * this.resolution);
    if (gx < 0 || gz < 0 || gx >= this.resolution || gz >= this.resolution) return -1;
    const owner = this.owners[gz * this.resolution + gx];
    return owner < 4 ? owner : -1;
  }
  private disk(owner: number, x: number, z: number, radius: number, irregular = true) {
    const s = this.resolution / ARENA_SIZE, cx = (x + HALF) * s, cz = (z + HALF) * s, rr = radius * s;
    const x0 = Math.max(0, Math.floor(cx - rr * 1.15)), x1 = Math.min(this.resolution - 1, Math.ceil(cx + rr * 1.15));
    const z0 = Math.max(0, Math.floor(cz - rr * 1.15)), z1 = Math.min(this.resolution - 1, Math.ceil(cz + rr * 1.15));
    for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
      const i = zz * this.resolution + xx, old = this.owners[i];
      if (old === EXCLUDED || old === owner) continue;
      const dx = xx + 0.5 - cx, dz = zz + 0.5 - cz, a = Math.atan2(dz, dx);
      const edge = irregular ? 1 + Math.sin(a * 7 + x * 1.8) * 0.06 + Math.cos(a * 11 + z * 2) * 0.04 : 1;
      if (dx * dx + dz * dz > (rr * edge) ** 2) continue;
      const area = this.areas[i];
      if (old < 4) { this.totals[old] -= area; this.cells[old]--; this.overpaint[owner] += area; }
      this.owners[i] = owner; this.totals[owner] += area; this.cells[owner]++;
      const p = i * 4, rgb = this.rgb[owner];
      this.pixels[p] = rgb[0]; this.pixels[p + 1] = rgb[1]; this.pixels[p + 2] = rgb[2]; this.pixels[p + 3] = 242;
    }
    this.dirty = true;
  }
  /**
   * @param widthMul 장착한 붓의 페인트 폭 배율 (붓 없음 ≈ 0.55, 볼펜 0.72 … 물감통 2.3)
   * @param wide     아이템(와이드 롤러)으로 일시적으로 넓어진 상태
   */
  stroke(owner: number, x: number, z: number, speed: number, wide = false, widthMul = 1, trail = owner) {
    if (owner < 0 || owner >= this.colors.length) return;
    if (speed < 0.7) { this.last[trail] = null; return; }
    const prev = this.last[trail];
    const radius = (1.42 + Math.min(speed, 22) * 0.025) * widthMul * (wide ? 1.55 : 1);
    if (prev && Math.hypot(x - prev.x, z - prev.z) < 12) {
      const n = Math.max(1, Math.ceil(Math.hypot(x - prev.x, z - prev.z) / 0.45));
      for (let i = 1; i <= n; i++) this.disk(owner, prev.x + (x - prev.x) * i / n, prev.z + (z - prev.z) * i / n, radius);
    } else this.disk(owner, x, z, radius);
    if (Math.random() < 0.35) {
      const a = Math.random() * Math.PI * 2;
      this.disk(owner, x + Math.cos(a) * radius * 1.1, z + Math.sin(a) * radius * 1.1, 0.2 + Math.random() * 0.24, false);
    }
    this.last[trail] = { x, z };
  }
  splash(owner: number, x: number, z: number, radius = 4.2) {
    this.disk(owner, x, z, radius);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, r = radius * (1 + Math.random() * 0.4);
      this.disk(owner, x + Math.cos(a) * r, z + Math.sin(a) * r, 0.25 + Math.random() * 0.4, false);
    }
  }
  resetTrail(trail: number) { this.last[trail] = null; }
  coverage(): number[] { return Array.from(this.totals, (area) => Math.max(0, area) / this.totalArea); }
  flush() { if (this.dirty) { this.texture.needsUpdate = true; this.dirty = false; this.version++; } }
  dispose() { this.texture.dispose(); }
}