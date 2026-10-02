import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CHARACTERS, ITEMS, GRADE_LABEL } from '../data/items';
import { useGame, autoBuild, itemsMap, PLAYER_COLORS, TEAM_COLORS, type Racer, type InvItem } from '../store';
import { getControl } from '../game/input';
import { sfx } from '../game/audio';
import { computeLoadout, emptyStats } from '../game/scrap';
import {
  ARENA_R,
  OBSTACLES,
  partDef,
  pickSpawn,
  rollPart,
  type PartDef,
} from '../game/scramble';
import { ItemMesh } from './Parts';
import { Character, newMotion, type Motion } from './Character';
import { HeadStack, insertEntry, newStackState, relayout, type StackState } from './HeadStack';
import { Lights, type Target } from './Stage';
import { makeTexture, Mat, rng, localBounds } from './materials';
import { CardboardBox, GiantCan, Pencil, PetBottle, Shoe, Stone } from './Props';

// ─── HUD 공유 상태 ───────────────────────────────────────────────
export const DURATION = 15;
export const scramble = {
  phase: 'ready' as 'ready' | 'play' | 'outro',
  ready: 2.4,
  remaining: DURATION,
  outro: 0,
  count: 0,
  stackH: 0,
  dashCd: 0,
  board: [] as { name: string; jersey: string; count: number; isPlayer: boolean }[],
  banner: null as null | { text: string; sub?: string; color?: string; id: number },
  toast: null as null | { text: string; id: number },
};
let seq = 0;
const say = (text: string, sub?: string, color?: string) => (scramble.banner = { text, sub, color, id: ++seq });

// ─── 엔티티 ─────────────────────────────────────────────────────
interface WPart {
  uid: number;
  def: PartDef;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  resting: boolean;
  spin: number;
  phase: number;
  cd: number; // 재획득 대기
  lastOwner: number;
  hot: number; // 방금 떨어져서 강조
  restHeight?: number;
}

interface Runner {
  id: string;
  name: string;
  characterId: string;
  jersey: string;
  team?: number;
  isPlayer: boolean;
  controlIndex?: number;
  usedDash: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  kx: number;
  kz: number;
  dash: number;
  dashCd: number;
  hitCd: number;
  stun: number;
  stack: StackState;
  motion: Motion;
  // AI
  tx: number;
  tz: number;
  retarget: number;
  ramTarget: number;
  stuck: number;
  reverse: number;
  aggression: number;
}

const BOT_NAMES = ['레드', '블루', '그린'];
const MAX_GROUND = 66; // 바닥에 남아있는 부품 상한 (1.5배)
const SPAWN_MUL = 1.5; // 부품 생성량 1.5배
const MAX_STACK = 18;
const PICK_R = 1.15;

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

// ─── 바닥 텍스처 ────────────────────────────────────────────────
function floorTex() {
  return makeTexture((g, s) => {
    g.fillStyle = '#c2b49a';
    g.fillRect(0, 0, s, s);
    let seed = 13;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5000; i++) {
      const v = 150 + Math.floor(r() * 60);
      g.fillStyle = `rgba(${v},${v - 8},${v - 20},0.4)`;
      g.fillRect(r() * s, r() * s, 2, 2);
    }
    // 콘크리트 줄눈
    g.strokeStyle = 'rgba(80,66,50,0.3)';
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      const p = (i / 8) * s;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(s, p); g.stroke();
    }
    // 기름 얼룩
    for (let i = 0; i < 14; i++) {
      const x = r() * s, y = r() * s, rad = 14 + r() * 46;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(45,32,24,0.42)');
      grd.addColorStop(1, 'rgba(45,32,24,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    // 중앙 마킹
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 6;
    g.setLineDash([26, 20]);
    g.beginPath(); g.arc(s / 2, s / 2, s * 0.29, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
  }, 512, 4);
}

// ─── 파티클 (금속 파편/먼지) ─────────────────────────────────────
const DUST_N = 90;
const dust = Array.from({ length: DUST_N }, () => ({ x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, life: 0, s: 1, c: 0 }));
let dustI = 0;
function burstDust(x: number, y: number, z: number, n: number, spd = 5) {
  for (let i = 0; i < n; i++) {
    const d = dust[dustI];
    dustI = (dustI + 1) % DUST_N;
    const a = Math.random() * Math.PI * 2;
    Object.assign(d, {
      x, y, z,
      vx: Math.cos(a) * spd * (0.4 + Math.random() * 0.7),
      vz: Math.sin(a) * spd * (0.4 + Math.random() * 0.7),
      vy: 2.5 + Math.random() * 4,
      life: 0.45 + Math.random() * 0.35,
      s: 0.07 + Math.random() * 0.12,
      c: Math.floor(Math.random() * 4),
    });
  }
}

function Dust() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const colors = ['#d8d2c4', '#9aa3ad', '#ffd43b', '#c8743a'];
  useEffect(() => {
    const m = mesh.current!;
    for (let i = 0; i < DUST_N; i++) m.setColorAt(i, col.set(colors[i % 4]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [col]);
  useFrame((_, rdt) => {
    const dt = Math.min(rdt, 0.05);
    const m = mesh.current!;
    for (let i = 0; i < DUST_N; i++) {
      const d = dust[i];
      if (d.life > 0) {
        d.life -= dt;
        d.vy -= 20 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        if (d.y < 0.05) {
          d.y = 0.05;
          d.vy *= -0.25;
        }
      }
      dummy.position.set(d.x, d.life > 0 ? d.y : -50, d.z);
      dummy.scale.setScalar(d.life > 0 ? d.s : 0.001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, DUST_N]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} metalness={0.4} />
    </instancedMesh>
  );
}

/** 부품 오브젝트 — Parts.ItemMesh를 그대로 사용해 "줍는 것 = 쌓이는 것 = 조립 부품"이 동일하게 보인다 */
function PartNode({ p }: { p: WPart }) {
  const g = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!model.current) return;
    const bounds = localBounds(model.current);
    const center = bounds.getCenter(new THREE.Vector3());
    p.restHeight = bounds.getSize(new THREE.Vector3()).y * p.def.scale / 2 + 0.02;
    model.current.position.set(-center.x, -center.y, -center.z);
    if (p.resting) p.y = p.restHeight;
  }, [p]);
  useFrame((st, dt) => {
    const o = g.current;
    if (!o) return;
    o.rotation.y += dt * p.spin;
    if (!p.resting) o.rotation.x += dt * 2.2;
    const bob = p.resting ? Math.sin(st.clock.elapsedTime * 2.4 + p.phase) * 0.007 : 0;
    o.position.set(p.x, p.y + bob, p.z);
  });
  return (
    <group ref={g} position={[p.x, p.y, p.z]} scale={p.def.scale}>
      <group ref={model}><ItemMesh itemId={p.def.itemId} /></group>
      {p.hot > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
          <ringGeometry args={[0.34, 0.5, 20]} />
          <meshBasicMaterial color="#ffd43b" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── 러너 ───────────────────────────────────────────────────────
function RunnerNode({ r }: { r: Runner }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  const swayV = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const o = g.current;
    if (!o) return;
    o.position.set(r.x, 0, r.z);
    o.rotation.y = r.heading;

    // 달릴 때 머리 위 적재물 흔들림 (스프링)
    const load = Math.min(1, r.stack.height / 2.2);
    const targetSway = -r.motion.steer * (0.35 + load * 0.5) * Math.min(1, Math.abs(r.speed) / 6);
    swayV.current += (targetSway - r.stack.sway) * Math.min(1, dt * 26);
    swayV.current *= Math.exp(-6 * dt);
    r.stack.sway += swayV.current * dt * 12;
    r.stack.pitchS = -Math.min(1, Math.abs(r.speed) / 7) * (0.12 + load * 0.22);

    // 기절/피격 시 크게 흔들림
    if (r.stun > 0) r.stack.sway += Math.sin(t.current * 30) * 0.5 * r.stun;
    r.stack.sway = Math.max(-1.4, Math.min(1.4, r.stack.sway));
  });
  return (
    <group ref={g}>
      <Character characterId={r.characterId} motion={{ current: r.motion }} scale={0.92} jersey={r.jersey} />
      <HeadStack st={r.stack} baseY={r.characterId === 'rabbit' ? 2.08 : r.characterId === 'deer' ? 2.0 : r.characterId === 'fox' ? 1.79 : r.characterId === 'penguin' ? 1.76 : 1.71} maxSlots={MAX_STACK} />
      {/* 종료 연출: 쌓아둔 부품이 빛으로 뭉쳐 자동차 재료가 된다 */}
      <mesh position={[0, 2.5 + r.stack.height * 0.5, 0]} visible={r.stack.outro > 0.45}>
        <sphereGeometry args={[0.95, 18, 14]} />
        <meshBasicMaterial color="#fff2a8" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {r.isPlayer && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.62, 0.8, 24]} />
          <meshBasicMaterial color="#ffd43b" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

// ════════════════════════════════════════════════════════════════
export function ScrambleWorld() {
  const characterId = useGame((s) => s.characterId);
  const round = useGame((s) => s.round);
  const { camera } = useThree();
  const [, force] = useState(0);
  const lightTarget = useRef<Target>({ x: 0, y: 0, z: 0 });
  const shake = useRef(0);

  const sim = useMemo(() => {
    const r = rng(round * 5171 + 23);
    const starts: [number, number, number][] = [
      [0, 8.5, Math.PI],
      [-7.5, -4, Math.PI * 0.6],
      [7.5, -4, -Math.PI * 0.6],
      [0, -10, 0],
    ];
    const game = useGame.getState();
    const local = game.localPlayers;
    // 온라인 방: 다른 참가자를 우선 배치하고 남는 자리는 AI가 채운다
    const remote = game.online ? game.online.players.filter((p) => p.id !== game.online!.playerId).slice(0, 3 - local.length) : [];
    const fill = CHARACTERS.filter((c) => c.id !== characterId).sort(() => r() - 0.5).slice(0, 3 - local.length - remote.length);
    const others = [...remote.map((p) => ({ id: p.characterId })), ...fill];
    const remoteAt = (i: number) => (i > local.length ? remote[i - 1 - local.length] : undefined);
    const teamMode = game.gameMode === 'team';
    // ── 팀 배정: 사람 먼저(온라인은 대기실에서 고른 팀, 로컬은 P1·P2가 A팀), 남는 자리는 AI가 인원이 적은 팀으로 ──
    const myTeam = game.online ? game.online.players.find((p) => p.id === game.online!.playerId)?.team ?? 0 : 0;
    const teamOf: number[] = [];
    const counts = [0, 0];
    const humans = 1 + local.length + remote.length;
    for (let i = 0; i < 4; i++) {
      let t: number;
      if (i < humans) t = i === 0 ? myTeam : i <= local.length ? (i < 2 ? 0 : 1) : remote[i - 1 - local.length].team;
      else t = counts[0] <= counts[1] ? (counts[0] < 2 ? 0 : 1) : (counts[1] < 2 ? 1 : 0);
      teamOf.push(t); counts[t]++;
    }
    const colors = teamMode ? teamOf.map((t) => TEAM_COLORS[t]) : [game.paintColor, ...PLAYER_COLORS.filter((c) => c !== game.paintColor)].slice(0, 4);
    const runners: Runner[] = [characterId, ...local.map((p) => p.characterId), ...others.map((c) => c.id)].map((cid, i) => ({
      id: i === 0 ? 'player' : i <= local.length ? `p${i + 1}` : remoteAt(i) ? `net-${remoteAt(i)!.id}` : `bot${i}`,
      name: i === 0 ? (game.online?.players.find((p) => p.id === game.online!.playerId)?.name ?? 'PLAYER') : i <= local.length ? `P${i + 1}` : remoteAt(i)?.name ?? (teamMode ? `AI ${teamOf[i] === myTeam ? '동료' : '적'}${i}` : BOT_NAMES[i - 1]),
      characterId: cid,
      jersey: colors[i],
      team: teamMode ? teamOf[i] : undefined,
      isPlayer: i === 0,
      controlIndex: i <= local.length ? i : undefined,
      usedDash: i <= local.length ? getControl(i).dashPresses : 0,
      x: starts[i][0],
      z: starts[i][1],
      heading: starts[i][2],
      speed: 0,
      kx: 0,
      kz: 0,
      dash: 0,
      dashCd: 0,
      hitCd: 0,
      stun: 0,
      stack: newStackState(),
      motion: newMotion(),
      tx: 0,
      tz: 0,
      retarget: 0,
      ramTarget: -1,
      stuck: 0,
      reverse: 0,
      aggression: 0.5 + r() * 0.5,
    }));
    return { runners, parts: [] as WPart[], uid: 1, zone: Math.floor(r() * 11), spawnT: 0, dirty: true, outroT: 0, committed: false, lastBeep: 9, readyEnds: 0, playEnds: 0, outroEnds: 0 };
  }, [characterId, round]);

  // ── 초기 부품 + 상태 리셋 ──
  useEffect(() => {
    Object.assign(scramble, {
      phase: 'ready', ready: 2.4, remaining: DURATION, outro: 0,
      count: 0, stackH: 0, dashCd: 0, board: [], banner: null, toast: null,
    });
    say('READY?', '부품 쟁탈전 · 15초', '#ffd43b');
    sim.readyEnds = performance.now() + 2400;
    sim.playEnds = 0;
    sim.parts.length = 0;
    camera.position.set(0, 13, 13);
    camera.lookAt(0, 1, 0);
    return () => {
      sim.parts.length = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // ── 부품 드롭 ──
  const dropParts = (rn: Runner, n: number, dirX: number, dirZ: number) => {
    const st = rn.stack;
    const dropped = Math.min(n, st.entries.length);
    for (let i = 0; i < n && st.entries.length > 0; i++) {
      const idx = Math.floor(Math.random() * st.entries.length);
      const e = st.entries[idx];
      const originalHeight = e.y;
      st.entries.splice(idx, 1);
      relayout(st);
      const a = Math.atan2(dirZ, dirX) + (Math.random() - 0.5) * 1.7;
      const spd = 3.5 + Math.random() * 3.5;
      sim.parts.push({
        uid: e.uid,
        def: partDef(e.itemId),
        x: rn.x,
        y: 1.8 + originalHeight,
        z: rn.z,
        vx: Math.cos(a) * spd,
        vz: Math.sin(a) * spd,
        vy: 5 + Math.random() * 3,
        resting: false,
        spin: 2 + Math.random() * 4,
        phase: Math.random() * 6,
        cd: 0.42,
        lastOwner: sim.runners.indexOf(rn),
        hot: 1.6,
      });
      sim.dirty = true;
    }
    if (dropped > 0) {
      sfx.clank();
      burstDust(rn.x, 1.2, rn.z, 8, 4);
      if (rn.isPlayer) {
        shake.current = Math.max(shake.current, 0.55);
        scramble.toast = { text: `-${dropped} 부품 흘림!`, id: ++seq };
      }
    }
  };

  // ── 부품 획득 ──
  const grab = (rn: Runner, p: WPart) => {
    insertEntry(rn.stack, p.uid, p.def);
    sim.dirty = true;
    if (rn.isPlayer) {
      const def = ITEMS[p.def.itemId];
      const isBrush = def?.cat === 'brush';
      const grade = def?.grade ?? 'common';
      sfx.pickup(grade === 'legend' ? 'big' : grade === 'epic' ? 'gold' : grade === 'rare' ? 'rare' : 'common', 1);
      scramble.toast = {
        text: isBrush ? `🖌 ${p.def.label} (${GRADE_LABEL[grade]} 붓)` : `+ ${p.def.label}${grade !== 'common' ? ` · ${GRADE_LABEL[grade]}` : ''}`,
        id: ++seq,
      };
      if (p.def.tier === 'large' || grade === 'legend') burstDust(rn.x, 1.8, rn.z, 10, 4);
    }
    return true;
  };

  // ── 러너 스텝 ──
  const stepRunner = (rn: Runner, ix: number, iz: number, dt: number, wantDash: boolean) => {
    const load = Math.min(1, rn.stack.height / 2.4);
    const maxS = (8.4 - load * 2.0) * (rn.dash > 0 ? 1.9 : 1);
    const len = Math.hypot(ix, iz);

    rn.dashCd -= dt;
    rn.hitCd -= dt;
    rn.stun = Math.max(0, rn.stun - dt);
    if (wantDash && rn.dashCd <= 0 && rn.dash <= 0) {
      rn.dash = 0.3;
      rn.dashCd = 1.5;
      if (rn.isPlayer) {
        sfx.boost();
        scramble.dashCd = 1.5;
      }
      burstDust(rn.x, 0.2, rn.z, 6, 3);
    }
    if (rn.dash > 0) rn.dash -= dt;

    if (rn.stun > 0) {
      rn.speed *= Math.exp(-dt * 6);
    } else if (len > 0.15) {
      const nx = ix / Math.max(1, len);
      const nz = -iz / Math.max(1, len);
      const target = Math.atan2(nx, nz);
      const d = wrap(target - rn.heading);
      rn.heading += d * Math.min(1, dt * 13);
      rn.motion.steer = Math.max(-1, Math.min(1, -d * 1.6));
      rn.speed += (maxS * Math.min(1, len) - rn.speed) * Math.min(1, dt * 8);
    } else {
      rn.speed -= rn.speed * Math.min(1, dt * 10);
      rn.motion.steer += (0 - rn.motion.steer) * Math.min(1, dt * 7);
    }
    if (rn.speed > maxS) rn.speed = maxS;

    rn.x += (Math.sin(rn.heading) * rn.speed + rn.kx) * dt;
    rn.z += (Math.cos(rn.heading) * rn.speed + rn.kz) * dt;
    rn.kx *= Math.exp(-6 * dt);
    rn.kz *= Math.exp(-6 * dt);

    // 맵 경계
    const rr = Math.hypot(rn.x, rn.z);
    if (rr > ARENA_R - 0.7) {
      rn.x *= (ARENA_R - 0.7) / rr;
      rn.z *= (ARENA_R - 0.7) / rr;
      rn.speed *= 0.6;
    }
    // 장애물
    for (const o of OBSTACLES) {
      const dx = rn.x - o.x;
      const dz = rn.z - o.z;
      const d = Math.hypot(dx, dz);
      const rad = o.r + 0.45;
      if (d < rad && d > 1e-4) {
        rn.x = o.x + (dx / d) * rad;
        rn.z = o.z + (dz / d) * rad;
        rn.speed *= 0.7;
      }
    }

    rn.motion.speed = rn.speed;
    rn.motion.mode = rn.speed > 0.5 ? 'run' : 'idle';
    rn.motion.stun = rn.stun;
  };

  // ── AI ──
  const botControl = (rn: Runner, idx: number, dt: number) => {
    rn.retarget -= dt;
    if (rn.retarget <= 0) {
      rn.retarget = 0.3 + Math.random() * 0.25;
      // 더 많이 가진 상대를 노려 부딪힌다
      rn.ramTarget = -1;
      let bestScore = -1;
      const myCount = rn.stack.entries.length;
      for (let j = 0; j < sim.runners.length; j++) {
        if (j === idx) continue;
        const o = sim.runners[j];
        const d = Math.hypot(o.x - rn.x, o.z - rn.z);
        const gain = o.stack.entries.length - myCount;
        if (o.stack.entries.length >= 3 && gain >= 0 && d < 11) {
          const s = (3 + gain) * rn.aggression / (d + 2);
          if (s > bestScore) {
            bestScore = s;
            rn.ramTarget = j;
          }
        }
      }
      if (rn.ramTarget < 0) {
        let best = -1;
        let tx = rn.x, tz = rn.z;
        for (const p of sim.parts) {
          if (p.cd > 0) continue;
          const d = Math.hypot(p.x - rn.x, p.z - rn.z);
          const def = ITEMS[p.def.itemId];
          const gradeW = def?.grade === 'legend' ? 3 : def?.grade === 'epic' ? 2 : def?.grade === 'rare' ? 1.4 : 1;
          // 붓은 페인트 배틀의 핵심이라 봇이 더 적극적으로 노린다 (이미 붓이 있으면 덜)
          const hasBrush = rn.stack.entries.some((e) => ITEMS[e.itemId]?.cat === 'brush');
          const brushW = def?.cat === 'brush' ? (hasBrush ? 1.1 : 2.2) : 1;
          const w = (p.def.tier === 'large' ? 5 : p.def.tier === 'mid' ? 2.4 : 1.2) * rn.aggression * gradeW * brushW;
          const s = w / (d + 2.2);
          if (s > best) {
            best = s;
            tx = p.x;
            tz = p.z;
          }
        }
        rn.tx = tx;
        rn.tz = tz;
      }
    }
    let tx = rn.tx;
    let tz = rn.tz;
    if (rn.ramTarget >= 0) {
      const o = sim.runners[rn.ramTarget];
      tx = o.x;
      tz = o.z;
    }
    const dx = tx - rn.x;
    const dz = tz - rn.z;
    const d = Math.hypot(dx, dz) || 1;
    // 막힘 처리
    if (Math.abs(rn.speed) < 1.2) {
      rn.stuck += dt;
      if (rn.stuck > 0.6) {
        rn.reverse = 0.5;
        rn.stuck = 0;
        rn.retarget = 0;
      }
    } else rn.stuck = 0;
    if (rn.reverse > 0) {
      rn.reverse -= dt;
      return { ix: -dx / d, iz: dz / d, dash: false };
    }
    const wantDash = rn.ramTarget >= 0 && d < 5 && rn.dashCd <= 0 && Math.random() < 0.06;
    return { ix: dx / d, iz: -dz / d, dash: wantDash };
  };

  // ── 종료 처리 ──
  const finish = () => {
    // Each character owns its own stack. Only the player's final stack becomes the player's inventory.
    const inventoryOf = (runner: Runner): InvItem[] => runner.stack.entries.map((e) => ({ uid: e.uid, itemId: e.itemId }));
    const bots: Racer[] = sim.runners.slice(1).map((b) => {
      const inv = inventoryOf(b);
      return { id: b.id, name: b.name, characterId: b.characterId, jersey: b.jersey,
        build: autoBuild(inv), items: itemsMap(inv), isPlayer: b.controlIndex !== undefined, controlIndex: b.controlIndex, team: b.team,
        loadout: computeLoadout({ ...emptyStats(), common: inv.length }) };
    });
    const entries = sim.runners.map((x) => ({
      id: x.id, name: x.name, characterId: x.characterId, jersey: x.jersey,
      isPlayer: x.controlIndex !== undefined, stats: { ...emptyStats(), common: x.stack.entries.length, score: x.stack.entries.length },
    }));
    useGame.getState().completeCollection(inventoryOf(sim.runners[0]), {
      entries,
      bots,
      loadout: computeLoadout({ ...emptyStats(), common: sim.runners[0].stack.entries.length }),
    });
  };

  // ── 메인 루프 ──
  useFrame((_st, rawDt) => {
    const dt = Math.min(rawDt, 0.04);
    if (!sim.readyEnds) return;
    const now = performance.now();
    const runners = sim.runners;
    const P = runners[0];

    // 페이즈
    if (scramble.phase === 'ready') {
      scramble.ready = Math.max(0, (sim.readyEnds - now) / 1000);
      if (now >= sim.readyEnds) {
        scramble.phase = 'play';
        sim.playEnds = now + DURATION * 1000;
        say('GO!', '부품을 주워 머리에 쌓아라!', '#8be04a');
        sfx.beep(true);
      }
    } else if (scramble.phase === 'play') {
      scramble.remaining = Math.max(0, (sim.playEnds - now) / 1000);
      const sec = Math.ceil(scramble.remaining);
      if (sec <= 3 && sec !== sim.lastBeep && sec > 0) {
        sim.lastBeep = sec;
        sfx.beep(false);
      }
      if (scramble.remaining <= 0) {
        scramble.phase = 'outro';
        scramble.outro = 0;
        sim.outroT = 2.0;
        sim.outroEnds = now + 2000;
        finish();
        say('TIME UP!', '모은 부품으로 자동차 조립!', '#ffffff');
        sfx.whistle();
      }
    } else if (scramble.phase === 'outro') {
      scramble.outro = Math.min(1, scramble.outro + dt / 1.5);
      if (now >= sim.outroEnds && !sim.committed) {
        sim.committed = true;
        useGame.getState().finishCollect();
      }
    }

    const playing = scramble.phase === 'play';
    // ── 스폰 ──
    if (playing) {
      sim.spawnT -= dt;
      const live = sim.parts.length;
      // 끊임없이 드롭: 상한에 도달하면 가장 오래된(아무도 안 든) 바닥 부품을 치우고 새 부품을 떨어뜨린다
      if (sim.spawnT <= 0 && live >= MAX_GROUND) {
        let oldest = sim.parts.findIndex((p) => p.resting && p.lastOwner < 0);
        if (oldest < 0) oldest = sim.parts.findIndex((p) => p.resting);
        if (oldest >= 0) { sim.parts.splice(oldest, 1); sim.dirty = true; }
      }
      if (sim.spawnT <= 0 && sim.parts.length < MAX_GROUND) {
        sim.spawnT = (scramble.remaining > 13.8 ? 0.07 : 0.24) / SPAWN_MUL;
        const spot = pickSpawn(sim.zone, runners);
        if (spot) {
          sim.zone = spot.zone + 1 + Math.floor(Math.random() * 3);
          const def = rollPart();
          sim.parts.push({
            uid: sim.uid++, def, x: spot.x, y: 5 + Math.random() * 2, z: spot.z,
            vx: 0, vz: 0, vy: -1, resting: false, spin: 1 + Math.random() * 2, phase: Math.random() * 6,
            cd: 0.12, lastOwner: -1, hot: 0,
          });
          sim.dirty = true;
        }
      }
    }

    // ── 러너 ──
    runners.forEach((rn, i) => {
      let ix = 0;
      let iz = 0;
      let wantDash = false;
      if (playing) {
        if (rn.controlIndex !== undefined) {
          const control = getControl(rn.controlIndex);
          ix = control.x;
          iz = control.y;
          wantDash = control.dashPresses > rn.usedDash;
          rn.usedDash = control.dashPresses;
        } else {
          const c = botControl(rn, i, dt);
          ix = c.ix;
          iz = c.iz;
          wantDash = c.dash;
        }
      }
      if (playing) stepRunner(rn, ix, iz, dt, wantDash);
      if (!playing) {
        rn.speed = 0; rn.kx = 0; rn.kz = 0;
        if (rn.controlIndex !== undefined) rn.usedDash = getControl(rn.controlIndex).dashPresses;
        rn.motion.speed = 0;
        rn.motion.mode = 'idle';
        if (scramble.phase === 'outro') rn.stack.outro = scramble.outro;
      }
      scramble.dashCd = Math.max(0, P.dashCd);
    });

    // ── 러너끼리 충돌 ──
    for (let i = 0; playing && i < runners.length; i++) {
      for (let j = i + 1; j < runners.length; j++) {
        const a = runners[i];
        const b = runners[j];
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        const R = 0.92;
        if (d > R || d < 1e-4) continue;
        const nx = dx / d;
        const nz = dz / d;
        const push = (R - d) / 2;
        a.x += nx * push;
        a.z += nz * push;
        b.x -= nx * push;
        b.z -= nz * push;

        const avx = Math.sin(a.heading) * a.speed + a.kx;
        const avz = Math.cos(a.heading) * a.speed + a.kz;
        const bvx = Math.sin(b.heading) * b.speed + b.kx;
        const bvz = Math.cos(b.heading) * b.speed + b.kz;
        const impact = -((avx - bvx) * nx + (avz - bvz) * nz);
        if (impact < 2.2 || a.hitCd > 0 || b.hitCd > 0) continue;

        a.hitCd = b.hitCd = 0.5;
        const attacking = a.dash > 0 || b.dash > 0;
        const mag = impact + (attacking ? 5 : 0);
        const knock = Math.min(14, 3.5 + mag * 0.85);
        a.kx += nx * knock;
        a.kz += nz * knock;
        b.kx -= nx * knock;
        b.kz -= nz * knock;

        const ordinary = mag < 6 ? 1 : mag < 10 ? 2 : 3;
        const attackLoss = Math.min(4, Math.max(2, Math.ceil(mag / 4)));
        const loseA = a.dash > 0 && b.dash <= 0 ? 0 : b.dash > 0 ? attackLoss : ordinary;
        const loseB = b.dash > 0 && a.dash <= 0 ? 0 : a.dash > 0 ? attackLoss : ordinary;
        const victim = a.dash > 0 ? b : b.dash > 0 ? a : impact > 0 ? b : a;
        victim.stun = Math.max(victim.stun, attacking ? 0.55 : 0.32);
        a.speed *= 0.55;
        b.speed *= 0.55;
        dropParts(a, loseA, -nx, -nz);
        dropParts(b, loseB, nx, nz);

        sfx.bump();
        const near = Math.hypot(P.x - a.x, P.z - a.z) < 16;
        if (near) shake.current = Math.max(shake.current, Math.min(0.8, mag / 16));
        if (attacking && (a.isPlayer || b.isPlayer)) {
          const meAttacking = a.isPlayer ? a.dash > 0 : b.dash > 0;
          say(meAttacking ? '공격 성공!' : '공격받았다!', meAttacking ? '부품을 흘리게 만들었다!' : '부품을 흘렸다!', meAttacking ? '#8be04a' : '#ff5e7e');
        }
      }
    }

    // ── 부품 물리 + 줍기 ──
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i];
      p.cd -= dt;
      p.hot = Math.max(0, p.hot - dt);
      const rest = p.restHeight ?? p.def.h * 0.5 + 0.03;

      if (!p.resting) {
        p.vy -= 26 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y <= rest) {
          p.y = rest;
          if (p.vy < -2.5) {
            p.vy = -p.vy * 0.34;
            p.vx *= 0.62;
            p.vz *= 0.62;
            if (Math.abs(p.vy) < 1.6) {
              p.vy = 0;
              p.resting = true;
              p.vx = p.vz = 0;
            }
          } else {
            p.vy = 0;
            p.resting = true;
            p.vx = p.vz = 0;
          }
        }
        // 경계/장애물 반사
        const rr = Math.hypot(p.x, p.z);
        if (rr > ARENA_R - 0.7) {
          const nx = p.x / rr, nz = p.z / rr;
          const vn = p.vx * nx + p.vz * nz;
          if (vn > 0) {
            p.vx -= 2 * vn * nx;
            p.vz -= 2 * vn * nz;
          }
          p.x = nx * (ARENA_R - 0.7);
          p.z = nz * (ARENA_R - 0.7);
        }
        for (const o of OBSTACLES) {
          const dx = p.x - o.x, dz = p.z - o.z;
          const dd = Math.hypot(dx, dz);
          if (dd < o.r + 0.3 && dd > 1e-4) {
            const nx = dx / dd, nz = dz / dd;
            const vn = p.vx * nx + p.vz * nz;
            if (vn < 0) {
              p.vx -= 2 * vn * nx;
              p.vz -= 2 * vn * nz;
            }
            p.x = o.x + nx * (o.r + 0.3);
            p.z = o.z + nz * (o.r + 0.3);
          }
        }
      }

      if (!playing || p.cd > 0 || p.y > 1.0) continue;

      // 줍기 판정 (가장 가까운 러너가 먼저)
      const nearest = runners.map((runner, k) => ({ k, d: Math.hypot(runner.x - p.x, runner.z - p.z) })).sort((a, b) => a.d - b.d);
      for (const { k } of nearest) {
        const rn = runners[k];
        if (p.lastOwner === k && p.cd > -0.5) continue;
        const dx = rn.x - p.x;
        const dz = rn.z - p.z;
        if (dx * dx + dz * dz > PICK_R * PICK_R) continue;
        if (rn.stack.entries.length >= MAX_STACK) continue;
        if (grab(rn, p)) {
          sim.parts.splice(i, 1);
          sim.dirty = true;
          break;
        }
      }
    }

    // ── HUD 데이터 ──
    scramble.count = P.stack.entries.length;
    scramble.stackH = P.stack.height;
    scramble.board = runners.map((r) => ({ name: r.name, jersey: r.jersey, count: r.stack.entries.length, isPlayer: r.isPlayer }));

    // ── 카메라 (적재물이 높아지면 위로 올려 잘 보이게) ──
    const h = P.stack.height;
    shake.current = Math.max(0, shake.current - dt * 2.4);
    const sh = shake.current * shake.current * 0.5;
    const back = 9.2 + h * 0.55;
    const up = 6.2 + h * 0.95;
    const k = Math.min(1, dt * 4.2);
    camera.position.x += (P.x - camera.position.x) * k;
    camera.position.z += (P.z + back - camera.position.z) * k;
    camera.position.y += (up - camera.position.y) * k;
    camera.lookAt(
      P.x + (Math.random() - 0.5) * sh,
      1.1 + h * 0.55 + (Math.random() - 0.5) * sh,
      P.z + (Math.random() - 0.5) * sh,
    );
    const cam = camera as THREE.PerspectiveCamera;
    const fovT = 58 + Math.min(1, h / 2.6) * 9;
    cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();

    // 부품 목록이 바뀌었으면 리렌더 (새 부품 등장 / 줍기 / 분실)
    if (sim.dirty) {
      sim.dirty = false;
      force((n) => n + 1);
    }

    lightTarget.current.x = P.x;
    lightTarget.current.z = P.z;
  });

  const floor = useMemo(() => floorTex(), []);

  return (
    <group>
      <Lights target={lightTarget} size={22} />

      {/* 아레나 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ARENA_R + 0.9, 64]} />
        <meshStandardMaterial map={floor} roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[80, 48]} />
        <Mat color="#8e9a86" kind="matte" />
      </mesh>

      {/* 외곽 벽 (거대한 나무판 + 타이어) */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[ARENA_R + 1.1, ARENA_R + 1.1, 2.8, 64, 1, true]} />
        <Mat color="#b98c5c" kind="matte" side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 40 }).map((_, i) => {
        const a = (i / 40) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (ARENA_R + 1.4), 0.5, Math.sin(a) * (ARENA_R + 1.4)]} rotation={[Math.PI / 2, 0, a]} castShadow>
            <torusGeometry args={[0.62, 0.26, 8, 16]} />
            <Mat color={i % 3 === 0 ? '#e53935' : '#2b2b30'} kind="rubber" />
          </mesh>
        );
      })}

      {/* 장애물: 낮은 박스 / 고물 더미 / 통로 벽 */}
      {OBSTACLES.map((o, i) =>
        o.kind === 'box' ? (
          <CardboardBox key={i} position={[o.x, 0, o.z]} rotation={[0, i * 0.7, 0]} size={[2.4, 1.7, 2.4]} />
        ) : o.kind === 'wall' ? (
          <group key={i} position={[o.x, 0, o.z]}>
            <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5, 2.1, 1.5]} />
              <Mat color="#c9a36a" kind="matte" />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
              <boxGeometry args={[1.7, 0.22, 1.7]} />
              <Mat color="#8d6e4a" kind="matte" />
            </mesh>
          </group>
        ) : (
          <group key={i} position={[o.x, 0, o.z]}>
            <mesh position={[0, 0.3, 0]} scale={[1, 0.42, 1]} castShadow receiveShadow>
              <sphereGeometry args={[o.r + 0.25, 18, 12]} />
              <Mat color="#7a6a58" kind="matte" />
            </mesh>
            <mesh position={[0.35, 0.62, 0.2]} rotation={[0.4, 0.8, 0.3]}>
              <cylinderGeometry args={[0.3, 0.3, 0.62, 16]} />
              <Mat color="#c8743a" kind="metal" />
            </mesh>
            <mesh position={[-0.4, 0.55, -0.25]} rotation={[1.2, 0.3, 0.6]}>
              <boxGeometry args={[0.7, 0.5, 0.35]} />
              <Mat color="#3b82f6" kind="plastic" />
            </mesh>
          </group>
        ),
      )}

      {/* 아레나 안 작은 소품 */}
      <Stone position={[-2.6, 0, -8.4]} seed={4} scale={0.8} />
      <Stone position={[3.2, 0, 9.2]} seed={7} scale={0.65} color="#a3a7ad" />

      {/* 바깥 거대 소품 (작아진 세계 연출) */}
      <PetBottle position={[-24, 0, -6]} scale={1.25} />
      <PetBottle position={[26, 0, 12]} scale={1.05} tint="#d6ffd9" cap="#43a047" />
      <GiantCan position={[22, 0, -20]} rotation={[0, 0.6, 0]} color="#1565c0" label="#e3f2fd" scale={1.7} />
      <GiantCan position={[-25, 0, 18]} rotation={[0, 1.4, 0]} color="#f9a825" label="#fff8e1" scale={1.5} />
      <Pencil position={[-4, 0.6, 30]} rotation={[0, 0.3, Math.PI / 2]} length={26} />
      <Pencil position={[30, 6, -4]} rotation={[0.15, 0, 0.12]} length={14} color="#43a047" />
      <CardboardBox position={[8, 0, -32]} size={[13, 10, 9]} rotation={[0, -0.5, 0]} open />
      <CardboardBox position={[-30, 0, -24]} size={[11, 8, 8]} rotation={[0, 0.8, 0]} />
      <Shoe position={[24, 0, 30]} rotation={[0, 2.1, 0]} scale={1.7} color="#3b6fd6" />

      {/* 부품 */}
      {sim.parts.map((p) => (
        <PartNode key={p.uid} p={p} />
      ))}

      {/* 러너 */}
      {sim.runners.map((r) => (
        <RunnerNode key={r.id} r={r} />
      ))}

      <Dust />
    </group>
  );
}
