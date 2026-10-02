export type Tier = 'common' | 'rare' | 'gold' | 'big';
export type ScrapKind =
  | 'can' | 'milk' | 'paint' | 'bottle' | 'block' | 'gear' | 'pipe' | 'plastic'
  | 'tire' | 'spring' | 'wire' | 'toy' | 'plate' | 'battery' | 'jelly'
  | 'capsule' | 'bolt';

export const TIER_VALUE: Record<Tier, number> = { common: 1, rare: 3, gold: 5, big: 10 };
export const TIER_LABEL: Record<Tier, string> = { common: 'SCRAP', rare: 'RARE', gold: 'GOLD!', big: 'BIG!!' };

export const SCRAP_NAME: Record<ScrapKind, string> = {
  can: '음료수 캔', milk: '우유팩', paint: '페인트통', bottle: '유리병', block: '장난감 블록', gear: '기어',
  pipe: '파이프', plastic: '플라스틱 부품', tire: '작은 타이어', spring: '스프링', wire: '전선 뭉치',
  toy: '고무 오리', plate: '금속판', battery: '배터리', jelly: '젤리통', capsule: '아이템 캡슐', bolt: '부스트 볼트',
};

/** which car parts each scrap can be salvaged into (build phase) */
export const SCRAP_PART: Record<ScrapKind, string[]> = {
  can: ['can'], milk: ['matchbox'], paint: ['tub'], bottle: ['spray', 'straw'], block: ['brick'],
  gear: ['gear', 'motor'], pipe: ['pencap', 'straw'], plastic: ['plastic', 'popsicle'],
  tire: ['rubber', 'toywheel'], spring: ['clothespin', 'eraser'], wire: ['wire', 'rubberband'],
  toy: ['toywheel', 'propeller', 'cap'], plate: ['card', 'chopstick'], battery: ['battery', 'windup'],
  jelly: ['balloon', 'sticker', 'bell'], capsule: ['propeller'], bolt: ['spray'],
};

// weighted pools — wheels-ish scraps are common so most players can build a car
const COMMON_POOL: ScrapKind[] = ['can', 'can', 'tire', 'tire', 'toy', 'block', 'gear', 'gear', 'spring', 'pipe', 'plastic', 'milk', 'wire', 'tire', 'toy'];
const RARE_POOL: ScrapKind[] = ['battery', 'paint', 'bottle', 'plate', 'jelly', 'gear', 'tire', 'battery'];
const BIG_POOL: ScrapKind[] = ['paint', 'tire', 'milk', 'battery', 'can'];

export function randomKind(tier: Tier, r: () => number = Math.random): ScrapKind {
  const pool = tier === 'common' ? COMMON_POOL : tier === 'big' ? BIG_POOL : RARE_POOL;
  return pool[Math.floor(r() * pool.length)];
}

// ─── race items ──────────────────────────────────────────────────
export type RaceItem = 'turbo' | 'oil' | 'triple' | 'shield' | 'missile';
export const RACE_ITEMS: Record<RaceItem, { name: string; emoji: string; grade: string; desc: string }> = {
  turbo: { name: '터보 캔', emoji: '🥫', grade: '일반', desc: '짧은 순간 가속' },
  oil: { name: '기름 웅덩이', emoji: '🛢️', grade: '일반', desc: '뒤에 미끄러운 웅덩이 설치' },
  triple: { name: '트리플 터보', emoji: '🚀', grade: '강력', desc: '터보 3연발' },
  shield: { name: '뽁뽁이 실드', emoji: '🫧', grade: '강력', desc: '공격 1회 방어' },
  missile: { name: '병뚜껑 미사일', emoji: '🎯', grade: '특수', desc: '앞 차량을 추적해 스핀' },
};

export interface ScrapStats {
  score: number;
  common: number;
  rare: number;
  gold: number;
  big: number;
  maxCombo: number;
  capsules: number;
}
export const emptyStats = (): ScrapStats => ({ score: 0, common: 0, rare: 0, gold: 0, big: 0, maxCombo: 0, capsules: 0 });

export interface Loadout {
  items: RaceItem[];
  startBoost: number;
  lines: { icon: string; text: string }[];
}

/** Scrap result → race start loadout. Balanced so the gap stays small (max 3 items). */
export function computeLoadout(s: ScrapStats, r: () => number = Math.random): Loadout {
  const items: RaceItem[] = [];
  const lines: Loadout['lines'] = [];
  const normal = (): RaceItem => (r() < 0.6 ? 'turbo' : 'oil');
  if (s.score >= 8 || s.common >= 5) {
    const it = normal();
    items.push(it);
    lines.push({ icon: RACE_ITEMS[it].emoji, text: `일반 고물 ${s.common}개 → ${RACE_ITEMS[it].name}` });
  }
  if (s.rare >= 2) {
    const it: RaceItem = r() < 0.5 ? 'triple' : 'shield';
    items.push(it);
    lines.push({ icon: RACE_ITEMS[it].emoji, text: `희귀 고물 ${s.rare}개 → ${RACE_ITEMS[it].name}` });
  }
  if (s.gold >= 1) {
    items.push('missile');
    lines.push({ icon: '🎯', text: `황금 고물 ${s.gold}개 → 병뚜껑 미사일` });
  }
  if (s.big >= 1 || s.capsules >= 1) {
    const it = normal();
    items.push(it);
    lines.push({ icon: RACE_ITEMS[it].emoji, text: `${s.big ? '대형 고물' : '아이템 캡슐'} 보너스 → ${RACE_ITEMS[it].name}` });
  }
  if (items.length === 0) {
    items.push('turbo');
    lines.push({ icon: '🥫', text: '참가 보너스 → 터보 캔' });
  }
  while (items.length > 3) items.pop();
  const startBoost = s.maxCombo >= 10 ? 2.0 : s.maxCombo >= 6 ? 1.4 : s.maxCombo >= 3 ? 0.8 : 0;
  if (startBoost > 0) lines.push({ icon: '🔥', text: `최대 콤보 x${s.maxCombo} → 스타트 부스트 ${startBoost.toFixed(1)}초` });
  return { items, startBoost, lines };
}
