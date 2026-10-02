import type { CarBuild } from '../store';

/** 다른 기기 참가자의 실시간 차량 상태 */
export interface NetCarState {
  x: number; y: number; z: number; heading: number; speed: number; steer: number;
  shield: number; firing: boolean; phase: string;
  build?: CarBuild; items?: Record<number, string>;
  t: number;
}

export const net = {
  remote: new Map<string, NetCarState>(),
  running: false,
};

let timer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;

/** 120ms 간격으로 내 상태를 올리고 다른 참가자 상태를 받아온다 */
export function startNetSync(code: string, playerId: string, getLocal: () => Omit<NetCarState, 't'> | null) {
  stopNetSync();
  const gen = ++generation;
  net.running = true;
  let buildSentAt = 0;
  const tick = async () => {
    if (gen !== generation) return;
    const local = getLocal();
    try {
      const now = Date.now();
      const body: Record<string, unknown> = { playerId };
      if (local) {
        // 차량 구성은 1초마다만 함께 보낸다 (변경 반영용)
        const { build, items, ...rest } = local;
        body.state = now - buildSentAt > 1000 ? { ...rest, build, items } : rest;
        if (now - buildSentAt > 1000) buildSentAt = now;
      }
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok && gen === generation) {
        const data = (await res.json()) as { states: Record<string, NetCarState>; now: number };
        Object.entries(data.states).forEach(([id, st]) => {
          if (id === playerId) return;
          const prev = net.remote.get(id);
          // 서버 시계 기준 경과 시간을 내 시계로 환산 (기기 간 시계 차이 보정)
          const t = Date.now() - Math.max(0, data.now - st.t);
          net.remote.set(id, { ...prev, ...st, t, build: st.build ?? prev?.build, items: st.items ?? prev?.items });
        });
      }
    } catch {
      /* 네트워크 오류는 다음 틱에 재시도 */
    }
    if (gen === generation) timer = setTimeout(tick, 120);
  };
  void tick();
}

export function stopNetSync() {
  generation++;
  net.running = false;
  if (timer) clearTimeout(timer);
  timer = null;
  net.remote.clear();
}

/** 네트워크 상태가 신선한지 (2초 이내 업데이트) */
export function freshRemote(id: string): NetCarState | null {
  const st = net.remote.get(id);
  if (!st || Date.now() - st.t > 2000 || st.phase !== 'battle') return null;
  return st;
}
