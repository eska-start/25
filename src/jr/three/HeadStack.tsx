import { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ItemMesh } from './Parts';
import { localBounds } from './materials';
import type { PartDef } from '../game/scramble';

export interface StackEntry {
  uid: number;
  itemId: string;
  h: number;
  scale: number;
  seed: number;
  y: number; // 바닥 기준 높이 (아래부터 누적)
  ox: number; // 미세한 좌우 어긋남
  oz: number;
  rot: number;
  support: number;
}

/** 러너의 머리 위 적재 상태 — 월드가 매 프레임 갱신 */
export interface StackState {
  entries: StackEntry[];
  height: number;
  sway: number; // 좌우 흔들림 (-1..1)
  pitchS: number; // 앞뒤 흔들림
  outro: number; // 0..1 종료 연출 진행도
}

export const newStackState = (): StackState => ({ entries: [], height: 0, sway: 0, pitchS: 0, outro: 0 });

/** 큰 부품이 아래로 가도록 끼워 넣기 → 아래가 큰 부품을 받쳐주는 모양 */
export function insertEntry(st: StackState, uid: number, p: PartDef, r: () => number = Math.random): StackEntry[] {
  const e: StackEntry = {
    uid,
    itemId: p.itemId,
    h: p.h,
    scale: p.scale,
    seed: r() * 100,
    y: 0,
    ox: (r() - 0.5) * 0.13,
    oz: (r() - 0.5) * 0.13,
    rot: r() * Math.PI * 2,
    support: p.tier === 'large' ? 2 : p.tier === 'mid' ? 1 : 0.5,
  };
  const arr = st.entries;
  let idx = arr.length;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].support < e.support) {
      idx = i;
      break;
    }
  }
  arr.splice(idx, 0, e);
  relayout(st);
  return arr;
}

export function relayout(st: StackState) {
  let y = 0;
  st.entries.forEach((e) => {
    e.y = y + e.h * 0.5;
    y += e.h;
  });
  st.height = y;
}

function StackPart({ entry, stack }: { entry: StackEntry; stack: StackState }) {
  const ref = useRef<THREE.Group>(null);
  const lay = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!ref.current || !lay.current) return;
    // 세워서 쌓지 않고 눕혀서 쌓는다: 모델의 가장 긴 축이 세로(y)라면 옆으로 눕힌다.
    lay.current.rotation.set(0, 0, 0);
    ref.current.position.set(0, 0, 0);
    const raw = localBounds(lay.current).getSize(new THREE.Vector3());
    if (raw.y > Math.min(raw.x, raw.z) * 0.9) {
      // x가 더 얇으면 z축 기준으로, 아니면 x축 기준으로 굴려서 가장 얇은 면이 위아래를 향하게 한다
      if (raw.x <= raw.z) lay.current.rotation.z = Math.PI / 2;
      else lay.current.rotation.x = Math.PI / 2;
    }
    lay.current.updateMatrix();
    const box = localBounds(ref.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    ref.current.position.set(-center.x, -center.y, -center.z);
    // Use the actual model bounds, so a can never intersects a thinner cap below it.
    entry.h = Math.max(0.12, size.y * entry.scale);
    entry.support = Math.max(size.x, size.z) * entry.scale;
    stack.entries.sort((a, b) => b.support - a.support || a.uid - b.uid);
    relayout(stack);
  }, [entry, stack]);
  return <group ref={ref}><group ref={lay}><ItemMesh itemId={entry.itemId} /></group></group>;
}

/** 머리 위 고물 더미. 뛰면 흔들리고, 위로 갈수록 크게 흔들린다. */
export function HeadStack({
  st,
  baseY = 1.5,
  maxSlots = 14,
}: {
  st: StackState;
  baseY?: number;
  maxSlots?: number;
}) {
  const pivots = useRef<Map<number, THREE.Group>>(new Map());
  const tRef = useRef(0);
  const prevSway = useRef(0);

  useFrame((_state, dt) => {
    tRef.current += dt;
    const t = tRef.current;
    const jerk = Math.abs(st.sway - prevSway.current) / Math.max(dt, 0.001);
    prevSway.current = st.sway;
    const o = st.outro;
    const ease = 1 - Math.pow(1 - Math.min(1, o), 2.2);

    st.entries.slice(0, maxSlots).forEach((e, i) => {
      const g = pivots.current.get(e.uid);
      if (!g) return;
      const k = 0.08 + i * 0.018;
      const wobble = Math.sin(t * (7 + i * 0.6) + e.seed) * 0.035;
      g.rotation.z = st.sway * k + wobble;
      g.rotation.x = st.pitchS * k + Math.cos(t * (5.4 + i * 0.5) + e.seed) * 0.022;
      // 급회전 시 위쪽 부품이 크게 흔들림
      g.rotation.z += Math.min(0.055, jerk * 0.0015) * (1 + i * 0.03) * Math.sign(st.sway || 1);
      const maxTilt = 0.12 + i * 0.007;
      g.rotation.z = Math.max(-maxTilt, Math.min(maxTilt, g.rotation.z));
      g.rotation.x = Math.max(-maxTilt, Math.min(maxTilt, g.rotation.x));

      if (o > 0) {
        const rise = ease * (0.8 + i * 0.42);
        g.position.set(e.ox, baseY + e.y + rise, e.oz);
        const s = o > 0.5 ? Math.max(0.001, 1 - (o - 0.5) / 0.42) : 1;
        g.scale.setScalar(e.scale * s);
        g.rotation.y = e.rot + ease * 7;
      } else {
        g.scale.setScalar(e.scale);
        g.position.set(e.ox, baseY + e.y, e.oz);
        g.rotation.y = e.rot + Math.sin(t * 0.8 + e.seed) * 0.12;
      }
    });
  });

  const shown = st.entries.slice(0, maxSlots);

  return (
    <group>
      {shown.map((e) => (
        <group
          key={e.uid}
          ref={(el) => {
            if (el) pivots.current.set(e.uid, el);
            else pivots.current.delete(e.uid);
          }}
        >
          <StackPart entry={e} stack={st} />
        </group>
      ))}
    </group>
  );
}
