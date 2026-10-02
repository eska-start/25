import { ITEMS } from '../data/items';

export type PartTier = 'small' | 'mid' | 'large';

export interface PartDef {
  itemId: string; // 기존 ITEMS id — 시각적으로도 조립에도 그대로 사용
  tier: PartTier;
  h: number; // 머리 위 적재 높이 기여도
  scale: number; // 쌓일 때 시각 스케일
  label: string;
}

/** 부품 크기 → 적재 높이/스케일. 실제 크기에 비례해 머리 위에 쌓인다. */
const H = { small: 0.155, mid: 0.3, large: 0.46 };
const S = { small: 0.5, mid: 0.72, large: 0.78 };

const def = (itemId: string, tier: PartTier, label: string): PartDef => ({
  itemId,
  tier,
  h: H[tier],
  scale: S[tier],
  label: ITEMS[itemId]?.name ?? label,
});

export const PARTS: PartDef[] = [
  // ─── 작은 부품: 쉽게 여러 개, 작게 쌓임 ───
  def('wire', 'small', '나사'),
  def('gear', 'small', '기어'),
  def('cap', 'small', '병뚜껑'),
  def('button', 'small', '단추'),
  def('sticker', 'small', '장식 스티커'),
  def('bell', 'small', '방울'),
  def('toothpick', 'small', '깃대'),
  def('rubberband', 'small', '고무줄'),

  // ─── 중간 부품: 핵심 부품 ───
  def('can', 'mid', '캔'),
  def('straw', 'mid', '파이프'),
  def('pencap', 'mid', '볼펜'),
  def('spray', 'mid', '램프'),
  def('clothespin', 'mid', '범퍼'),
  def('chopstick', 'mid', '젓가락'),
  def('eraser', 'mid', '지우개'),
  def('plastic', 'mid', '플라스틱'),
  def('popsicle', 'mid', '스포일러'),
  def('card', 'mid', '카드'),
  def('leaf', 'mid', '나뭇잎'),
  def('motor', 'mid', '모터'),
  def('battery', 'mid', '배터리'),
  def('windup', 'mid', '태엽'),
  def('propeller', 'mid', '프로펠러'),
  def('balloon', 'mid', '풍선'),
  def('toywheel', 'mid', '작은 바퀴'),

  // ─── 큰 부품: 희귀, 크게 쌓임 ───
  def('rubber', 'large', '큰 바퀴'),
  def('tub', 'large', '대형 통'),
  def('brick', 'large', '장식 블록'),
  def('matchbox', 'large', '박스 차체'),
  def('soap', 'large', '비누 차체'),

  // ─── 붓: 차량 뒤에 달아 페인트 범위를 결정 (등급↑ = 범위↑) ───
  def('ballpen', 'small', '볼펜'),
  def('crayon', 'small', '크레파스'),
  def('chalk', 'small', '분필'),
  def('highlighter', 'small', '형광펜'),
  def('thinbrush', 'mid', '얇은 붓'),
  def('marker', 'mid', '매직펜'),
  def('spongebrush', 'mid', '스펀지 붓'),
  def('widebrush', 'mid', '넓은 붓'),
  def('roller', 'large', '페인트 롤러'),
  def('mop', 'large', '대걸레'),
  def('paintbucket', 'large', '물감 통'),
  def('spraycan', 'large', '스프레이 캔'),

  // ─── 추가 바퀴 ───
  def('coin', 'small', '동전'),
  def('spool', 'small', '실패'),
  def('jarlid', 'mid', '잼 뚜껑'),
  def('oring', 'mid', '고무 오링'),
  def('inline', 'large', '인라인 휠'),

  // ─── 추가 차체 ───
  def('teabox', 'large', '티백 상자'),
  def('sardine', 'large', '납작 통조림'),
  def('lunchbox', 'large', '도시락통'),
  def('thermos', 'large', '보온병'),
  def('dishboat', 'large', '비누 받침배'),

  // ─── 추가 엔진 ───
  def('rubberband_engine', 'small', '고무줄 동력'),
  def('fanmotor', 'mid', '선풍기 모터'),
  def('clockwork', 'mid', '시계 무브먼트'),
  def('solar', 'mid', '태양전지'),
  def('turbine', 'large', '미니 터빈'),

  // ─── 추가 부스터 ───
  def('bellows', 'mid', '풀무'),
  def('sodacan', 'mid', '흔든 탄산캔'),
  def('firework', 'mid', '폭죽'),
  def('jetnozzle', 'mid', '제트 노즐'),
  def('rocketpack', 'large', '장난감 로켓'),

  // ─── 추가 범퍼 ───
  def('sponge', 'mid', '수세미 스펀지'),
  def('cork', 'small', '코르크 마개'),
  def('springbumper', 'mid', '스프링 범퍼'),
  def('ruler', 'mid', '15cm 자'),
  def('capshield', 'mid', '병뚜껑 방패'),

  // ─── 추가 스포일러 ───
  def('feather', 'small', '깃털'),
  def('spoon', 'mid', '숟가락'),
  def('paperfan', 'mid', '종이 부채'),
  def('comb', 'mid', '빗'),
  def('planewing', 'large', '비행기 날개'),

  // ─── 추가 배기구 ───
  def('whistle', 'small', '호루라기'),
  def('hosepipe', 'mid', '주름 호스'),
  def('funnel', 'mid', '깔때기'),
  def('chimney', 'mid', '양철 굴뚝'),
  def('trumpet', 'mid', '장난감 나팔'),

  // ─── 추가 안테나 ───
  def('paperclip', 'small', '클립'),
  def('springant', 'small', '스프링 더듬이'),
  def('balloonant', 'mid', '풍선 안테나'),
  def('pinwheel', 'mid', '바람개비'),
  def('radardish', 'mid', '미니 레이더'),

  // ─── 추가 장식 ───
  def('beads', 'small', '구슬 꾸러미'),
  def('pompom', 'small', '방울 솜뭉치'),
  def('ribbon', 'small', '리본'),
  def('starsticker', 'small', '별 스티커'),
  def('crown', 'mid', '왕관 장식'),

  // ─── 총: 차량 지붕에 장착해 배틀에서 사격 ───
  def('waterpistol', 'mid', '물총'),
  def('rubbergun', 'mid', '고무줄 총'),
  def('slingshot', 'mid', '새총'),
  def('corkgun', 'mid', '코르크 뽁총'),
  def('dartgun', 'mid', '스펀지 다트건'),
  def('peashotgun', 'mid', '콩알 샷건'),
  def('paintcannon', 'large', '물감 대포'),
];

/** 총 등급별 등장 가중치 */
const GUN_WEIGHTS: [string, number][] = [
  ['waterpistol', 18],
  ['rubbergun', 16],
  ['slingshot', 11],
  ['corkgun', 11],
  ['dartgun', 6],
  ['peashotgun', 6],
  ['paintcannon', 2],
];

export function rollGun(r: () => number = Math.random): PartDef {
  const total = GUN_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let v = r() * total;
  for (const [id, w] of GUN_WEIGHTS) {
    if (v < w) return partDef(id);
    v -= w;
  }
  return partDef('waterpistol');
}

/** 붓 부품만 */
export const BRUSH_PARTS = PARTS.filter((p) => ITEMS[p.itemId]?.cat === 'brush');

export const PARTS_BY_TIER: Record<PartTier, PartDef[]> = {
  small: PARTS.filter((p) => p.tier === 'small'),
  mid: PARTS.filter((p) => p.tier === 'mid'),
  large: PARTS.filter((p) => p.tier === 'large'),
};

/** 작은 부품이 자주, 큰 부품은 드물게 */
const TIER_WEIGHTS: [PartTier, number][] = [
  ['small', 0.55],
  ['mid', 0.37],
  ['large', 0.08],
];

/** 붓 등급별 등장 가중치 — 넓고 레어한 붓일수록 드물게 */
const BRUSH_WEIGHTS: [string, number][] = [
  ['ballpen', 20],
  ['crayon', 18],
  ['chalk', 16],
  ['highlighter', 12],
  ['thinbrush', 11],
  ['marker', 10],
  ['spongebrush', 8],
  ['widebrush', 6],
  ['roller', 4],
  ['mop', 3],
  ['paintbucket', 1.5],
  ['spraycan', 1],
];

export function rollBrush(r: () => number = Math.random): PartDef {
  const total = BRUSH_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let v = r() * total;
  for (const [id, w] of BRUSH_WEIGHTS) {
    if (v < w) return partDef(id);
    v -= w;
  }
  return partDef('ballpen');
}

export function rollPart(r: () => number = Math.random): PartDef {
  // 약 18%는 붓 — 페인트 배틀의 핵심 파츠라 꾸준히 등장
  if (r() < 0.18) return rollBrush(r);
  // 약 12%는 총 — 레이싱에서 사격용
  if (r() < 0.12) return rollGun(r);
  let v = r();
  let tier: PartTier = 'small';
  for (const [t, w] of TIER_WEIGHTS) {
    if (v < w) {
      tier = t;
      break;
    }
    v -= w;
  }
  // 일반 풀에서는 붓을 제외 (위에서 별도 확률로 처리)
  const pool = PARTS_BY_TIER[tier].filter((p) => ITEMS[p.itemId]?.cat !== 'brush' && ITEMS[p.itemId]?.cat !== 'gun');
  return pool[Math.floor(r() * pool.length)];
}

export const partDef = (itemId: string) => PARTS.find((p) => p.itemId === itemId) ?? PARTS[0];

/** 머리 위 적재물이 무거워 보이는 정도 (카메라/흔들림에 사용) */
export const stackWeight = (list: PartDef[]) => list.reduce((a, p) => a + p.h, 0);

// ─── 아레나 레이아웃 ────────────────────────────────────────────
export const ARENA_R = 15.5;

export interface Obstacle {
  x: number;
  z: number;
  r: number;
  kind: 'box' | 'pile' | 'wall';
  seed: number;
}

/** 작고 밀도 높은 폐품 아레나 — 서로 자주 마주치는 크기 */
export const OBSTACLES: Obstacle[] = [
  { x: -5.5, z: -4.5, r: 1.35, kind: 'box', seed: 1 },
  { x: 5.5, z: -5, r: 1.35, kind: 'box', seed: 2 },
  { x: 0, z: 7.2, r: 1.5, kind: 'pile', seed: 3 },
  { x: -9.2, z: 2.6, r: 1.4, kind: 'pile', seed: 4 },
  { x: 9.4, z: 3.2, r: 1.4, kind: 'pile', seed: 5 },
  // 짧은 통로 (우측)
  { x: 12.4, z: -1.2, r: 0.85, kind: 'wall', seed: 6 },
  { x: 12.4, z: -6, r: 0.85, kind: 'wall', seed: 7 },
  { x: 12.4, z: 5.2, r: 0.85, kind: 'wall', seed: 8 },
  { x: 12.4, z: 10, r: 0.85, kind: 'wall', seed: 9 },
];

/** 부품 생성 지점 — 한쪽에 몰리지 않게 분산 */
const SPAWN_ZONES: { x: number; z: number; r: number }[] = [
  { x: 0, z: 0, r: 3.4 },
  { x: -6, z: -6, r: 2.6 },
  { x: 6, z: -6, r: 2.6 },
  { x: -4, z: 4.5, r: 2.4 },
  { x: 4, z: 4.5, r: 2.4 },
  { x: 0, z: -10.5, r: 2.6 },
  { x: 0, z: 11.5, r: 2.6 },
  { x: -11, z: -1.5, r: 2.4 },
  { x: 11, z: -3.6, r: 2.2 },
  { x: 11.6, z: 7.6, r: 2.2 },
  { x: -8, z: 9, r: 2.4 },
  { x: 8, z: 10, r: 2.4 },
];

export const ZONE_COUNT = SPAWN_ZONES.length;

const inObstacle = (x: number, z: number, pad = 0.55) =>
  OBSTACLES.some((o) => (x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + pad) ** 2);

/**
 * 부품 생성 위치 선정.
 * - 캐릭터와 겹치지 않게
 * - 플레이어 바로 앞 코앞에 안 생기게
 * - 장애물 안에 안 생기게
 * - 매번 다른 지역을 돌며 분산
 */
export function pickSpawn(
  zoneCursor: number,
  runners: { x: number; z: number; heading: number }[],
  r: () => number = Math.random,
): { x: number; z: number; zone: number } | null {
  for (let attempt = 0; attempt < 16; attempt++) {
    const zi = (zoneCursor + attempt) % ZONE_COUNT;
    const zone = SPAWN_ZONES[zi];
    const a = r() * Math.PI * 2;
    const d = r() * zone.r;
    const x = zone.x + Math.cos(a) * d;
    const z = zone.z + Math.sin(a) * d;

    if (Math.hypot(x, z) > ARENA_R - 1.2) continue;
    if (inObstacle(x, z)) continue;

    let ok = true;
    let nearest = Infinity;
    for (const rn of runners) {
      const dx = x - rn.x;
      const dz = z - rn.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      if (dist < 2.0) {
        ok = false;
        break;
      }
      // 플레이어(첫 번째) 바로 정면 코앞은 피한다
      if (rn === runners[0] && dist < 4.2) {
        const fx = Math.sin(rn.heading);
        const fz = Math.cos(rn.heading);
        const ahead = (dx * fx + dz * fz) / (dist || 1);
        if (ahead > 0.55) {
          ok = false;
          break;
        }
      }
    }
    if (!ok) continue;

    // 지나치게 먼 위치만 계속 고르지 않게 (후보 초반엔 가까운 쪽 선호)
    if (nearest > 12 && attempt < 10) continue;
    return { x, z, zone: zi };
  }
  return null;
}

export function obstacleFree(x: number, z: number, pad = 0.6) {
  return Math.hypot(x, z) < ARENA_R - 1.0 && !inObstacle(x, z, pad);
}

export const partName = (itemId: string) => ITEMS[itemId]?.name ?? partDef(itemId).label;
