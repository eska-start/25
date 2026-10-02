import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ITEMS } from '../data/items';
import type { CarBuild } from '../store';
import type { VehicleState } from '../game/vehicle';
import { Character, newMotion, type Motion } from './Character';
import { BODIES, Body, Part, Tape, Wheel } from './Parts';
import { Mat } from './materials';

interface CarProps {
  build: CarBuild;
  items: Record<number, string>;
  characterId: string;
  stateRef?: React.MutableRefObject<VehicleState>;
  preview?: boolean;
  jersey?: string;
  forceBundle?: boolean;
  /** 운전석에 앉은 캐릭터를 표시하지 않음 (메인 메뉴 쇼케이스용) */
  noDriver?: boolean;
}

export interface CarLayout {
  bodyId: string | null;
  hasBody: boolean;
  onFoot: boolean;
  wheelCount: number;
  wheels: { id: string; x: number; z: number; r: number }[];
  baseY: number;
  roll: number;
  pitch: number;
  def: (typeof BODIES)[string] | null;
}

/** 차체가 없을 때 바퀴를 배치하기 위한 기본 뼈대(프레임) 치수 — 실제 차체 메시는 그리지 않는다 */
const FRAME_FALLBACK: (typeof BODIES)['can'] = {
  w: 1.3,
  h: 0.55,
  l: 2.3,
  seat: [0, 0.55, -0.1],
  wheelX: 0.95,
  wheelZ: 0.85,
  clearance: 0.05,
};

export function computeLayout(build: CarBuild, items: Record<number, string>): CarLayout {
  const bodyUid = build.slots.body;
  const bodyId = bodyUid !== undefined ? items[bodyUid] : null;
  const wheelIds = build.wheels.map((uid) => (uid !== null ? items[uid] : null));
  const count = wheelIds.filter(Boolean).length;

  if (count === 0) {
    // 바퀴가 0개면 캐릭터가 고철차를 직접 들고 뛰어야 함!
    return { bodyId, hasBody: Boolean(bodyId), onFoot: true, wheelCount: 0, wheels: [], baseY: 0, roll: 0, pitch: 0, def: null };
  }

  // 바퀴가 1개 이상이면 바퀴 위에 차대가 얹혀진다.
  // 차체 부품이 없으면 '없는 그대로' — 가짜 캔 차체를 대신 넣지 않고, 바퀴 배치용 기본 프레임 치수만 사용한다.
  const hasBody = Boolean(bodyId);
  const actualDef = hasBody ? BODIES[bodyId!] : FRAME_FALLBACK;

  const pos = [
    [-actualDef.wheelX, actualDef.wheelZ],
    [actualDef.wheelX, actualDef.wheelZ],
    [-actualDef.wheelX, -actualDef.wheelZ],
    [actualDef.wheelX, -actualDef.wheelZ],
  ];
  const corner = wheelIds.map((id) => (id ? ITEMS[id].radius ?? 0.4 : 0.12));
  const wheels = wheelIds
    .map((id, i) => (id ? { id, x: pos[i][0], z: pos[i][1], r: ITEMS[id].radius ?? 0.4 } : null))
    .filter(Boolean) as CarLayout['wheels'];

  const left = (corner[0] + corner[2]) / 2;
  const right = (corner[1] + corner[3]) / 2;
  const front = (corner[0] + corner[1]) / 2;
  const rear = (corner[2] + corner[3]) / 2;

  const roll = Math.atan2(right - left, actualDef.wheelX * 2);
  const pitch = Math.atan2(rear - front, actualDef.wheelZ * 2);
  const baseY = Math.max(0.35, (left + right) / 2 + actualDef.clearance);

  return { bodyId, hasBody, onFoot: false, wheelCount: count, wheels, baseY, roll, pitch, def: actualDef };
}

/** 땀방울 파티클 (무거운 차를 들고 달릴 때 튐) */
function SweatDrops({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!group.current) return;
    const t = st.clock.elapsedTime * 6;
    group.current.children.forEach((c, i) => {
      const drop = c as THREE.Mesh;
      if (!active) {
        drop.visible = false;
        return;
      }
      const cyc = (t + i * 1.7) % 2;
      drop.visible = cyc < 1.2;
      drop.position.y = 1.3 - cyc * 0.7;
      drop.position.x = (i % 2 === 0 ? 0.35 : -0.35) + Math.sin(cyc * 4) * 0.08;
      drop.scale.setScalar(Math.sin(cyc * Math.PI) * 1.2);
    });
  });
  return (
    <group ref={group}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} visible={false}>
          <coneGeometry args={[0.045, 0.12, 6]} />
          <meshBasicMaterial color="#5ec8ff" />
        </mesh>
      ))}
    </group>
  );
}

/** 바퀴가 없을 때 캐릭터가 머리 위로 번쩍 들고 뛰는 '고철 뭉치 덩어리' — 실제로 장착된 부품만 보여준다 */
function ScrapBundleVisual({
  build,
  items,
}: {
  build: CarBuild;
  items: Record<number, string>;
}) {
  const bodyId = build.slots.body !== undefined ? items[build.slots.body] : null;
  const engine = build.slots.engine !== undefined ? items[build.slots.engine] : null;
  const booster = build.slots.booster !== undefined ? items[build.slots.booster] : null;
  const fb = build.slots.frontBumper !== undefined ? items[build.slots.frontBumper] : null;
  const rb = build.slots.rearBumper !== undefined ? items[build.slots.rearBumper] : null;
  const spoiler = build.slots.spoiler !== undefined ? items[build.slots.spoiler] : null;
  const exhaust = build.slots.exhaust !== undefined ? items[build.slots.exhaust] : null;
  const antenna = build.slots.antenna !== undefined ? items[build.slots.antenna] : null;
  const deco = build.slots.deco !== undefined ? items[build.slots.deco] : null;
  const brush = build.slots.brush !== undefined ? items[build.slots.brush] : null;
  const gun = build.slots.gun !== undefined ? items[build.slots.gun] : null;
  const anyPart = Boolean(bodyId || engine || booster || fb || rb || spoiler || exhaust || antenna || deco || brush || gun);

  return (
    <group scale={0.78}>
      {/* Missing body parts stay absent; no substitute model is created. */}
      {bodyId && <Body itemId={bodyId} />}

      {/* 실제로 장착된 부품만 테이프와 끈으로 얼기설기 묶인 모습으로 등장 */}
      {engine && (
        <group position={[0.2, 0.45, -0.2]} rotation={[0.2, 0.4, 0.1]}>
          <Part itemId={engine} />
        </group>
      )}
      {booster && (
        <group position={[-0.25, 0.4, 0.2]} rotation={[-0.3, -0.2, 0.4]}>
          <Part itemId={booster} />
        </group>
      )}
      {fb && (
        <group position={[0, 0.1, 0.7]} rotation={[0.1, 0.1, -0.1]}>
          <Part itemId={fb} />
        </group>
      )}
      {rb && (
        <group position={[0, 0.2, -0.8]} rotation={[-0.2, Math.PI, 0.2]}>
          <Part itemId={rb} />
        </group>
      )}
      {spoiler && (
        <group position={[0.1, 0.7, -0.3]} rotation={[0.15, -0.1, 0.3]}>
          <Part itemId={spoiler} />
        </group>
      )}
      {exhaust && (
        <group position={[-0.3, 0.25, -0.6]} rotation={[0.3, 0.2, 0]}>
          <Part itemId={exhaust} />
        </group>
      )}
      {antenna && (
        <group position={[0.25, 0.8, 0.1]} rotation={[-0.1, 0.3, -0.2]}>
          <Part itemId={antenna} />
        </group>
      )}
      {deco && (
        <group position={[0, 0.3, 0.5]} rotation={[0, 0, 0.2]}>
          <Part itemId={deco} />
        </group>
      )}
      {brush && (
        <group position={[-0.45, 0.55, -0.1]} rotation={[0.3, 0.2, -0.9]}>
          <Part itemId={brush} />
        </group>
      )}
      {gun && (
        <group position={[0.35, 0.75, 0.35]} rotation={[0, 0, 0.15]}>
          <Part itemId={gun} />
        </group>
      )}

      {/* 칭칭 동여맨 노란/은색 테이프들 — 부품이 하나라도 있을 때만 */}
      {anyPart && (
        <>
          <Tape position={[0, 0.45, 0]} rotation={[0, 0.8, 0]} size={[1.4, 0.04, 0.28]} color="#f2e2b0" />
          <Tape position={[0, 0.3, 0.3]} rotation={[0.5, -0.6, 0.3]} size={[1.2, 0.04, 0.22]} color="#cfd8dc" />
          <Tape position={[-0.1, 0.5, -0.2]} rotation={[-0.4, 0.7, -0.2]} size={[1.3, 0.04, 0.25]} color="#ffb74d" />
          <Tape position={[0.2, 0.25, 0]} rotation={[0.9, 0, 0.4]} size={[0.9, 0.03, 0.2]} color="#f2e2b0" />
        </>
      )}

      {/* 묶음 로프 링 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.35, 0]} visible={anyPart}>
        <torusGeometry args={[0.7, 0.045, 8, 24]} />
        <Mat color="#8d6e4a" kind="matte" />
      </mesh>
    </group>
  );
}

export function Car({ build, items, characterId, stateRef, preview, jersey, noDriver }: CarProps) {
  const root = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const charGroup = useRef<THREE.Group>(null);
  const scrapBundleGroup = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Mesh>(null);
  const spin = useRef(0);
  const motion = useRef<Motion>(newMotion());
  const frontWheels = useRef<(THREE.Group | null)[]>([]);
  const tRef = useRef(0);

  const layout = useMemo(() => computeLayout(build, items), [build, items]);

  const id = (slot: keyof CarBuild['slots']) => {
    const uid = build.slots[slot];
    return uid !== undefined ? items[uid] : undefined;
  };
  const engine = id('engine');
  const booster = id('booster');
  const fb = id('frontBumper');
  const rb = id('rearBumper');
  const spoiler = id('spoiler');
  const exhaust = id('exhaust');
  const antenna = id('antenna');
  const deco = id('deco');
  const brush = id('brush');
  const gun = id('gun');
  const brushTilt = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    tRef.current += dt;
    const st = stateRef?.current;
    const m = motion.current;

    if (st && root.current) {
      root.current.position.set(st.x, st.y, st.z);
      root.current.rotation.y = st.heading + st.spinAngle;
      m.stun = st.stun;

      if (shieldRef.current) {
        shieldRef.current.visible = st.shield > 0;
        shieldRef.current.scale.setScalar(1 + Math.sin(tRef.current * 8) * 0.04);
      }

      m.speed = st.speed * (st.boostTime > 0 ? 1.7 : 1);
      m.accel = st.accelVis;
      m.steer = st.steer;
      m.airborne = st.airborne;
      m.hit = st.hit;
      m.bounce = st.bounce;

      if (layout.onFoot) {
        // 바퀴 0개: 무거운 고철차를 번쩍 들고 낑낑대며 달림!
        m.mode = Object.values(build.slots).length ? 'carry' : Math.abs(st.speed) > 0.3 ? 'run' : 'idle';
        if (scrapBundleGroup.current) {
          // 머리 위에서 고철차가 덜컹거림
          const f = Math.min(1, Math.abs(st.speed) / 9);
          const bounce = Math.abs(Math.sin(tRef.current * (10 + f * 12))) * 0.12 * (0.4 + 0.6 * f);
          scrapBundleGroup.current.position.y = 1.35 + bounce;
          scrapBundleGroup.current.position.z = 0.05 + Math.sin(tRef.current * 8) * 0.03;
          scrapBundleGroup.current.rotation.z = -st.steer * 0.2 + Math.sin(tRef.current * 14) * 0.06 * (0.3 + f);
          scrapBundleGroup.current.rotation.x = 0.15 + bounce * 0.4;
        }
      } else {
        m.mode = 'drive';
      }

      spin.current = st.wheelSpin;

      if (bodyGroup.current) {
        bodyGroup.current.rotation.z = layout.roll + st.roll;
        bodyGroup.current.rotation.x = layout.pitch + st.pitch;
        bodyGroup.current.position.y =
          layout.baseY +
          st.bounce * 0.12 +
          Math.sin(tRef.current * 25) * 0.008 * Math.min(1, Math.abs(st.speed) / 10);
      }

      frontWheels.current.forEach((w) => {
        if (w) w.rotation.y = st.steer * -0.45;
      });

      if (flame.current) {
        // 차량이 없을 때(onFoot)는 뒤에 불꽃 부스터 효과 없음
        const s =
          !layout.onFoot && (st.boostTime > 0 || st.itemBoost > 0)
            ? 1 + Math.sin(tRef.current * 50) * 0.2
            : 0.001;
        flame.current.scale.set(s, s, s * 1.5);
      }

      // 뒤에 단 붓이 바닥에 끌리며 속도에 따라 뒤로 눕고 좌우로 흔들림
      if (brushTilt.current) {
        const f = Math.min(1, Math.abs(st.speed) / 18);
        brushTilt.current.rotation.x = 0.35 + f * 0.45;
        brushTilt.current.rotation.z = -st.steer * 0.25 + Math.sin(tRef.current * 9) * 0.04 * f;
      }

      if (layout.onFoot && charGroup.current) {
        charGroup.current.rotation.z = -st.steer * 0.12;
      }
    } else if (preview) {
      // 미리보기 회전 및 모션
      if (layout.onFoot) {
        m.mode = Object.values(build.slots).length ? 'carry' : 'idle';
        if (scrapBundleGroup.current) {
          const bounce = Math.sin(tRef.current * 3) * 0.04;
          scrapBundleGroup.current.position.y = 1.32 + bounce;
          scrapBundleGroup.current.rotation.z = Math.sin(tRef.current * 2) * 0.05;
        }
      } else {
        m.mode = 'drive';
      }
      m.speed = 0;
      m.steer = Math.sin(tRef.current * 1.3) * 0.25;
      spin.current += dt * 1.5;

      if (bodyGroup.current) {
        bodyGroup.current.rotation.z = layout.roll + Math.sin(tRef.current * 2.1) * 0.015;
        bodyGroup.current.rotation.x = layout.pitch;
        bodyGroup.current.position.y = layout.baseY + Math.sin(tRef.current * 3) * 0.01;
      }
      if (flame.current) flame.current.scale.setScalar(0.001);
    }
  });

  const shield = (
    <mesh ref={shieldRef} position={[0, 1.1, 0]} visible={false}>
      <sphereGeometry args={[2.2, 24, 16]} />
      <meshStandardMaterial
        color="#9be7ff"
        transparent
        opacity={0.28}
        roughness={0.05}
        emissive="#2a8aa0"
        emissiveIntensity={0.5}
        depthWrite={false}
      />
    </mesh>
  );

  // ══════════════════════════════════════════════════════════════════
  // 바퀴 0개: 차가 없어도 부품들이 고철 뭉치로 뭉쳐서 캐릭터가 들고 뜀!
  // ══════════════════════════════════════════════════════════════════
  if (layout.onFoot) {
    if (noDriver) {
      return <group ref={root}><ScrapBundleVisual build={build} items={items} /></group>;
    }
    const isMoving = Boolean(stateRef?.current && Math.abs(stateRef.current.speed) > 0.4);
    return (
      <group ref={root}>
        {shield}
        <group ref={charGroup} position={[0, 0, 0]}>
          <Character characterId={characterId} motion={motion} scale={0.78} jersey={jersey} />
          {/* 머리 위로 번쩍 든 고철 뭉치 덩어리 */}
          <group ref={scrapBundleGroup} position={[0, 1.35, 0]}>
            <ScrapBundleVisual build={build} items={items} />
          </group>
          {/* 낑낑대며 달릴 때 튀는 땀방울 */}
          <SweatDrops active={isMoving || Boolean(preview)} />
        </group>
      </group>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // 바퀴 1~4개: 차체 조립된 정상/불안정 차량
  // ══════════════════════════════════════════════════════════════════
  const d = layout.def!;
  const bodyId = layout.bodyId;
  const inside = bodyId === 'tub' || bodyId === 'matchbox';

  return (
    <group ref={root}>
      {shield}
      {/* 바퀴 렌더링 (확보된 바퀴만 제자리에 장착) */}
      {layout.wheels.map((w, i) => (
        <group
          key={i}
          position={[w.x, w.r, w.z]}
          ref={(el) => {
            if (w.z > 0) frontWheels.current[i] = el;
          }}
        >
          <Wheel itemId={w.id} spinRef={spin} side={w.x < 0 ? 1 : -1} />
          {/* 바퀴 차축 스터브 */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[w.x < 0 ? 0.25 : -0.25, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
            <Mat color="#7d858c" kind="metal" />
          </mesh>
        </group>
      ))}

      {/* 차체 및 차체에 부착된 부품들 */}
      <group ref={bodyGroup} position={[0, layout.baseY, 0]}>
        {/* 차축 빔 (바퀴가 적어도 빔과 고철 베이스는 보임) */}
        {[d.wheelZ, -d.wheelZ].map((z) => (
          <mesh key={z} position={[0, -0.02, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, d.wheelX * 2 + 0.3, 10]} />
            <Mat color="#6d757c" kind="metal" />
          </mesh>
        ))}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.35, 0.08, d.wheelZ * 2]} />
          <Mat color="#8d6e4a" kind="matte" />
        </mesh>

        {layout.hasBody && bodyId && <Body itemId={bodyId} />}

        {/* 운전석 캐릭터 + 핸들 */}
        <group position={d.seat} rotation={[0, 0, 0]}>
          {!noDriver && (
            <group ref={charGroup}>
              <Character characterId={characterId} motion={motion} scale={0.68} jersey={jersey} />
            </group>
          )}
          <group position={[0, 0.62, 0.42]} rotation={[-0.5, 0, 0]}>
            <mesh>
              <torusGeometry args={[0.2, 0.035, 8, 20]} />
              <Mat color="#2b2b30" kind="rubber" />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.25]}>
              <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
              <Mat color="#8d99ae" kind="metal" />
            </mesh>
          </group>
        </group>

        {engine && (
          <group
            position={inside ? [0.1, 0.35, -d.l * 0.3] : [0.08, d.h + 0.3, -d.l * 0.28]}
            rotation={[0, 0.05, 0.08]}
          >
            <Part itemId={engine} spin={spin} />
            <Tape position={[0, 0.25, 0]} rotation={[0, 0.3, 0]} size={[0.8, 0.02, 0.16]} />
          </group>
        )}
        {booster &&
          (booster === 'balloon' ? (
            <group position={[-0.3, d.h + 0.1, -d.l * 0.35]} rotation={[0.1, 0, 0.1]}>
              <Part itemId={booster} />
            </group>
          ) : (
            <group
              position={[0, d.h * 0.55 + 0.1, -d.l / 2 - 0.4]}
              rotation={[booster === 'spray' ? -Math.PI / 2 : 0, 0, 0.06]}
            >
              <Part itemId={booster} spin={spin} />
            </group>
          ))}
        {/* 부스트 불꽃 */}
        <mesh
          ref={flame}
          position={[0, d.h * 0.55 + 0.1, -d.l / 2 - 1.0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={0.001}
        >
          <coneGeometry args={[0.35, 1.4, 12]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.9} />
        </mesh>

        {fb && (
          <group position={[0.06, 0.28, d.l / 2 + 0.22]} rotation={[0.05, 0.04, 0.07]}>
            <Part itemId={fb} />
            <Tape position={[-0.4, 0.05, -0.1]} rotation={[0, 0, 0.4]} />
            <Tape position={[0.45, 0.02, -0.1]} rotation={[0, 0, -0.3]} />
          </group>
        )}
        {rb && (
          <group position={[-0.05, 0.3, -d.l / 2 - 0.2]} rotation={[-0.05, Math.PI, -0.06]}>
            <Part itemId={rb} />
            <Tape position={[0.3, 0.05, -0.1]} rotation={[0, 0, 0.5]} />
          </group>
        )}
        {spoiler && (
          <group position={[0.05, d.h - 0.02, -d.l * 0.4]} rotation={[0, -0.04, -0.07]}>
            <Part itemId={spoiler} />
          </group>
        )}
        {exhaust && (
          <group position={[d.w * 0.33, 0.4, -d.l / 2 - 0.3]} rotation={[0.1, 0, 0]}>
            <Part itemId={exhaust} />
          </group>
        )}
        {antenna && (
          <group position={[-d.w * 0.38, d.h - 0.05, -d.l * 0.15]} rotation={[0.05, 0, -0.15]}>
            <Part itemId={antenna} />
          </group>
        )}
        {deco === 'sticker' && (
          <group position={[d.w / 2 + 0.03, d.h * 0.5, 0.3]} rotation={[0, Math.PI / 2, -0.15]}>
            <Part itemId={deco} />
          </group>
        )}
        {deco === 'rubberband' && (
          <group position={[0, d.h / 2, 0.35]} scale={[d.w / 2 + 0.08, d.h / 2 + 0.14, 1]}>
            <Part itemId={deco} />
          </group>
        )}
        {deco === 'bell' && (
          <group position={[d.w * 0.3, d.h + 0.2, d.l / 2 - 0.25]}>
            <Part itemId={deco} />
          </group>
        )}
        {/* ─── 총: 보닛 위 오른쪽에 테이프로 고정, 총구는 앞을 향한다 ─── */}
        {gun && (
          <group position={[d.w * 0.28, d.h + 0.12, d.l * 0.18]} scale={0.85}>
            <mesh position={[0, -0.08, 0]}>
              <boxGeometry args={[0.3, 0.06, 0.5]} />
              <Mat color="#6d757c" kind="metal" />
            </mesh>
            <Part itemId={gun} />
            <Tape position={[0, 0.0, -0.1]} rotation={[0, 0, 0]} size={[0.38, 0.03, 0.14]} color="#cfd8dc" />
          </group>
        )}
        {/* 고철 테이프 데코 */}
        <Tape position={[d.w * 0.3, d.h * 0.98, d.l * 0.1]} rotation={[0, 0.9, 0]} size={[0.7, 0.02, 0.15]} color="#f2e2b0" />
        <Tape position={[-d.w * 0.25, d.h * 0.5, d.l / 2 - 0.05]} rotation={[0.9, 0, 0.3]} size={[0.5, 0.02, 0.14]} color="#dcdcdc" />

        {/* ─── 뒤에 단 붓: 차체 뒤쪽에서 바닥을 향해 비스듬히 끌림 ─── */}
        {brush && (
          <group position={[0, d.h * 0.45, -d.l / 2 - 0.15]}>
            {/* 붓을 고정하는 철사 브래킷 */}
            <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.3, 8]} />
              <Mat color="#7d858c" kind="metal" />
            </mesh>
            <Tape position={[0, 0.05, 0.02]} rotation={[0, 0, 0.4]} size={[0.3, 0.02, 0.12]} color="#cfd8dc" />
            {/* 피벗: 손잡이 위, 붓끝이 아래·뒤로 */}
            <group ref={brushTilt} rotation={[0.5, 0, 0]}>
              <group position={[0, -(layout.baseY + d.h * 0.45) * 0.55, -0.1]} scale={1.1}>
                <Part itemId={brush} />
              </group>
            </group>
          </group>
        )}
      </group>
    </group>
  );
}
