import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGame, itemsMap, PLAYER_COLORS, type Racer, type BattleResultEntry } from '../store';
import { ITEMS } from '../data/items';
import { getControl, resetInput } from '../game/input';
import { sfx } from '../game/audio';
import { computeSpec, newVehicleState, stepVehicle, type VehicleState, type VehicleSpec, type Control } from '../game/vehicle';
import { TerritoryMap } from '../game/paint';
import { paintSnapshot } from '../game/paintView';
import { BATTLE_DURATION, STARTS, ARENA_OBSTACLES, BOOST_PADS, ITEM_SPOTS, JUMP_PADS, arenaHeight, blocked, insideArena, clampArena, pushBarrier, findPath, segmentClear } from '../game/battleMap';
import { type RaceItem } from '../game/scrap';
import { Car } from './Car';
import { BattleArena } from './BattleArena';
import { Lights, type Target } from './Stage';
import { SoftBox } from './Workshop';

export const BATTLE_ITEMS: Record<RaceItem, { name: string; icon: 'boost' | 'paint' | 'shield' | 'target'; desc: string }> = {
  turbo: { name: '터보', icon: 'boost', desc: '짧고 강한 가속' },
  triple: { name: '와이드 롤러', icon: 'paint', desc: '6초 동안 넓게 칠하기' },
  oil: { name: '페인트 폭탄', icon: 'paint', desc: '주변 영역을 한 번에 칠하기' },
  shield: { name: '실드', icon: 'shield', desc: '충돌과 공격을 방어' },
  missile: { name: '컬러 미사일', icon: 'target', desc: '상대를 맞히고 주변을 칠하기' },
};
export const battleHUD = {
  phase: 'ready' as 'ready' | 'play' | 'finished', countdown: 3, remaining: BATTLE_DURATION,
  elapsed: 0, speed: 0, throttle: 0, boost: 1, onFoot: false, drifting: false,
  brushName: null as string | null, paintWidth: 1, maxSpeed: 0,
  rank: 1, focus: 0, item: null as RaceItem | null,
  scores: [] as { id: string; name: string; characterId: string; color: string; paint: number; human: boolean }[],
  positions: [] as { x: number; z: number; heading: number; color: string }[],
  paint: null as TerritoryMap | null,
  message: null as null | { id: number; text: string },
};
let messageId = 0;
function notify(text: string) { battleHUD.message = { id: ++messageId, text }; }
interface Actor {
  racer: Racer; st: VehicleState; spec: VehicleSpec; color: string; items: RaceItem[];
  usedPress: number; usedJump: number; jumps: number; boosts: number; itemsUsed: number; padCd: number; itemCd: number; wide: number;
  target: [number, number]; path: [number, number][]; retarget: number; stuck: number; reverse: number;
  previousX: number; previousZ: number; jumpCd: number; wasAir: boolean; spin: number;
}
interface Capsule { x: number; z: number; cooldown: number }
interface Missile { active: boolean; x: number; y: number; z: number; heading: number; owner: number; target: number; life: number }
interface Droplet { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; scale: number; color: string }

function PaintParticles({ droplets }: { droplets: Droplet[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05), m = mesh.current;
    if (!m) return;
    droplets.forEach((d, i) => {
      if (d.life > 0) {
        d.life -= dt; d.vy -= 15 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        if (d.y < arenaHeight(d.x, d.z)) d.life = 0;
      }
      object.position.set(d.x, d.life > 0 ? d.y : -100, d.z);
      object.scale.setScalar(d.life > 0 ? d.scale : 0.0001); object.updateMatrix();
      m.setMatrixAt(i, object.matrix); m.setColorAt(i, color.set(d.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, droplets.length]} frustumCulled={false}>
    <sphereGeometry args={[1, 6, 5]} /><meshStandardMaterial roughness={0.25} />
  </instancedMesh>;
}
function Pickups({ capsules, missiles }: { capsules: Capsule[]; missiles: Missile[] }) {
  const refs = useRef<(THREE.Group | null)[]>([]), rockets = useRef<(THREE.Group | null)[]>([]);
  useFrame((s, dt) => {
    capsules.forEach((c, i) => {
      const g = refs.current[i]; if (!g) return;
      g.visible = c.cooldown <= 0; g.position.set(c.x, arenaHeight(c.x, c.z) + 1 + Math.sin(s.clock.elapsedTime * 2 + i) * 0.12, c.z);
      g.rotation.y += dt;
    });
    missiles.forEach((r, i) => {
      const g = rockets.current[i]; if (!g) return;
      g.visible = r.active; g.position.set(r.x, r.y, r.z); g.rotation.y = r.heading;
    });
  });
  return <>
    {capsules.map((_, i) => <group key={i} ref={(g) => { refs.current[i] = g; }}>
      <mesh castShadow><capsuleGeometry args={[0.38, 0.35, 5, 16]} /><meshStandardMaterial color="#f5de9f" metalness={0.15} roughness={0.3} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.39, 0.055, 5, 20]} /><meshStandardMaterial color="#73c5b0" emissive="#73c5b0" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, 0.1, 0.36]}><circleGeometry args={[0.2, 12]} /><meshBasicMaterial color="#fff9df" /></mesh>
    </group>)}
    {missiles.map((_, i) => <group key={i} ref={(g) => { rockets.current[i] = g; }} visible={false}>
      <SoftBox size={[0.45, 0.45, 0.9]} color="#f56a87" />
      <mesh position={[0, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.17, 0.6, 8]} /><meshBasicMaterial color="#ffdda2" toneMapped={false} /></mesh>
    </group>)}
  </>;
}
function PlayerLabel({ actor }: { actor: Actor }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { ref.current?.position.set(actor.st.x, actor.st.y + (actor.spec.onFoot ? 3.9 : 3.4), actor.st.z); });
  return <group ref={ref}><Html center distanceFactor={22} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
    <div className="world-player-label" style={{ borderColor: actor.color }}><i style={{ background: actor.color }} />{actor.racer.name}</div>
  </Html></group>;
}

export function BattleWorld() {
  const { camera, size } = useThree();
  const lightTarget = useRef<Target>({ x: 0, y: 0, z: 0 });
  const sim = useMemo(() => {
    const g = useGame.getState();
    const colors = [g.paintColor, ...PLAYER_COLORS.filter((c) => c !== g.paintColor)].slice(0, 4);
    const self: Racer = { id: 'player', name: 'PLAYER', characterId: g.characterId, jersey: colors[0], build: g.build, items: itemsMap(g.inventory), isPlayer: true, controlIndex: 0, loadout: g.loadout ?? undefined };
    const list = [self, ...g.bots].slice(0, 4);
    const actors: Actor[] = list.map((racer, i) => {
      const start = STARTS[i];
      const spec = computeSpec(racer.build, racer.items, racer.characterId);
      // 바퀴가 있는 차량만 최소 부스트 보장 — 맨몸은 부스트 없음 (가장 느림)
      if (!spec.onFoot) spec.boostPower = Math.max(0.3, spec.boostPower);
      return {
        racer, color: colors[i], st: newVehicleState(start.x, start.z, start.heading),
        spec, items: [...(racer.loadout?.items ?? ['oil'])],
        usedPress: racer.controlIndex === undefined ? 0 : getControl(racer.controlIndex).itemPresses,
        usedJump: racer.controlIndex === undefined ? 0 : getControl(racer.controlIndex).jumpPresses ?? 0,
        jumps: 0, boosts: 0, itemsUsed: 0, padCd: 0, itemCd: 4 + i, wide: 0,
        target: [0, 0], path: [], retarget: 0, stuck: 0, reverse: 0,
        previousX: start.x, previousZ: start.z, jumpCd: 0, wasAir: false, spin: 0,
      };
    });
    const paint = new TerritoryMap(colors);
    return {
      actors, paint, readyEnds: 0, playEnds: 0, finishedAt: 0, submitted: false, shake: 0,
      droplets: Array.from({ length: 150 }, (): Droplet => ({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, scale: 0, color: '#ffffff' })),
      dropIndex: 0, fxT: 0, scoreT: 0, beep: 4,
      capsules: ITEM_SPOTS.map(([x, z]) => ({ x, z, cooldown: 0 })),
      missiles: Array.from({ length: 6 }, (): Missile => ({ active: false, x: 0, y: 0, z: 0, heading: 0, owner: 0, target: 0, life: 0 })),
    };
  }, []);
  const actorRefs = useMemo(() => sim.actors.map((a) => ({ current: a.st })), [sim]);
  useEffect(() => {
    resetInput();
    sim.readyEnds = performance.now() + 3000;
    Object.assign(battleHUD, { phase: 'ready', countdown: 3, remaining: BATTLE_DURATION, elapsed: 0, throttle: 0, speed: 0, focus: 0, message: null, paint: sim.paint });
    const p = sim.actors[0].st;
    camera.position.set(p.x - Math.sin(p.heading) * 14, 13, p.z - Math.cos(p.heading) * 14);
    camera.lookAt(p.x, 1, p.z);
    sfx.engineOn();
    return () => { sfx.engineOff(); battleHUD.paint = null; sim.paint.dispose(); resetInput(); };
  }, [sim, camera]);

  function emit(x: number, y: number, z: number, color: string, count: number, power = 3) {
    for (let i = 0; i < count; i++) {
      const d = sim.droplets[sim.dropIndex++ % sim.droplets.length], a = Math.random() * Math.PI * 2;
      Object.assign(d, { x, y, z, vx: Math.cos(a) * power, vz: Math.sin(a) * power, vy: 1.4 + Math.random() * power, life: 0.5, scale: 0.06 + Math.random() * 0.08, color });
    }
  }
  function useItem(index: number) {
    const a = sim.actors[index], item = a.items.shift();
    if (!item) return;
    a.itemsUsed++;
    if (index === battleHUD.focus) { notify(BATTLE_ITEMS[item].name); sfx.item(); }
    if (item === 'oil') {
      sim.paint.splash(index, a.st.x, a.st.z, 4.5); emit(a.st.x, a.st.y + 1, a.st.z, a.color, 35, 8); sfx.pop();
    } else if (item === 'triple') a.wide = 6;
    else if (item === 'turbo') { a.st.itemBoost = 1.8; a.boosts++; if (index === battleHUD.focus) sfx.boost(); }
    else if (item === 'shield') a.st.shield = 10;
    else {
      let target = -1, best = Infinity;
      sim.actors.forEach((b, i) => { const d = Math.hypot(b.st.x - a.st.x, b.st.z - a.st.z); if (i !== index && d < best) { best = d; target = i; } });
      if (target >= 0) {
        const m = sim.missiles.find((m) => !m.active) ?? sim.missiles[0];
        Object.assign(m, { active: true, x: a.st.x, y: a.st.y + 0.8, z: a.st.z, heading: a.st.heading, target, owner: index, life: 4 });
        sfx.missile();
      }
    }
  }
  function chooseTarget(a: Actor, index: number) {
    let best = -Infinity, target: [number, number] = [a.st.x, a.st.z];
    for (let c = 0; c < 25; c++) {
      const x = (Math.random() - 0.5) * 54, z = (Math.random() - 0.5) * 54;
      if (!insideArena(x, z, 2) || blocked(x, z, 2)) continue;
      const d = Math.hypot(x - a.st.x, z - a.st.z);
      if (d < 5) continue;
      let value = 0;
      for (const [dx, dz] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const owner = sim.paint.ownerAt(x + dx, z + dz);
        value += owner === index ? 0.05 : owner < 0 ? 1.3 : 1.6;
      }
      const score = value / (7 + d * 0.5) + Math.random() * 0.07;
      if (score > best) { best = score; target = [x, z]; }
    }
    a.target = target;
    a.path = segmentClear(a.st.x, a.st.z, ...target) ? [target] : findPath(a.st.x, a.st.z, ...target);
    a.retarget = 3 + Math.random() * 2;
  }
  function botControl(a: Actor, index: number, dt: number): Control {
    a.retarget -= dt;
    if (a.path.length === 0 || a.retarget <= 0) chooseTarget(a, index);
    while (a.path.length > 1 && Math.hypot(a.path[0][0] - a.st.x, a.path[0][1] - a.st.z) < 2.7) a.path.shift();
    const target = a.path[0] ?? a.target;
    if (Math.hypot(target[0] - a.st.x, target[1] - a.st.z) < 3 && a.path.length <= 1) a.retarget = 0;
    let d = Math.atan2(target[0] - a.st.x, target[1] - a.st.z) - a.st.heading;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const moved = Math.hypot(a.st.x - a.previousX, a.st.z - a.previousZ);
    a.stuck = moved < dt * 1.2 ? a.stuck + dt : 0;
    if (a.stuck > 0.8) { a.reverse = 0.65; a.stuck = 0; a.retarget = 0; }
    a.reverse = Math.max(0, a.reverse - dt);
    const reversing = a.reverse > 0;
    a.previousX = a.st.x; a.previousZ = a.st.z;
    return { steer: Math.max(-1, Math.min(1, -d * 1.8)) * (reversing ? -1 : 1), throttle: reversing ? -1 : Math.abs(d) > 1 ? 0.55 : 1, boost: Math.abs(d) < 0.15 && a.st.boostEnergy > 0.85, drift: Math.abs(d) > 0.4 && Math.abs(d) < 1.2 && a.st.speed > 9 };
  }
  function finish() {
    battleHUD.phase = 'finished'; battleHUD.remaining = 0;
    sim.finishedAt = performance.now();
    sim.actors.forEach((a) => { a.st.speed = 0; a.st.boostTime = 0; a.st.itemBoost = 0; });
    sim.paint.flush(); sfx.whistle(); notify('TIME UP');
  }
  function results(): BattleResultEntry[] {
    const entries = sim.actors.map((a, i) => ({
      id: a.racer.id, name: a.racer.name, characterId: a.racer.characterId, color: a.color, isPlayer: a.racer.isPlayer,
      paint: Math.max(0, sim.paint.totals[i]) / sim.paint.totalArea, area: Math.max(0, sim.paint.totals[i]),
      overpaint: sim.paint.overpaint[i], boosts: a.boosts, itemsUsed: a.itemsUsed, jumps: a.jumps, rank: 1, cells: sim.paint.cells[i],
    })).sort((a, b) => b.area - a.area);
    entries.forEach((e, i) => { e.rank = i > 0 && Math.abs(e.area - entries[i - 1].area) < 0.00001 ? entries[i - 1].rank : i + 1; });
    return entries;
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05), now = performance.now();
    if (!sim.readyEnds) return;
    if (battleHUD.phase === 'ready') {
      battleHUD.countdown = Math.max(0, Math.ceil((sim.readyEnds - now) / 1000));
      if (battleHUD.countdown < sim.beep && battleHUD.countdown > 0) { sim.beep = battleHUD.countdown; sfx.beep(); }
      if (now >= sim.readyEnds) {
        battleHUD.phase = 'play'; sim.playEnds = now + BATTLE_DURATION * 1000; sfx.beep(true);
      }
    } else if (battleHUD.phase === 'play') {
      battleHUD.remaining = Math.max(0, (sim.playEnds - now) / 1000);
      battleHUD.elapsed = BATTLE_DURATION - battleHUD.remaining;
      if (battleHUD.remaining <= 0) finish();
    }
    const playing = battleHUD.phase === 'play';
    if (!playing) sim.actors.forEach((a) => {
      if (a.racer.controlIndex === undefined) return;
      const c = getControl(a.racer.controlIndex);
      a.usedPress = c.itemPresses;
      a.usedJump = c.jumpPresses ?? 0;
    });
    if (playing) {
      sim.capsules.forEach((c) => { c.cooldown = Math.max(0, c.cooldown - dt); });
      sim.fxT += dt;
      sim.actors.forEach((a, i) => {
        const st = a.st;
        const startX = st.x, startZ = st.z;
        let ctrl: Control;
        if (a.racer.controlIndex !== undefined) {
          const control = getControl(a.racer.controlIndex);
          ctrl = { steer: control.x, throttle: control.y, boost: control.boost, drift: control.drift };
          if (control.itemPresses > a.usedPress) { a.usedPress = control.itemPresses; useItem(i); }
          const jumpPresses = control.jumpPresses ?? 0;
          if (jumpPresses > a.usedJump) {
            a.usedJump = jumpPresses;
            // 지면에 있고 쿨다운이 끝났을 때만 점프
            if (!st.airborne && a.jumpCd <= 0) {
              st.vy = 9.2 * a.spec.jump;
              st.airborne = true;
              a.jumpCd = 0.55;
              a.jumps++;
              if (i === battleHUD.focus) sfx.jump();
            }
          }
        } else {
          ctrl = botControl(a, i, dt);
          a.itemCd -= dt;
          if (a.itemCd <= 0 && a.items.length) { useItem(i); a.itemCd = 4 + Math.random() * 4; }
          // 봇도 가끔 점프해서 벽을 넘거나 분위기를 맞춘다
          if (!st.airborne && a.jumpCd <= 0 && Math.abs(st.speed) > 6 && Math.random() < 0.004) {
            st.vy = 9.2 * a.spec.jump; st.airborne = true; a.jumpCd = 0.55; a.jumps++;
          }
        }
        if (a.spin > 0) {
          a.spin -= dt; st.spinAngle += dt * 10; ctrl = { steer: 0, throttle: 0, boost: false };
          if (a.spin <= 0) st.spinAngle = 0;
        }
        a.padCd -= dt; a.jumpCd -= dt; a.wide = Math.max(0, a.wide - dt);
        const ground = arenaHeight(st.x, st.z), owner = sim.paint.ownerAt(st.x, st.z);
        const friction = owner < 0 ? 1 : owner === i ? 1.03 : 0.94;
        const jump = JUMP_PADS.some((p) => Math.hypot(p.x - st.x, p.z - st.z) < 1.5) && a.jumpCd <= 0;
        const boostBefore = st.boostTime;
        stepVehicle(st, a.spec, ctrl, dt, { friction, ground, jumpImpulse: jump ? 9.5 : undefined }, ARENA_OBSTACLES);
        if (!st.airborne) {
          const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
          const pitch = -Math.atan2(arenaHeight(st.x + fx * 0.7, st.z + fz * 0.7) - arenaHeight(st.x - fx * 0.7, st.z - fz * 0.7), 1.4);
          const roll = Math.atan2(arenaHeight(st.x + fz * 0.7, st.z - fx * 0.7) - arenaHeight(st.x - fz * 0.7, st.z + fx * 0.7), 1.4);
          st.pitch += (pitch - st.pitch) * Math.min(1, dt * 6);
          st.roll += (roll - st.roll) * Math.min(1, dt * 4);
        }
        if (st.boostTime > boostBefore) { a.boosts++; if (i === battleHUD.focus) sfx.boost(); }
        if (st.y < 1.3 && pushBarrier(st, a.spec.onFoot ? 0.65 : 1.05)) { st.speed *= 0.7; st.hit = 0.22; }
        const unclampedX = st.x, unclampedZ = st.z;
        clampArena(st);
        if (Math.hypot(st.x - unclampedX, st.z - unclampedZ) > 0.01) {
          st.speed *= 0.55; st.hit = Math.max(st.hit, 0.18);
        }
        // 점프대로 떠오른 경우에만 긴 쿨다운 — 수동 점프는 자체 쿨다운(0.55초)을 유지한다
        if (st.airborne && !a.wasAir && a.jumpCd <= 0) { a.jumpCd = 1.3; if (i === battleHUD.focus) sfx.jump(); }
        if (!st.airborne && a.wasAir) { sim.paint.splash(i, st.x, st.z, 2.2); emit(st.x, st.y + 0.15, st.z, a.color, 12); if (i === battleHUD.focus) sfx.land(); }
        a.wasAir = st.airborne;
        for (const p of BOOST_PADS) {
          if (a.padCd <= 0 && !st.airborne && ctrl.throttle > 0 && Math.hypot(st.x - p.x, st.z - p.z) < 1.8) {
            st.itemBoost = 1.2; a.padCd = 2; a.boosts++; if (i === battleHUD.focus) sfx.boost();
          }
        }
        for (const c of sim.capsules) if (c.cooldown <= 0 && a.items.length < 2 && Math.hypot(st.x - c.x, st.z - c.z) < 1.6 && !st.airborne) {
          const pool: RaceItem[] = ['oil', 'triple', 'turbo', 'shield', 'missile'];
          a.items.push(pool[Math.floor(Math.random() * pool.length)]); c.cooldown = 6;
          if (i === battleHUD.focus) { sfx.item(); notify('아이템 획득'); }
        }
        const grounded = !st.airborne && Math.abs(st.y - arenaHeight(st.x, st.z)) < 0.45;
        if (grounded && Math.abs(st.speed) > 0.7 && Math.hypot(st.x - startX, st.z - startZ) > 0.012) {
          sim.paint.stroke(i, st.x, st.z, Math.abs(st.speed), a.wide > 0 || ctrl.drift && Math.abs(st.steer) > 0.3, a.spec.paintWidth);
          if (sim.fxT > 0.06) emit(st.x - Math.sin(st.heading), st.y + 0.3, st.z - Math.cos(st.heading), a.color, 2, 1.8);
        } else sim.paint.resetTrail(i);
      });
      if (sim.fxT > 0.06) sim.fxT = 0;
      sim.missiles.forEach((m) => {
        if (!m.active) return;
        m.life -= dt;
        const target = sim.actors[m.target], d = Math.atan2(target.st.x - m.x, target.st.z - m.z);
        m.heading = d; m.x += Math.sin(d) * 30 * dt; m.z += Math.cos(d) * 30 * dt;
        m.y += (target.st.y + 0.7 - m.y) * dt * 4;
        if (Math.hypot(m.x - target.st.x, m.z - target.st.z) < 1.6) {
          m.active = false;
          if (target.st.shield > 0) { target.st.shield = 0; sfx.pop(); }
          else {
            target.spin = 0.7; target.st.stun = 0.7; target.st.speed *= 0.25;
            sim.paint.splash(m.owner, m.x, m.z, 3.8); emit(m.x, m.y, m.z, sim.actors[m.owner].color, 30, 6);
            if (m.target === battleHUD.focus) { sim.shake = 0.6; notify('컬러 미사일 피격'); }
          }
        }
        if (m.life <= 0) m.active = false;
      });
      for (let i = 0; i < sim.actors.length; i++) for (let j = i + 1; j < sim.actors.length; j++) {
        const a = sim.actors[i].st, b = sim.actors[j].st, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 1.9 && d > 0.0001 && Math.abs(a.y - b.y) < 1.1) {
          const push = (1.9 - d) / 2;
          a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push;
          if (a.hit <= 0 && b.hit <= 0 && Math.abs(a.speed) + Math.abs(b.speed) > 5) {
            a.hit = b.hit = 0.35; a.speed *= 0.8; b.speed *= 0.8;
            if (i === battleHUD.focus || j === battleHUD.focus) { sfx.bump(); sim.shake = 0.35; }
          }
        }
      }
      sim.paint.flush();
    }
    if (battleHUD.phase === 'finished' && !sim.submitted && now - sim.finishedAt > 1600) {
      sim.submitted = true; useGame.getState().finishBattle(results(), paintSnapshot(sim.paint)); return;
    }
    sim.scoreT += dt;
    if (sim.scoreT > 0.08) {
      sim.scoreT = 0;
      const coverage = sim.paint.coverage();
      battleHUD.scores = sim.actors.map((a, i) => ({ id: a.racer.id, name: a.racer.name, characterId: a.racer.characterId, color: a.color, paint: coverage[i], human: a.racer.controlIndex !== undefined }));
      const sorted = [...battleHUD.scores].sort((a, b) => b.paint - a.paint);
      battleHUD.rank = sorted.findIndex((s) => s.id === sim.actors[battleHUD.focus].racer.id) + 1;
      battleHUD.positions = sim.actors.map((a) => ({ x: a.st.x, z: a.st.z, heading: a.st.heading, color: a.color }));
    }
    const focused = sim.actors[battleHUD.focus] ?? sim.actors[0], p = focused.st;
    battleHUD.speed = p.speed; battleHUD.boost = p.boostEnergy; battleHUD.onFoot = focused.spec.onFoot;
    battleHUD.paintWidth = focused.spec.paintWidth; battleHUD.maxSpeed = focused.spec.maxSpeed;
    {
      const bUid = focused.racer.build.slots.brush;
      battleHUD.brushName = bUid !== undefined ? ITEMS[focused.racer.items[bUid]]?.name ?? null : null;
    }
    battleHUD.item = focused.items[0] ?? null;
    const control = getControl(focused.racer.controlIndex ?? 0);
    battleHUD.throttle = playing ? control.y : 0; battleHUD.drifting = playing && control.drift;
    sfx.engine(playing ? Math.min(1, Math.abs(p.speed) / 25) : 0, p.boostTime > 0 || p.itemBoost > 0);
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading), portrait = size.width / size.height < 0.8;
    const back = portrait ? 17 : 13.5, up = portrait ? 15 : 11.5;
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(new THREE.Vector3(p.x - fx * back, up + p.y * 0.7, p.z - fz * back), k);
    sim.shake = Math.max(0, sim.shake - dt * 2);
    const sh = sim.shake * 0.35;
    camera.lookAt(p.x + fx * 1.8 + (Math.random() - 0.5) * sh, 0.8 + p.y, p.z + fz * 1.8);
    lightTarget.current.x = p.x; lightTarget.current.z = p.z;
  });
  return <group>
    <Lights target={lightTarget} size={35} />
    <BattleArena paint={sim.paint} />
    <Pickups capsules={sim.capsules} missiles={sim.missiles} />
    {sim.actors.map((a, i) => <group key={a.racer.id}>
      <Car build={a.racer.build} items={a.racer.items} characterId={a.racer.characterId} jersey={a.color} stateRef={actorRefs[i]} />
      <PlayerLabel actor={a} />
    </group>)}
    <PaintParticles droplets={sim.droplets} />
  </group>;
}