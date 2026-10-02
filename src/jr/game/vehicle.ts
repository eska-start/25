import { CHARACTERS, ITEMS, GRADE_SPEED, DEFAULT_PAINT_WIDTH, DEFAULT_GUN, GUN_GRADE_MUL, upgradedGrade, upgradeMul, type Stats, type Grade, type GunStats } from '../data/items';
import type { CarBuild } from '../store';

export interface VehicleSpec {
  wheelCount: number;
  wheelRadii: (number | null)[];
  maxSpeed: number;
  accel: number;
  grip: number;
  weight: number;
  boostPower: number;
  wobble: number;
  onFoot: boolean;
  jump: number;
  stats: Stats;
  /** 장착된 부품 수 (바퀴 포함) */
  partCount: number;
  /** 등급으로 얻은 속도 보너스 합계 */
  gradeBonus: number;
  /** 뒤에 단 붓이 결정하는 페인트 반경 배율 */
  paintWidth: number;
  /** 장착된 붓 등급 (없으면 null) */
  brushGrade: Grade | null;
  /** 사격 성능 (총 미장착 시 기본 콩알총) */
  gun: GunStats;
  gunName: string | null;
  gunGrade: Grade | null;
  /** 최대 내구도 — 이만큼 데미지를 받을 때마다 부품이 하나 빠진다 */
  partHp: number;
}

/** 장착 부품의 실제 등급 (업그레이드 반영) */
export function partGrade(build: CarBuild, items: Record<number, string>, uid: number): Grade | null {
  const def = ITEMS[items[uid]];
  if (!def) return null;
  return upgradedGrade(def.grade, build.upgrades?.[uid] ?? 0);
}

export function gunOf(build: CarBuild, items: Record<number, string>): { gun: GunStats; name: string | null; grade: Grade | null } {
  const uid = build.slots.gun;
  const def = uid !== undefined ? ITEMS[items[uid]] : undefined;
  if (!def || !def.gun || uid === undefined) return { gun: DEFAULT_GUN, name: null, grade: null };
  const grade = partGrade(build, items, uid) ?? def.grade;
  const lvl = build.upgrades?.[uid] ?? 0;
  const mul = GUN_GRADE_MUL[grade] / GUN_GRADE_MUL[def.grade];
  return {
    gun: { ...def.gun, damage: def.gun.damage * mul, rate: def.gun.rate * (1 + lvl * 0.12) },
    name: def.name,
    grade,
  };
}

/** 장착된 모든 부품의 등급 보너스 합 */
export function gradeBonusOf(build: CarBuild, items: Record<number, string>): { bonus: number; count: number } {
  let bonus = 0;
  let count = 0;
  const addUid = (uid: number | null | undefined) => {
    if (uid === null || uid === undefined) return;
    const def = ITEMS[items[uid]];
    if (!def) return;
    bonus += GRADE_SPEED[upgradedGrade(def.grade, build.upgrades?.[uid] ?? 0)];
    count++;
  };
  Object.values(build.slots).forEach(addUid);
  build.wheels.forEach(addUid);
  return { bonus, count };
}

export function brushOf(build: CarBuild, items: Record<number, string>) {
  const uid = build.slots.brush;
  const def = uid !== undefined ? ITEMS[items[uid]] : undefined;
  return def && def.cat === 'brush' ? def : null;
}

export function sumStats(build: CarBuild, items: Record<number, string>, characterId: string): Stats {
  const s: Stats = { speed: 0, accel: 0, grip: 0, weight: 0, boost: 0 };
  const add = (p: Partial<Stats>) => {
    s.speed += p.speed ?? 0;
    s.accel += p.accel ?? 0;
    s.grip += p.grip ?? 0;
    s.weight += p.weight ?? 0;
    s.boost += p.boost ?? 0;
  };
  // 업그레이드된 부품은 능력치가 단계당 35%씩 강화된다 (음수 능력치는 그대로)
  const addPart = (uid: number) => {
    const def = ITEMS[items[uid]];
    if (!def) return;
    const mul = upgradeMul(build.upgrades?.[uid] ?? 0);
    const scaled: Partial<Stats> = {};
    (Object.keys(def.stats) as (keyof Stats)[]).forEach((k) => {
      const v = def.stats[k] ?? 0;
      scaled[k] = v > 0 ? v * mul : v;
    });
    add(scaled);
  };
  Object.values(build.slots).forEach((uid) => { if (uid !== undefined) addPart(uid); });
  build.wheels.forEach((uid) => { if (uid !== null) addPart(uid); });
  const ch = CHARACTERS.find((c) => c.id === characterId);
  if (ch) add(ch.bonus);
  return s;
}

/**
 * 속도 체계 (느림 → 빠름):
 *   맨몸 (바퀴 0개)            ≈ 3.6 ~ 4.4
 *   바퀴 1~3개 임시 차량       ≈ 8.5 ~ 18
 *   바퀴 4개 + 부품 多 + 고등급 ≈ 18 ~ 30+
 * 부품을 많이, 등급 높게 장착할수록 최고속도가 올라간다.
 */
export function computeSpec(build: CarBuild, items: Record<number, string>, characterId: string): VehicleSpec {
  const stats = sumStats(build, items, characterId);
  const wheelRadii = build.wheels.map((uid) => (uid !== null && items[uid] ? ITEMS[items[uid]].radius ?? 0.4 : null));
  const wheelCount = wheelRadii.filter((r) => r !== null).length;
  const { bonus: gradeBonus, count: partCount } = gradeBonusOf(build, items);
  const brush = brushOf(build, items);
  const brushLvl = build.slots.brush !== undefined ? build.upgrades?.[build.slots.brush] ?? 0 : 0;
  const paintWidth = brush ? (brush.paintWidth ?? 1) * (1 + brushLvl * 0.12) : DEFAULT_PAINT_WIDTH;
  const brushGrade = brush && build.slots.brush !== undefined ? partGrade(build, items, build.slots.brush) : null;
  const g = gunOf(build, items);
  const gunExtra = { gun: g.gun, gunName: g.name, gunGrade: g.grade, partHp: 22 + Math.max(0, stats.weight) * 2.5 };
  // 바퀴가 하나라도 있으면 차체가 없어도(뼈대만 있어도) 주행 가능
  const onFoot = wheelCount === 0;

  if (onFoot) {
    // Running while carrying the junk bundle is always slower than a one-wheel vehicle.
    const load = Math.min(1, partCount / 10);
    return {
      wheelCount: 0,
      wheelRadii,
      maxSpeed: 4.8 - load * 0.5 + Math.min(0.3, Math.max(0, stats.speed * 0.08)),
      accel: 11,
      grip: 1.1,
      weight: 0,
      boostPower: 0.28,
      wobble: 0,
      onFoot: true,
      jump: 1,
      stats,
      partCount,
      gradeBonus,
      // 맨몸은 붓을 "끌고" 다닐 뿐이라 범위가 더 좁다
      paintWidth: paintWidth * 0.7,
      brushGrade,
      ...gunExtra,
    };
  }

  const avgR = wheelRadii.reduce<number>((a, r) => a + (r ?? 0), 0) / wheelCount;
  // 바퀴 수에 따른 기본 배율 — 1개는 매우 느리고 4개가 완전체
  const countMul = [0, 0.5, 0.68, 0.86, 1][wheelCount];
  const wobble = [0, 1, 0.65, 0.3, 0.06][wheelCount];
  const weight = Math.max(0, 2 + stats.weight);
  // 완성도 보너스: 핵심 슬롯(차체/엔진/부스터/범퍼/스포일러)이 채워질수록 추가 속도
  const coreSlots = ['body', 'engine', 'booster', 'frontBumper', 'spoiler'] as const;
  const coreFilled = coreSlots.filter((s) => build.slots[s] !== undefined).length;
  const completeness = coreFilled * 1.1;
  const base = 14 + stats.speed * 1.0 + (avgR - 0.42) * 5 + completeness + gradeBonus;
  const maxSpeed = base * countMul - weight * 0.2;
  const accel = Math.max(5, (8 + stats.accel * 1.3 + gradeBonus * 0.4) / (1 + weight * 0.1)) * (0.6 + 0.4 * countMul);
  const grip = Math.max(0.35, Math.min(1.4, 0.78 + stats.grip * 0.1 - (4 - wheelCount) * 0.08));

  return {
    wheelCount,
    wheelRadii,
    maxSpeed: Math.max(8.5, maxSpeed),
    accel,
    grip,
    weight,
    boostPower: stats.boost > 0 ? 0.35 + stats.boost * 0.12 : 0,
    wobble,
    onFoot: false,
    jump: 1 + Math.max(0, -stats.weight) * 0.15,
    stats,
    partCount,
    gradeBonus,
    paintWidth,
    brushGrade,
    ...gunExtra,
  };
}

export interface VehicleState {
  x: number;
  z: number;
  y: number;
  vy: number;
  heading: number;
  speed: number;
  steer: number;
  roll: number;
  pitch: number;
  bounce: number;
  boostTime: number;
  boostEnergy: number;
  hit: number;
  airborne: boolean;
  wheelSpin: number;
  t: number;
  accelVis: number;
  skid: number;
  itemBoost: number;
  spinAngle: number;
  stun: number;
  shield: number;
}

export const newVehicleState = (x: number, z: number, heading: number): VehicleState => ({
  x,
  z,
  y: 0,
  vy: 0,
  heading,
  speed: 0,
  steer: 0,
  roll: 0,
  pitch: 0,
  bounce: 0,
  boostTime: 0,
  boostEnergy: 1,
  hit: 0,
  airborne: false,
  wheelSpin: 0,
  t: Math.random() * 10,
  accelVis: 0,
  skid: 0,
  itemBoost: 0,
  spinAngle: 0,
  stun: 0,
  shield: 0,
});

export interface Control {
  steer: number;
  throttle: number;
  boost: boolean;
  /** 사격 버튼 (드리프트 대체) */
  fire?: boolean;
}

export interface Surface {
  friction: number; // 1 = road
  ground: number; // ground height
  jumpImpulse?: number;
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export function stepVehicle(
  st: VehicleState,
  spec: VehicleSpec,
  ctrl: Control,
  dt: number,
  surface: Surface,
  obstacles: Obstacle[],
) {
  st.t += dt;
  const prevSpeed = st.speed;

  // boost
  if (ctrl.boost && ctrl.throttle > 0.05 && spec.boostPower > 0 && st.boostEnergy >= 0.45 && st.boostTime <= 0) {
    st.boostTime = 1.3;
    st.boostEnergy = Math.max(0, st.boostEnergy - 0.45);
  }
  if (st.boostTime > 0) st.boostTime -= dt;
  else st.boostEnergy = Math.min(1, st.boostEnergy + dt * 0.12);
  const boosting = st.boostTime > 0;

  const itemBoosting = st.itemBoost > 0;
  if (itemBoosting) st.itemBoost -= dt;
  st.stun = Math.max(0, st.stun - dt);
  st.shield = Math.max(0, st.shield - dt);

  // speed
  const maxS = spec.maxSpeed * (boosting ? 1 + spec.boostPower : 1) * (itemBoosting ? 1.45 : 1) * (0.55 + 0.45 * surface.friction);
  // 엑셀을 밟고 있을 때만 가속 — 아무것도 누르지 않으면 절대 앞으로 가지 않는다
  if (ctrl.throttle > 0.05) {
    // 엑셀: 전진 가속 (후진 중이면 먼저 감속)
    st.speed += spec.accel * ctrl.throttle * (boosting ? 1.6 : 1) * (itemBoosting ? 1.5 : 1) * dt;
  } else if (ctrl.throttle < -0.05) {
    if (st.speed > 0.6) st.speed += spec.accel * 1.35 * ctrl.throttle * dt; // 브레이크 제동
    else st.speed += spec.accel * 0.7 * ctrl.throttle * dt; // 정지 상태에선 후진
  } else {
    // 페달을 밟지 않으면 굴러가다 멈춤
    st.speed -= st.speed * 2.4 * dt;
    if (Math.abs(st.speed) < 0.18) st.speed = 0;
  }
  // drag
  const over = st.speed - maxS;
  if (over > 0) st.speed -= over * 3 * dt;
  st.speed -= st.speed * 0.25 * (2 - surface.friction) * dt;
  if (st.speed < -maxS * 0.4) st.speed = -maxS * 0.4;

  // steering
  const targetSteer = ctrl.steer;
  st.steer += (targetSteer - st.steer) * Math.min(1, dt * (spec.onFoot ? 14 : 7));
  const speedFrac = Math.min(1, Math.abs(st.speed) / Math.max(1, spec.maxSpeed));
  const turnCurve = spec.onFoot ? 1 : Math.sin(Math.min(1, speedFrac * 1.4) * Math.PI * 0.5) * (1 - speedFrac * 0.3);
  const turnRate = (spec.onFoot ? 3.6 : 2.4 * spec.grip) * turnCurve;
  const dir = st.speed >= 0 ? 1 : -1;
  st.heading -= st.steer * turnRate * dt * dir;
  // instability wander
  if (spec.wobble > 0 && !st.airborne) {
    st.heading += Math.sin(st.t * 2.7) * spec.wobble * 0.55 * speedFrac * dt;
  }

  // vertical
  if (st.y > surface.ground + 0.2) st.airborne = true;
  if (surface.jumpImpulse && !st.airborne && st.speed > 4) {
    st.vy = surface.jumpImpulse * spec.jump * Math.min(1, st.speed / 12);
    st.airborne = true;
  }
  if (st.airborne || st.y > surface.ground + 0.01) {
    st.vy -= 28 * dt;
    st.y += st.vy * dt;
    if (st.y <= surface.ground) {
      st.y = surface.ground;
      if (st.vy < -4) st.bounce = Math.min(1, -st.vy / 14);
      st.vy = 0;
      st.airborne = false;
    }
  } else {
    st.y += (surface.ground - st.y) * Math.min(1, dt * 10);
  }

  // integrate
  const fx = Math.sin(st.heading);
  const fz = Math.cos(st.heading);
  // slight sideways slip for low-grip cars (드리프트 조작은 제거됨)
  const drift = (1 - Math.min(1, spec.grip)) * 2.5 * st.steer * speedFrac * (spec.onFoot ? 0 : 1);
  st.x += (fx * st.speed + fz * drift) * dt;
  st.z += (fz * st.speed - fx * drift) * dt;

  // obstacles
  st.hit = Math.max(0, st.hit - dt);
  const selfR = spec.onFoot ? 0.5 : 1.1;
  for (const o of obstacles) {
    const dx = st.x - o.x;
    const dz = st.z - o.z;
    const d2 = dx * dx + dz * dz;
    const rr = o.r + selfR;
    if (d2 < rr * rr && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const nz = dz / d;
      st.x = o.x + nx * rr;
      st.z = o.z + nz * rr;
      const dot = fx * nx + fz * nz;
      if (dot < -0.3 && st.speed > 2) {
        st.speed *= 0.35;
        st.hit = 0.5;
        st.bounce = 0.6;
      } else {
        st.speed *= 0.97;
      }
    }
  }

  // visual
  const accelNow = (st.speed - prevSpeed) / Math.max(dt, 0.001);
  st.accelVis += (accelNow - st.accelVis) * Math.min(1, dt * 6);
  const wob = spec.wobble;
  const targetRoll =
    -st.steer * speedFrac * (0.14 + wob * 0.3) +
    Math.sin(st.t * 5.1) * wob * 0.11 * (0.4 + speedFrac) +
    Math.sin(st.t * 13.3) * wob * 0.03;
  const targetPitch = -st.accelVis * 0.012 + Math.sin(st.t * 7.7) * wob * 0.05 + (st.airborne ? -st.vy * 0.03 : 0);
  st.roll += (targetRoll - st.roll) * Math.min(1, dt * 5);
  st.pitch += (targetPitch - st.pitch) * Math.min(1, dt * 5);
  st.bounce *= Math.max(0, 1 - dt * 3);
  st.wheelSpin += st.speed * dt;
  st.skid = Math.abs(st.steer) * speedFrac * (surface.friction < 1 ? 0.3 : 1);
}

/** Simple on-foot movement for the collection phase (camera-relative) */
export function stepRunner(st: VehicleState, ix: number, iy: number, dt: number, obstacles: Obstacle[], bounds: number) {
  st.t += dt;
  const len = Math.hypot(ix, iy);
  const maxS = 11;
  if (len > 0.1) {
    const nx = ix / Math.max(1, len);
    const nz = -iy / Math.max(1, len);
    const target = Math.atan2(nx, nz);
    let d = target - st.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    st.heading += d * Math.min(1, dt * 12);
    st.steer += (d - st.steer) * Math.min(1, dt * 8);
    st.speed += (maxS * Math.min(1, len) - st.speed) * Math.min(1, dt * 7);
  } else {
    st.speed -= st.speed * Math.min(1, dt * 9);
    st.steer -= st.steer * Math.min(1, dt * 8);
  }
  const fx = Math.sin(st.heading);
  const fz = Math.cos(st.heading);
  st.x += fx * st.speed * dt;
  st.z += fz * st.speed * dt;
  const r = Math.hypot(st.x, st.z);
  if (r > bounds) {
    st.x *= bounds / r;
    st.z *= bounds / r;
  }
  for (const o of obstacles) {
    const dx = st.x - o.x;
    const dz = st.z - o.z;
    const d2 = dx * dx + dz * dz;
    const rr = o.r + 0.5;
    if (d2 < rr * rr && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      st.x = o.x + (dx / d) * rr;
      st.z = o.z + (dz / d) * rr;
    }
  }
  st.wheelSpin += st.speed * dt;
  st.accelVis = st.speed / maxS;
}
