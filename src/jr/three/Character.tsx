import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CHARACTERS } from '../data/items';
import { buildCharacter } from './iceCharacter';

export interface Motion {
  speed: number;
  accel: number;
  steer: number;
  airborne: boolean;
  hit: number;
  bounce: number;
  stun: number;
  mode: 'idle' | 'run' | 'drive' | 'cheer' | 'carry';
}

export const newMotion = (): Motion => ({ speed: 0, accel: 0, steer: 0, airborne: false, hit: 0, bounce: 0, stun: 0, mode: 'idle' });

export const JERSEYS = ['#ef5a4f', '#4a8ff0', '#43b96b', '#ff9a3c'];
function darker(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 255) * 0.74);
  const g = Math.floor(((n >> 8) & 255) * 0.74);
  const b = Math.floor((n & 255) * 0.74);
  return (r << 16) | (g << 8) | b;
}

interface Props {
  characterId: string;
  motion?: React.MutableRefObject<Motion>;
  scale?: number;
  jersey?: string;
}

export function Character({ characterId, motion, scale = 1, jersey = JERSEYS[0] }: Props) {
  const ch = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const model = useMemo(() => buildCharacter(ch.species, parseInt(jersey.slice(1), 16), darker(jersey)), [ch.species, jersey]);
  const t = useRef(Math.random() * 10);
  const blink = useRef(2 + Math.random() * 3);

  useFrame((_, dt) => {
    const m = motion?.current ?? newMotion();
    t.current += dt;
    const T = t.current;
    const { body: b, head: h, armL: al, armR: ar, legL: ll, legR: lr, stars, eyes } = model;
    const L = (a: number, c: number, k: number) => a + (c - a) * Math.min(1, k);

    // blink like the original
    blink.current -= dt;
    const closing = blink.current < 0.12;
    eyes.forEach((e) => (e.scale.y = closing ? 0.15 : 1.15));
    if (blink.current < 0) blink.current = 2.5 + Math.random() * 3;

    if (m.mode === 'carry') {
      // 캐릭터가 고철 덩어리 차량을 양손으로 번쩍 들고 낑낑대며 달림!
      const f = Math.min(1, Math.abs(m.speed) / 9);
      const cyc = T * (10 + f * 12);
      const sw = Math.sin(cyc) * 1.1 * f;
      // 다리 힘차게 뜀 (정지 시엔 멈춤)
      ll.rotation.x = sw;
      lr.rotation.x = -sw;
      // 양팔은 고철차를 받치기 위해 위로 번쩍 치켜듦
      al.rotation.x = L(al.rotation.x, -2.85 + Math.sin(cyc) * 0.1 * f, dt * 10);
      ar.rotation.x = L(ar.rotation.x, -2.85 - Math.sin(cyc) * 0.1 * f, dt * 10);
      al.rotation.z = L(al.rotation.z, 0.45, dt * 8);
      ar.rotation.z = L(ar.rotation.z, -0.45, dt * 8);
      // 무거워서 몸을 약간 앞으로 숙이고 덜컹거림 (정지 시엔 가만히 듦)
      b.position.y = Math.abs(Math.sin(cyc)) * 0.12 * f + Math.sin(T * 2.2) * 0.012;
      b.rotation.x = L(b.rotation.x, 0.28 * (0.4 + 0.6 * f), dt * 8);
      b.rotation.z = L(b.rotation.z, -m.steer * 0.2 + Math.sin(cyc * 0.5) * 0.08, dt * 6);
      h.rotation.x = L(h.rotation.x, -0.15, dt * 6);
      h.rotation.z = L(h.rotation.z, -m.steer * 0.25, dt * 6);
    } else if (m.mode === 'run') {
      const f = Math.min(1, Math.abs(m.speed) / 10);
      const cyc = T * (8 + f * 10);
      const sw = Math.sin(cyc) * 1.0 * f;
      ll.rotation.x = sw;
      lr.rotation.x = -sw;
      al.rotation.x = -sw * 0.9;
      ar.rotation.x = sw * 0.9;
      al.rotation.z = 0.25;
      ar.rotation.z = -0.25;
      b.position.y = Math.abs(Math.sin(cyc)) * 0.08 * f;
      b.rotation.x = L(b.rotation.x, 0.2 * f, dt * 8);
      b.rotation.z = L(b.rotation.z, -m.steer * 0.15, dt * 6);
      h.rotation.x = -0.08 * f;
      h.rotation.z = L(h.rotation.z, -m.steer * 0.2, dt * 6);
    } else if (m.mode === 'drive') {
      const f = Math.min(1, Math.abs(m.speed) / 15);
      const up = m.airborne;
      al.rotation.x = L(al.rotation.x, up ? -2.7 : -1.3 + m.steer * 0.25, dt * 8);
      ar.rotation.x = L(ar.rotation.x, up ? -2.7 : -1.3 - m.steer * 0.25, dt * 8);
      al.rotation.z = L(al.rotation.z, up ? 0.5 : 0.12 - m.steer * 0.2, dt * 8);
      ar.rotation.z = L(ar.rotation.z, up ? -0.5 : -0.12 - m.steer * 0.2, dt * 8);
      ll.rotation.x = -1.4;
      lr.rotation.x = -1.4;
      const shake = m.hit > 0 ? Math.sin(T * 40) * m.hit * 0.3 : 0;
      b.rotation.x = L(b.rotation.x, -m.accel * 0.02 - 0.08 + shake * 0.5, dt * 5);
      b.rotation.z = L(b.rotation.z, m.steer * 0.28 * (0.4 + f) + shake, dt * 5);
      b.position.y = L(b.position.y, (up ? 0.12 : 0) + Math.sin(T * 22) * 0.012 * f + m.bounce * 0.15, dt * 8);
      h.rotation.x = L(h.rotation.x, -m.accel * 0.012 + (up ? -0.25 : 0), dt * 5);
      h.rotation.z = L(h.rotation.z, m.steer * 0.2 + shake, dt * 5);
      h.rotation.y = L(h.rotation.y, -m.steer * 0.3, dt * 4);
    } else if (m.mode === 'cheer') {
      const j = Math.abs(Math.sin(T * 6));
      b.position.y = j * 0.25;
      al.rotation.x = -2.8 + Math.sin(T * 12) * 0.2;
      ar.rotation.x = -2.8 - Math.sin(T * 12) * 0.2;
      al.rotation.z = 0.4;
      ar.rotation.z = -0.4;
      ll.rotation.x = L(ll.rotation.x, 0, dt * 4);
      lr.rotation.x = L(lr.rotation.x, 0, dt * 4);
      h.rotation.z = Math.sin(T * 6) * 0.15;
    } else {
      b.position.y = Math.sin(T * 2) * 0.015;
      b.rotation.x = L(b.rotation.x, 0, dt * 4);
      b.rotation.z = L(b.rotation.z, 0, dt * 4);
      h.rotation.x = Math.sin(T * 2 + 1) * 0.04;
      h.rotation.z = L(h.rotation.z, Math.sin(T * 0.7) * 0.06, dt * 4);
      h.rotation.y = L(h.rotation.y, Math.sin(T * 0.5) * 0.15, dt * 4);
      al.rotation.x = L(al.rotation.x, Math.sin(T * 2) * 0.1, dt * 4);
      ar.rotation.x = L(ar.rotation.x, -Math.sin(T * 2) * 0.1, dt * 4);
      al.rotation.z = L(al.rotation.z, 0.25, dt * 4);
      ar.rotation.z = L(ar.rotation.z, -0.25, dt * 4);
      ll.rotation.x = L(ll.rotation.x, 0, dt * 4);
      lr.rotation.x = L(lr.rotation.x, 0, dt * 4);
    }
    // stun stars (spin-outs, big hits)
    stars.visible = m.stun > 0;
    if (stars.visible) stars.rotation.y += dt * 6;
  });

  return <primitive object={model.root} scale={scale} dispose={null} />;
}
