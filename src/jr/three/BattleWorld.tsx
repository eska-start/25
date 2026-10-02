import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGame, itemsMap, PLAYER_COLORS, TEAM_COLORS, SLOT_CATEGORY, type Racer, type BattleResultEntry, type CarBuild, type Slot } from '../store';
import { ITEMS, GRADE_LABEL, GRADE_ORDER, upgradedGrade } from '../data/items';
import { rollPart } from '../game/scramble';
import { startNetSync, stopNetSync, freshRemote } from '../game/net';
import { ItemMesh } from './Parts';
import { getControl, resetInput } from '../game/input';
import { sfx } from '../game/audio';
import { computeSpec, newVehicleState, stepVehicle, type VehicleState, type VehicleSpec, type Control } from '../game/vehicle';
import { TerritoryMap } from '../game/paint';
import { paintSnapshot } from '../game/paintView';
import { BATTLE_DURATION, HALF, STARTS, ARENA_OBSTACLES, BOOST_PADS, ITEM_SPOTS, JUMP_PADS, arenaHeight, blocked, insideArena, clampArena, pushBarrier, findPath, segmentClear } from '../game/battleMap';
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
  elapsed: 0, speed: 0, throttle: 0, boost: 1, onFoot: false, firing: false,
  hp: 1, partCount: 0, gunName: null as string | null, gunGrade: null as string | null, gunDamage: 0, gunRate: 0,
  statSpeed: 0, statAccel: 0, statGrip: 0,
  brushName: null as string | null, paintWidth: 1, maxSpeed: 0,
  rank: 1, focus: 0, item: null as RaceItem | null,
  mode: 'ffa' as 'ffa' | 'team', myTeam: 0,
  teamScores: [] as { team: number; color: string; paint: number }[],
  scores: [] as { id: string; name: string; characterId: string; color: string; paint: number; human: boolean; team?: number }[],
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
  /** 현재 부품 내구도에 쌓인 데미지 — spec.partHp 이상이면 부품 1개가 빠진다 */
  /** 페인트 소유자 번호 — 개인전은 자기 번호, 팀전은 팀 번호 */
  own: number; team?: number;
  dmg: number; fireCd: number; flash: number; netId?: string; netBuildKey: string; aimCd: number;
}
interface Bullet { active: boolean; x: number; y: number; z: number; vx: number; vz: number; life: number; owner: number; damage: number; splash: number; color: string }
interface GroundPart { uid: number; itemId: string; level: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; spin: number; cd: number; from: number; age: number }
const MAX_GROUND_PARTS = 18;

function Bullets({ bullets }: { bullets: Bullet[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    bullets.forEach((b, i) => {
      object.position.set(b.x, b.active ? b.y : -100, b.z);
      object.scale.setScalar(b.active ? (b.splash > 0 ? 0.32 : 0.16) : 0.0001);
      object.updateMatrix();
      m.setMatrixAt(i, object.matrix); m.setColorAt(i, color.set(b.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, bullets.length]} frustumCulled={false}>
    <sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial toneMapped={false} />
  </instancedMesh>;
}
function GroundPartView({ part }: { part: GroundPart }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    const g = ref.current; if (!g) return;
    g.position.set(part.x, part.y + 0.35 + Math.sin(s.clock.elapsedTime * 3 + part.uid) * 0.08, part.z);
    g.rotation.y = s.clock.elapsedTime * 1.6 + part.uid;
  });
  const def = ITEMS[part.itemId];
  return <group ref={ref}>
    <group scale={0.75}><ItemMesh itemId={part.itemId} /></group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
      <ringGeometry args={[0.6, 0.78, 24]} /><meshBasicMaterial color={def ? ['#9aa3ad', '#4a8ff0', '#a66bff', '#ffb703'][GRADE_ORDER.indexOf(upgradedGrade(def.grade, part.level))] : '#fff'} transparent opacity={0.8} toneMapped={false} />
    </mesh>
  </group>;
}
function HitFlash({ actor }: { actor: Actor }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current; if (!m) return;
    m.visible = actor.flash > 0;
    m.position.set(actor.st.x, actor.st.y + 1, actor.st.z);
    m.scale.setScalar(1.4 + actor.flash * 1.5);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.min(0.5, actor.flash * 2);
  });
  return <mesh ref={ref} visible={false}><sphereGeometry args={[1, 12, 10]} /><meshBasicMaterial color="#ff4a3d" transparent opacity={0.4} depthWrite={false} toneMapped={false} /></mesh>;
}
function HpBar({ actor }: { actor: Actor }) {
  const ref = useRef<THREE.Group>(null), fill = useRef<HTMLDivElement>(null);
  useFrame(() => {
    ref.current?.position.set(actor.st.x, actor.st.y + (actor.spec.onFoot ? 3.3 : 2.8), actor.st.z);
    if (fill.current) fill.current.style.width = `${Math.max(0, 100 - (actor.dmg / actor.spec.partHp) * 100)}%`;
  });
  return <group ref={ref}><Html center distanceFactor={22} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
    <div className="jr-world-hp"><div ref={fill} style={{ background: actor.color }} /></div>
  </Html></group>;
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

function specFor(racer: Racer): VehicleSpec {
  const spec = computeSpec(racer.build, racer.items, racer.characterId);
  // 바퀴가 있는 차량만 최소 부스트 보장 — 맨몸은 부스트 없음 (가장 느림)
  // 모든 참가자(맨몸 포함)가 부스트 가능: 차량은 0.35 이상, 맨몸은 0.28
  spec.boostPower = spec.onFoot ? 0.28 : Math.max(0.35, spec.boostPower);
  return spec;
}
const statLine = (before: VehicleSpec, after: VehicleSpec) => {
  const parts: string[] = [];
  const add = (label: string, d: number, digits = 1) => { if (Math.abs(d) >= 0.05) parts.push(`${label} ${d > 0 ? '+' : ''}${d.toFixed(digits)}`); };
  add('속도', after.maxSpeed - before.maxSpeed);
  add('가속', after.accel - before.accel);
  add('접지', (after.grip - before.grip) * 10);
  add('공격', after.gun.damage - before.gun.damage);
  return parts.join(' · ');
};

export function BattleWorld() {
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const { camera, size } = useThree();
  const lightTarget = useRef<Target>({ x: 0, y: 0, z: 0 });
  const sim = useMemo(() => {
    const g = useGame.getState();
    const teamMode = g.gameMode === 'team';
    const myTeam = g.online ? g.online.players.find((p) => p.id === g.online!.playerId)?.team ?? 0 : 0;
    const colors = [g.paintColor, ...PLAYER_COLORS.filter((c) => c !== g.paintColor)].slice(0, 4);
    const self: Racer = { id: 'player', name: g.online?.players.find((p) => p.id === g.online!.playerId)?.name ?? 'PLAYER', characterId: g.characterId, jersey: colors[0], build: g.build, items: itemsMap(g.inventory), isPlayer: true, controlIndex: 0, loadout: g.loadout ?? undefined, team: teamMode ? myTeam : undefined };
    const list = [self, ...g.bots].slice(0, 4);
    if (teamMode) list.forEach((r, i) => { colors[i] = TEAM_COLORS[r.team ?? (i < 2 ? 0 : 1)]; });
    const actors: Actor[] = list.map((racer, i) => {
      const start = STARTS[i];
      const spec = specFor(racer);
      const team = teamMode ? racer.team ?? (i < 2 ? 0 : 1) : undefined;
      return {
        own: team ?? i, team,
        dmg: 0, fireCd: 0, flash: 0, aimCd: Math.random(), netBuildKey: '',
        netId: racer.id.startsWith('net-') ? racer.id.slice(4) : undefined,
        racer, color: colors[i], st: newVehicleState(start.x, start.z, start.heading),
        spec, items: [...(racer.loadout?.items ?? ['oil'])],
        usedPress: racer.controlIndex === undefined ? 0 : getControl(racer.controlIndex).itemPresses,
        usedJump: racer.controlIndex === undefined ? 0 : getControl(racer.controlIndex).jumpPresses ?? 0,
        jumps: 0, boosts: 0, itemsUsed: 0, padCd: 0, itemCd: 4 + i, wide: 0,
        target: [0, 0], path: [], retarget: 0, stuck: 0, reverse: 0,
        previousX: start.x, previousZ: start.z, jumpCd: 0, wasAir: false, spin: 0,
      };
    });
    const paint = new TerritoryMap(teamMode ? [TEAM_COLORS[0], TEAM_COLORS[1]] : colors);
    return {
      teamMode, myTeam, actors, paint, readyEnds: 0, playEnds: 0, finishedAt: 0, submitted: false, shake: 0,
      droplets: Array.from({ length: 150 }, (): Droplet => ({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, scale: 0, color: '#ffffff' })),
      dropIndex: 0, fxT: 0, scoreT: 0, beep: 4,
      capsules: ITEM_SPOTS.map(([x, z]) => ({ x, z, cooldown: 0 })),
      missiles: Array.from({ length: 6 }, (): Missile => ({ active: false, x: 0, y: 0, z: 0, heading: 0, owner: 0, target: 0, life: 0 })),
      bullets: Array.from({ length: 140 }, (): Bullet => ({ active: false, x: 0, y: -100, z: 0, vx: 0, vz: 0, life: 0, owner: 0, damage: 0, splash: 0, color: '#fff' })),
      bulletIndex: 0,
      ground: [] as GroundPart[], partUid: 50000, groundT: 1.2, localFiring: false,
    };
  }, []);
  const actorRefs = useMemo(() => sim.actors.map((a) => ({ current: a.st })), [sim]);
  useEffect(() => {
    resetInput();
    sim.readyEnds = performance.now() + 3000;
    Object.assign(battleHUD, { mode: sim.teamMode ? 'team' : 'ffa', myTeam: sim.myTeam, teamScores: [], phase: 'ready', countdown: 3, remaining: BATTLE_DURATION, elapsed: 0, throttle: 0, speed: 0, focus: 0, message: null, paint: sim.paint });
    const p = sim.actors[0].st;
    camera.position.set(p.x - Math.sin(p.heading) * 14, 13, p.z - Math.cos(p.heading) * 14);
    camera.lookAt(p.x, 1, p.z);
    sfx.engineOn();
    const online = useGame.getState().online;
    if (online) startNetSync(online.code, online.playerId, () => {
      const a = sim.actors[0], st = a.st;
      return { x: st.x, y: st.y, z: st.z, heading: st.heading, speed: st.speed, steer: st.steer, shield: st.shield,
        firing: sim.localFiring && battleHUD.phase === 'play', phase: battleHUD.phase === 'finished' ? 'done' : 'battle', build: a.racer.build, items: a.racer.items };
    });
    return () => { stopNetSync(); sfx.engineOff(); battleHUD.paint = null; sim.paint.dispose(); resetInput(); };
  }, [sim, camera]);

  const isAlly = (a: number, b: number) => sim.teamMode && a !== b && sim.actors[a].team === sim.actors[b].team;
  function emit(x: number, y: number, z: number, color: string, count: number, power = 3) {
    for (let i = 0; i < count; i++) {
      const d = sim.droplets[sim.dropIndex++ % sim.droplets.length], a = Math.random() * Math.PI * 2;
      Object.assign(d, { x, y, z, vx: Math.cos(a) * power, vz: Math.sin(a) * power, vy: 1.4 + Math.random() * power, life: 0.5, scale: 0.06 + Math.random() * 0.08, color });
    }
  }
  /** 스펙 재계산 + 차량 모델 갱신. 포커스 차량이면 능력치 변화를 알린다 */
  function applyBuild(index: number, build: CarBuild, items: Record<number, string>, label?: string) {
    const a = sim.actors[index], before = a.spec;
    a.racer = { ...a.racer, build, items };
    a.spec = specFor(a.racer);
    a.dmg = Math.min(a.dmg, a.spec.partHp * 0.9);
    if (label && index === battleHUD.focus) {
      const diff = statLine(before, a.spec);
      notify(diff ? `${label} (${diff})` : label);
    }
    bump();
  }
  function fire(index: number, gunOverride?: VehicleSpec['gun']) {
    const a = sim.actors[index], g = gunOverride ?? a.spec.gun, st = a.st;
    a.fireCd = 1 / g.rate;
    const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
    for (let p = 0; p < g.pellets; p++) {
      const b = sim.bullets[sim.bulletIndex++ % sim.bullets.length];
      const ang = st.heading + (g.pellets > 1 ? (p / (g.pellets - 1) - 0.5) * g.spread * 2 : (Math.random() - 0.5) * g.spread * 2);
      const sp = g.speed + Math.max(0, st.speed);
      Object.assign(b, { active: true, x: st.x + fx * 1.5, y: st.y + (a.spec.onFoot ? 1.6 : 1.1), z: st.z + fz * 1.5,
        vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, life: g.life, owner: index, damage: g.damage, splash: g.splash, color: g.bulletColor });
    }
    if (index === battleHUD.focus || Math.hypot(st.x - sim.actors[battleHUD.focus].st.x, st.z - sim.actors[battleHUD.focus].st.z) < 18) sfx.shoot();
  }
  /** 부품을 하나 떼어 바닥으로 튕겨낸다 — 실제 차량 모델에서도 사라진다 */
  function detachPart(index: number) {
    const a = sim.actors[index], build = a.racer.build;
    const slotKeys = (Object.keys(build.slots) as Slot[]).filter((k) => build.slots[k] !== undefined);
    const wheelIdx = build.wheels.map((w, i) => (w !== null ? i : -1)).filter((i) => i >= 0);
    let uid: number | undefined;
    const slots = { ...build.slots }, wheels = [...build.wheels];
    // 장식/외장 부품부터 빠지고, 바퀴는 마지막에 빠진다
    if (slotKeys.length) {
      const k = slotKeys[Math.floor(Math.random() * slotKeys.length)];
      uid = slots[k]; delete slots[k];
    } else if (wheelIdx.length) {
      const wi = wheelIdx[Math.floor(Math.random() * wheelIdx.length)];
      uid = wheels[wi] ?? undefined; wheels[wi] = null;
    }
    if (uid === undefined) return false;
    const itemId = a.racer.items[uid], level = build.upgrades?.[uid] ?? 0;
    const upgrades = { ...(build.upgrades ?? {}) }; delete upgrades[uid];
    const items = { ...a.racer.items }; delete items[uid];
    const ang = Math.random() * Math.PI * 2;
    if (sim.ground.length >= MAX_GROUND_PARTS) sim.ground.shift();
    sim.ground.push({ uid: sim.partUid++, itemId, level, x: a.st.x, y: a.st.y + 1.2, z: a.st.z, vx: Math.cos(ang) * 5, vy: 6, vz: Math.sin(ang) * 5, spin: 0, cd: 1.2, from: index, age: 0 });
    applyBuild(index, { slots, wheels, upgrades }, items, `💥 ${ITEMS[itemId]?.name ?? '부품'} 떨어짐!`);
    emit(a.st.x, a.st.y + 1, a.st.z, '#c3ccd4', 14, 5);
    if (index === battleHUD.focus) { sfx.partOff(); sim.shake = Math.max(sim.shake, 0.45); }
    return true;
  }
  function damage(index: number, amount: number, from: number) {
    const a = sim.actors[index];
    if (battleHUD.phase !== 'play') return;
    if (isAlly(index, from)) return; // 아군 사격/충돌은 피해 없음
    if (a.netId && freshRemote(a.netId)) return; // 원격 참가자의 차량 피해는 본인 기기에서 계산
    if (a.st.shield > 0) { a.st.shield = Math.max(0, a.st.shield - amount * 0.15); return; }
    a.dmg += amount; a.flash = 0.25;
    if (from === battleHUD.focus && index !== from) sfx.clank();
    let guard = 0;
    while (a.dmg >= a.spec.partHp && guard++ < 3) {
      a.dmg -= a.spec.partHp;
      if (!detachPart(index)) { a.dmg = 0; a.spin = Math.max(a.spin, 0.5); break; }
    }
  }
  /** 바닥 부품을 먹으면 먹은 차량에 장착 — 같은 종류면 기존 부품의 등급을 올린다 */
  function equipPart(index: number, part: GroundPart) {
    const a = sim.actors[index], def = ITEMS[part.itemId];
    if (!def) return true;
    const build = a.racer.build, items = { ...a.racer.items };
    const slots = { ...build.slots }, wheels = [...build.wheels], upgrades = { ...(build.upgrades ?? {}) };
    const newUid = sim.partUid++;
    const upgrade = (uid: number) => {
      const base = ITEMS[items[uid]];
      const lvl = upgrades[uid] ?? 0;
      if (!base || upgradedGrade(base.grade, lvl) === 'legend') return false;
      upgrades[uid] = lvl + 1;
      applyBuild(index, { slots, wheels, upgrades }, items, `⬆ ${base.name} ${GRADE_LABEL[upgradedGrade(base.grade, lvl + 1)]} 등급 업!`);
      return true;
    };
    const mount = (place: () => void) => {
      items[newUid] = part.itemId;
      if (part.level > 0) upgrades[newUid] = part.level;
      place();
      applyBuild(index, { slots, wheels, upgrades }, items, `🔧 ${def.name} 장착!`);
      return true;
    };
    if (def.cat === 'wheel') {
      const empty = wheels.findIndex((w) => w === null);
      if (empty >= 0) return mount(() => { wheels[empty] = newUid; });
      const gr = (uid: number) => GRADE_ORDER.indexOf(upgradedGrade(ITEMS[items[uid]].grade, upgrades[uid] ?? 0));
      const target = (wheels.filter((w) => w !== null) as number[]).sort((x, y) => gr(x) - gr(y))[0];
      return target !== undefined && upgrade(target);
    }
    const candidates = (Object.keys(SLOT_CATEGORY) as Slot[]).filter((k) => SLOT_CATEGORY[k] === def.cat);
    const empty = candidates.find((k) => slots[k] === undefined);
    if (empty) return mount(() => { slots[empty] = newUid; });
    const existing = candidates.map((k) => slots[k]!).find((uid) => upgrade(uid));
    if (existing !== undefined) return true;
    if (index === battleHUD.focus) notify(`${def.name}: 이미 최고 등급`);
    return false;
  }
  function useItem(index: number) {
    const a = sim.actors[index], item = a.items.shift();
    if (!item) return;
    a.itemsUsed++;
    if (index === battleHUD.focus) { notify(BATTLE_ITEMS[item].name); sfx.item(); }
    if (item === 'oil') {
      sim.paint.splash(a.own, a.st.x, a.st.z, 4.5); emit(a.st.x, a.st.y + 1, a.st.z, a.color, 35, 8); sfx.pop();
    } else if (item === 'triple') a.wide = 6;
    else if (item === 'turbo') { a.st.itemBoost = 1.8; a.boosts++; if (index === battleHUD.focus) sfx.boost(); }
    else if (item === 'shield') a.st.shield = 10;
    else {
      let target = -1, best = Infinity;
      sim.actors.forEach((b, i) => { const d = Math.hypot(b.st.x - a.st.x, b.st.z - a.st.z); if (i !== index && !isAlly(index, i) && d < best) { best = d; target = i; } });
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
        value += owner === a.own ? 0.05 : owner < 0 ? 1.3 : 1.6;
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
    return { steer: Math.max(-1, Math.min(1, -d * 1.8)) * (reversing ? -1 : 1), throttle: reversing ? -1 : Math.abs(d) > 1 ? 0.55 : 1, boost: Math.abs(d) < 0.15 && a.st.boostEnergy > 0.85 };
  }
  function finish() {
    battleHUD.phase = 'finished'; battleHUD.remaining = 0;
    sim.finishedAt = performance.now();
    sim.actors.forEach((a) => { a.st.speed = 0; a.st.boostTime = 0; a.st.itemBoost = 0; });
    sim.paint.flush(); sfx.whistle(); notify('TIME UP');
  }
  function results(): BattleResultEntry[] {
    const entries = sim.actors.map((a) => ({
      id: a.racer.id, name: a.racer.name, characterId: a.racer.characterId, color: a.color, isPlayer: a.racer.isPlayer,
      paint: Math.max(0, sim.paint.totals[a.own]) / sim.paint.totalArea, area: Math.max(0, sim.paint.totals[a.own]),
      overpaint: sim.paint.overpaint[a.own], boosts: a.boosts, itemsUsed: a.itemsUsed, jumps: a.jumps, rank: 1, cells: sim.paint.cells[a.own],
      team: a.team, teamPaint: a.team === undefined ? undefined : Math.max(0, sim.paint.totals[a.own]) / sim.paint.totalArea,
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
        a.flash = Math.max(0, a.flash - dt);
        // ── 온라인 참가자: 네트워크 위치를 따라가는 퍼펫 ──
        const remote = a.netId ? freshRemote(a.netId) : null;
        if (remote) {
          const k = Math.min(1, dt * 12);
          st.x += (remote.x - st.x) * k; st.z += (remote.z - st.z) * k; st.y += (remote.y - st.y) * k;
          let dh = remote.heading - st.heading;
          while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
          st.heading += dh * k; st.speed = remote.speed; st.steer = remote.steer; st.shield = remote.shield;
          st.airborne = remote.y > arenaHeight(st.x, st.z) + 0.25;
          if (remote.build && remote.items) {
            const key = JSON.stringify(remote.build) + Object.keys(remote.items).length;
            if (key !== a.netBuildKey) { a.netBuildKey = key; applyBuild(i, remote.build, remote.items); }
          }
          a.fireCd -= dt;
          if (remote.firing && a.fireCd <= 0) fire(i);
          if (!st.airborne && Math.abs(st.speed) > 0.7 && Math.hypot(st.x - startX, st.z - startZ) > 0.012) sim.paint.stroke(a.own, st.x, st.z, Math.abs(st.speed), a.wide > 0, a.spec.paintWidth, i);
          else sim.paint.resetTrail(i);
          return;
        }
        let ctrl: Control;
        if (a.racer.controlIndex !== undefined) {
          const control = getControl(a.racer.controlIndex);
          ctrl = { steer: control.x, throttle: control.y, boost: control.boost, fire: control.fire };
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
          // 봇 사격: 정면 콘 안에 상대가 있으면 발사
          a.aimCd -= dt;
          for (let k = 0; k < sim.actors.length && !ctrl.fire; k++) {
            if (k === i || isAlly(i, k)) continue;
            const o = sim.actors[k].st, dx = o.x - st.x, dz = o.z - st.z, dist = Math.hypot(dx, dz);
            if (dist > 17 || dist < 0.5) continue;
            let da = Math.atan2(dx, dz) - st.heading;
            while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
            if (Math.abs(da) < 0.22 + a.spec.gun.spread) ctrl.fire = a.aimCd <= 0;
          }
          if (a.aimCd <= 0) a.aimCd = Math.random() < 0.25 ? 0.6 + Math.random() : 0;
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
        // ── 사격 (드리프트 대신 발사 버튼) ──
        a.fireCd -= dt;
        if (i === 0) sim.localFiring = Boolean(ctrl.fire);
        if (ctrl.fire && a.fireCd <= 0) fire(i);
        a.padCd -= dt; a.jumpCd -= dt; a.wide = Math.max(0, a.wide - dt);
        const ground = arenaHeight(st.x, st.z), owner = sim.paint.ownerAt(st.x, st.z);
        const friction = owner < 0 ? 1 : owner === a.own ? 1.03 : 0.94;
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
          st.speed *= 0.55; st.hit = Math.max(st.hit, 0.18); damage(i, 5, i);
        }
        // 점프대로 떠오른 경우에만 긴 쿨다운 — 수동 점프는 자체 쿨다운(0.55초)을 유지한다
        if (st.airborne && !a.wasAir && a.jumpCd <= 0) { a.jumpCd = 1.3; if (i === battleHUD.focus) sfx.jump(); }
        if (!st.airborne && a.wasAir) { sim.paint.splash(a.own, st.x, st.z, 2.2); emit(st.x, st.y + 0.15, st.z, a.color, 12); if (i === battleHUD.focus) sfx.land(); }
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
          sim.paint.stroke(a.own, st.x, st.z, Math.abs(st.speed), a.wide > 0, a.spec.paintWidth, i);
          if (sim.fxT > 0.06) emit(st.x - Math.sin(st.heading), st.y + 0.3, st.z - Math.cos(st.heading), a.color, 2, 1.8);
        } else sim.paint.resetTrail(i);
      });
      if (sim.fxT > 0.06) sim.fxT = 0;
      // ── 총알 ──
      sim.bullets.forEach((b) => {
        if (!b.active) return;
        b.life -= dt; b.x += b.vx * dt; b.z += b.vz * dt;
        if (b.life <= 0 || !insideArena(b.x, b.z) || blocked(b.x, b.z)) {
          if (b.splash > 0) sim.paint.splash(sim.actors[b.owner].own, b.x, b.z, b.splash * 0.6);
          b.active = false; return;
        }
        for (let k = 0; k < sim.actors.length; k++) {
          if (k === b.owner || isAlly(k, b.owner)) continue;
          const t = sim.actors[k].st;
          if (Math.hypot(t.x - b.x, t.z - b.z) < 1.25 && Math.abs(t.y + 1 - b.y) < 1.7) {
            b.active = false;
            emit(b.x, b.y, b.z, b.color, 6, 3);
            if (b.splash > 0) { sim.paint.splash(sim.actors[b.owner].own, b.x, b.z, b.splash); emit(b.x, b.y, b.z, b.color, 22, 6); }
            t.speed *= 0.94;
            damage(k, b.damage, b.owner);
            break;
          }
        }
      });
      // ── 바닥 부품: 계속 떨어지고, 지나가면 먹어서 장착 ──
      let groundChanged = false;
      sim.groundT -= dt;
      if (sim.groundT <= 0) {
        sim.groundT = 1.6 + Math.random() * 1.2;
        if (sim.ground.length < MAX_GROUND_PARTS) for (let c = 0; c < 14; c++) {
          const x = (Math.random() - 0.5) * (HALF * 2 - 8), z = (Math.random() - 0.5) * (HALF * 2 - 8);
          if (!insideArena(x, z, 3) || blocked(x, z, 2)) continue;
          sim.ground.push({ uid: sim.partUid++, itemId: rollPart().itemId, level: 0, x, y: arenaHeight(x, z) + 9, z, vx: 0, vy: 0, vz: 0, spin: 0, cd: 0.5, from: -1, age: 0 });
          groundChanged = true; break;
        }
      }
      for (let gi = sim.ground.length - 1; gi >= 0; gi--) {
        const g = sim.ground[gi]; g.age += dt; g.cd -= dt;
        const floor = arenaHeight(g.x, g.z);
        if (g.y > floor + 0.01 || g.vy > 0) {
          g.vy -= 20 * dt; g.x += g.vx * dt; g.z += g.vz * dt; g.y += g.vy * dt;
          if (g.y <= floor) { g.y = floor; g.vy = 0; g.vx *= 0.3; g.vz *= 0.3; }
        } else g.y = floor;
        if (!insideArena(g.x, g.z, 1.5) || blocked(g.x, g.z, 0.5)) { g.x *= 0.96; g.z *= 0.96; }
        if (g.cd > 0) continue;
        for (let k = 0; k < sim.actors.length; k++) {
          const ak = sim.actors[k], t = ak.st;
          if (ak.netId && freshRemote(ak.netId)) continue;
          if (k === g.from && g.age < 2.5) continue;
          if (Math.hypot(t.x - g.x, t.z - g.z) < 1.8 && Math.abs(t.y - g.y) < 1.6) {
            if (equipPart(k, g)) {
              sim.ground.splice(gi, 1); groundChanged = true;
              emit(g.x, g.y + 0.6, g.z, ak.color, 10, 3);
              if (k === battleHUD.focus) sfx.item();
            } else g.cd = 2;
            break;
          }
        }
      }
      if (groundChanged) bump();
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
            damage(m.target, 22, m.owner);
            sim.paint.splash(sim.actors[m.owner].own, m.x, m.z, 3.8); emit(m.x, m.y, m.z, sim.actors[m.owner].color, 30, 6);
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
          // 차량끼리 부딪히면 데미지 입기 — 저속 접촉에도 데미지가 들어가고 고속일수록 강하게 부숴짐
          const relSpeed = Math.abs(a.speed) + Math.abs(b.speed);
          if (a.hit <= 0 && b.hit <= 0 && relSpeed > 1.8) {
            const dmgBase = 9 + relSpeed * 0.95;
            damage(i, dmgBase, j); damage(j, dmgBase, i);
            emit((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.6, (a.z + b.z) / 2, '#fff', 10, 4);
            a.hit = b.hit = 0.32; a.speed *= 0.72; b.speed *= 0.72;
            if (i === battleHUD.focus || j === battleHUD.focus) { sfx.bump(); sim.shake = Math.min(0.7, 0.25 + relSpeed * 0.03); }
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
      battleHUD.teamScores = sim.teamMode ? [0, 1].map((t) => ({ team: t, color: TEAM_COLORS[t], paint: coverage[t] })) : [];
      battleHUD.scores = sim.actors.map((a) => ({ team: a.team, id: a.racer.id, name: a.racer.name, characterId: a.racer.characterId, color: a.color, paint: coverage[a.own], human: a.racer.controlIndex !== undefined }));
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
    battleHUD.throttle = playing ? control.y : 0; battleHUD.firing = playing && control.fire;
    battleHUD.hp = Math.max(0, 1 - focused.dmg / focused.spec.partHp);
    battleHUD.partCount = focused.spec.partCount;
    battleHUD.gunName = focused.spec.gunName; battleHUD.gunGrade = focused.spec.gunGrade ? GRADE_LABEL[focused.spec.gunGrade] : null;
    battleHUD.gunDamage = focused.spec.gun.damage; battleHUD.gunRate = focused.spec.gun.rate;
    battleHUD.statSpeed = focused.spec.maxSpeed; battleHUD.statAccel = focused.spec.accel; battleHUD.statGrip = focused.spec.grip;
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
    <Bullets bullets={sim.bullets} />
    {sim.ground.map((g) => <GroundPartView key={g.uid} part={g} />)}
    {sim.actors.map((a, i) => <group key={a.racer.id}>
      <Car build={a.racer.build} items={a.racer.items} characterId={a.racer.characterId} jersey={a.color} stateRef={actorRefs[i]} />
      <PlayerLabel actor={a} />
      <HpBar actor={a} />
      <HitFlash actor={a} />
    </group>)}
    <PaintParticles droplets={sim.droplets} />
  </group>;
}