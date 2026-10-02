import { create } from 'zustand';
import { CHARACTERS, ITEMS, type Category } from './data/items';
import type { Loadout, ScrapStats } from './game/scrap';

export type GameMode = 'ffa' | 'team';
export const MODE_LABEL: Record<GameMode, string> = { ffa: '개인전', team: '2:2 팀전' };
export const TEAM_LABEL = ['A팀', 'B팀'];
export const TEAM_COLORS = ['#f56a87', '#4a8ff0'];
export type Phase = 'select' | 'collect' | 'build' | 'battle' | 'result';
export interface InvItem { uid: number; itemId: string }
export type Slot = 'body' | 'engine' | 'booster' | 'frontBumper' | 'rearBumper' | 'spoiler' | 'exhaust' | 'antenna' | 'deco' | 'brush' | 'gun';
export const SLOT_LABEL: Record<Slot, string> = {
  body: '차체', engine: '엔진', booster: '부스터', frontBumper: '앞 범퍼', rearBumper: '뒤 범퍼',
  spoiler: '스포일러', exhaust: '배기구', antenna: '안테나', deco: '장식', brush: '붓', gun: '총',
};
export const SLOT_CATEGORY: Record<Slot, Category> = {
  body: 'body', engine: 'engine', booster: 'booster', frontBumper: 'bumper', rearBumper: 'bumper',
  spoiler: 'spoiler', exhaust: 'exhaust', antenna: 'antenna', deco: 'deco', brush: 'brush', gun: 'gun',
};
/** upgrades: 부품 uid → 등급 업그레이드 단계 (같은 종류 부품을 먹으면 +1) */
export interface CarBuild { slots: Partial<Record<Slot, number>>; wheels: (number | null)[]; upgrades?: Record<number, number> }
export interface Racer {
  id: string; name: string; characterId: string; jersey: string; build: CarBuild;
  items: Record<number, string>; isPlayer: boolean; controlIndex?: number; loadout?: Loadout;
  /** 온라인 방의 다른 참가자 (위치를 네트워크로 받아옴) */
  remoteId?: string;
  /** 팀전일 때 소속 팀 (0 = A, 1 = B) */
  team?: number;
}
export interface OnlinePlayer { id: string; name: string; characterId: string; color: string; team: number }
export interface OnlineSession { code: string; playerId: string; players: OnlinePlayer[] }
export interface BattleResultEntry {
  id: string; name: string; characterId: string; color: string; isPlayer: boolean;
  paint: number; area: number; overpaint: number; boosts: number; itemsUsed: number; jumps: number;
  rank: number; cells: number;
  /** 팀전: 소속 팀과 팀 전체 점유율 */
  team?: number; teamPaint?: number;
}
export interface SummaryEntry {
  id: string; name: string; characterId: string; jersey: string; isPlayer: boolean; stats: ScrapStats;
}
export interface ScrapSummary { entries: SummaryEntry[]; bots: Racer[]; loadout: Loadout }
export interface LocalPlayer { characterId: string; name: string }
export interface Garage { build: CarBuild; items: Record<number, string> }
export const PLAYER_COLORS = ['#f56a87', '#50ccb6', '#699cfa', '#ffc16b'];
export const emptyBuild = (): CarBuild => ({ slots: {}, wheels: [null, null, null, null] });
const defaultGarage: Garage = {
  build: { slots: { body: 1, engine: 2, frontBumper: 3, spoiler: 4, booster: 5, antenna: 6, brush: 11, gun: 12 }, wheels: [7, 8, 9, 10] },
  items: { 1: 'can', 2: 'motor', 3: 'clothespin', 4: 'popsicle', 5: 'propeller', 6: 'wire', 7: 'cap', 8: 'toywheel', 9: 'rubber', 10: 'rubber', 11: 'widebrush', 12: 'waterpistol' },
};
function loadGarage(): Garage {
  try {
    const saved = JSON.parse(localStorage.getItem('junk-racers-garage') ?? 'null') as Garage | null;
    if (saved?.build?.slots && Array.isArray(saved.build.wheels) && saved.build.wheels.length === 4 && saved.items && Object.values(saved.items).every((id) => ITEMS[id])) {
      const validSlots = (Object.keys(saved.build.slots) as Slot[]).every((slot) => SLOT_CATEGORY[slot] && ITEMS[saved.items[saved.build.slots[slot]!]]?.cat === SLOT_CATEGORY[slot]);
      const validWheels = saved.build.wheels.every((uid) => uid === null || ITEMS[saved.items[uid]]?.cat === 'wheel');
      if (validSlots && validWheels) return saved;
    }
  } catch { /* Storage is optional. */ }
  return defaultGarage;
}
function loadMode(): GameMode {
  try { return localStorage.getItem('junk-racers-mode') === 'team' ? 'team' : 'ffa'; } catch { return 'ffa'; }
}
function saveGarage(garage: Garage) {
  try { localStorage.setItem('junk-racers-garage', JSON.stringify(garage)); } catch { /* Storage is optional. */ }
}

interface GameState {
  phase: Phase; round: number; characterId: string; paintColor: string;
  inventory: InvItem[]; build: CarBuild; bots: Racer[]; results: BattleResultEntry[];
  nextUid: number; scrapSummary: ScrapSummary | null; loadout: Loadout | null; resultMap: string | null;
  garage: Garage; localPlayers: LocalPlayer[]; sessionCode: string; online: OnlineSession | null;
  gameMode: GameMode; setGameMode: (m: GameMode) => void;
  setOnline: (online: OnlineSession | null) => void;
  setCharacter: (id: string) => void; setPaintColor: (color: string) => void;
  startCollect: () => void; addItem: (itemId: string) => boolean; removeItem: (uid: number) => void;
  setScrapSummary: (summary: ScrapSummary) => void;
  completeCollection: (inventory: InvItem[], summary: ScrapSummary) => void;
  finishCollect: () => void; equip: (slot: Slot, uid: number | null) => void;
  setWheel: (index: number, uid: number | null) => void; startBattle: () => void;
  finishBattle: (results: BattleResultEntry[], map?: string) => void; resetToSelect: () => void;
  customizeGarage: (slot: Slot | number, itemId: string | null) => void;
  setLocalPlayers: (players: LocalPlayer[], code?: string) => void;
}

export const useGame = create<GameState>((set, get) => ({
  phase: 'select', round: 1, characterId: CHARACTERS[0].id, paintColor: PLAYER_COLORS[0],
  inventory: [], build: emptyBuild(), bots: [], results: [], nextUid: 1,
  scrapSummary: null, loadout: null, resultMap: null, garage: loadGarage(), localPlayers: [], sessionCode: '', online: null, gameMode: loadMode(),
  setGameMode: (gameMode) => { try { localStorage.setItem('junk-racers-mode', gameMode); } catch { /* optional */ } set({ gameMode }); },
  setOnline: (online) => set({ online }),
  setCharacter: (characterId) => set({ characterId }),
  setPaintColor: (paintColor) => set({ paintColor }),
  startCollect: () => set({ phase: 'collect', inventory: [], build: emptyBuild(), results: [], scrapSummary: null, loadout: null, resultMap: null }),
  addItem: (itemId) => {
    if (!ITEMS[itemId] || get().inventory.length >= 24) return false;
    const uid = get().nextUid;
    set((s) => ({ inventory: [...s.inventory, { uid, itemId }], nextUid: uid + 1 }));
    return true;
  },
  removeItem: (uid) => set((s) => ({ inventory: s.inventory.filter((i) => i.uid !== uid) })),
  setScrapSummary: (scrapSummary) => set({ scrapSummary }),
  completeCollection: (inventory, scrapSummary) => set({
    inventory, scrapSummary, bots: scrapSummary.bots, loadout: scrapSummary.loadout,
    build: autoBuild(inventory), nextUid: Math.max(1, ...inventory.map((i) => i.uid + 1)),
  }),
  finishCollect: () => set({ phase: 'build' }),
  equip: (slot, uid) => set((s) => {
    const slots = { ...s.build.slots };
    (Object.keys(slots) as Slot[]).forEach((k) => { if (uid !== null && slots[k] === uid) delete slots[k]; });
    if (uid === null) delete slots[slot]; else slots[slot] = uid;
    return { build: { ...s.build, slots } };
  }),
  setWheel: (index, uid) => set((s) => {
    const wheels = s.build.wheels.map((w) => uid !== null && w === uid ? null : w);
    wheels[index] = uid;
    return { build: { ...s.build, wheels } };
  }),
  startBattle: () => {
    const s = get();
    const garage = s.inventory.length ? { build: s.build, items: itemsMap(s.inventory) } : s.garage;
    saveGarage(garage);
    set({ phase: 'battle', garage });
  },
  finishBattle: (results, resultMap) => set({ phase: 'result', results, resultMap: resultMap ?? null }),
  resetToSelect: () => set((s) => ({ phase: 'select', round: s.round + 1, inventory: [], build: emptyBuild(), bots: [], results: [], scrapSummary: null, loadout: null })),
  customizeGarage: (slot, itemId) => set((s) => {
    const items = { ...s.garage.items };
    const build = { slots: { ...s.garage.build.slots }, wheels: [...s.garage.build.wheels] };
    const uid = Math.max(100, ...Object.keys(items).map(Number)) + 1;
    if (itemId) items[uid] = itemId;
    if (typeof slot === 'number') build.wheels[slot] = itemId ? uid : null;
    else if (itemId) build.slots[slot] = uid;
    else delete build.slots[slot];
    const garage = { build, items };
    saveGarage(garage);
    return { garage };
  }),
  setLocalPlayers: (localPlayers, sessionCode = '') => set({ localPlayers: localPlayers.slice(0, 3), sessionCode }),
}));

export function autoBuild(inv: InvItem[]): CarBuild {
  const build = emptyBuild();
  const used = new Set<number>();
  const gradeRank = { common: 0, rare: 1, epic: 2, legend: 3 } as const;
  (Object.keys(SLOT_CATEGORY) as Slot[]).forEach((slot) => {
    const cat = SLOT_CATEGORY[slot];
    // 같은 카테고리가 여러 개면 가장 좋은 것(붓은 가장 넓은 것, 그 외는 최고 등급)을 자동 선택
    const candidates = inv.filter((i) => !used.has(i.uid) && ITEMS[i.itemId]?.cat === cat);
    candidates.sort((a, b) => {
      const A = ITEMS[a.itemId], B = ITEMS[b.itemId];
      if (cat === 'brush') return (B.paintWidth ?? 0) - (A.paintWidth ?? 0);
      return gradeRank[B.grade] - gradeRank[A.grade];
    });
    const found = candidates[0];
    if (found) { used.add(found.uid); build.slots[slot] = found.uid; }
  });
  const wheels = inv.filter((i) => ITEMS[i.itemId]?.cat === 'wheel').slice(0, 4);
  wheels.sort((a, b) => (ITEMS[a.itemId].radius ?? 0) - (ITEMS[b.itemId].radius ?? 0));
  wheels.forEach((w, i) => { build.wheels[i] = w.uid; });
  return build;
}
export function itemsMap(inv: InvItem[]): Record<number, string> {
  return Object.fromEntries(inv.map((i) => [i.uid, i.itemId]));
}