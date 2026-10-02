export type Category =
  | 'wheel'
  | 'body'
  | 'engine'
  | 'booster'
  | 'bumper'
  | 'spoiler'
  | 'exhaust'
  | 'antenna'
  | 'deco'
  | 'brush'
  | 'gun';

/** 부품 등급 — 높을수록 차량 속도 보너스가 커진다 */
export type Grade = 'common' | 'rare' | 'epic' | 'legend';
export const GRADE_LABEL: Record<Grade, string> = { common: '일반', rare: '희귀', epic: '영웅', legend: '전설' };
export const GRADE_COLOR: Record<Grade, string> = { common: '#9aa3ad', rare: '#4a8ff0', epic: '#a66bff', legend: '#ffb703' };
/** 등급별 차량 최고속도 보너스 (장착 부품 1개당) */
export const GRADE_SPEED: Record<Grade, number> = { common: 0.25, rare: 0.7, epic: 1.3, legend: 2.2 };
export const GRADE_ORDER: Grade[] = ['common', 'rare', 'epic', 'legend'];

export interface Stats {
  speed: number;
  accel: number;
  grip: number;
  weight: number;
  boost: number;
}

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  cat: Category;
  desc: string;
  color: string;
  stats: Partial<Stats>;
  radius?: number;
  grade: Grade;
  /** 붓 전용: 페인트 반경 배율 (1 = 기본) */
  paintWidth?: number;
  /** 총 전용: 사격 성능 */
  gun?: GunStats;
}

/** 총 부품 성능 — 데미지/연사/탄속/산탄 수 */
export interface GunStats {
  damage: number;
  /** 초당 발사 수 */
  rate: number;
  /** 탄속 (world units/s) */
  speed: number;
  /** 한 번에 나가는 탄 수 */
  pellets: number;
  /** 산탄 퍼짐 (rad) */
  spread: number;
  /** 사거리 (초) */
  life: number;
  /** 명중 시 페인트 반경 (0이면 없음) */
  splash: number;
  bulletColor: string;
}

/** 총을 장착하지 않았을 때 기본 콩알총 */
/** 맨손 기본 공격 — 어떤 총보다도 약하다 (총을 먹어서 장착하는 것이 이득) */
export const DEFAULT_GUN: GunStats = { damage: 3, rate: 1.2, speed: 22, pellets: 1, spread: 0.05, life: 0.5, splash: 0, bulletColor: '#e9e3c8' };

/** 등급 업그레이드 시 총 데미지 배율 */
export const GUN_GRADE_MUL: Record<Grade, number> = { common: 1, rare: 1.25, epic: 1.55, legend: 1.95 };

export const CATEGORY_LABEL: Record<Category, string> = {
  body: '차체',
  wheel: '바퀴',
  engine: '엔진',
  booster: '부스터',
  bumper: '범퍼',
  spoiler: '스포일러',
  exhaust: '배기구',
  antenna: '안테나',
  deco: '장식',
  brush: '붓',
  gun: '총',
};

export const ITEMS: Record<string, ItemDef> = {
  // ─── 바퀴 ───
  button: { id: 'button', name: '단추', emoji: '🪙', cat: 'wheel', desc: '아주 가벼운 비상용 바퀴', color: '#4fa3e0', stats: { grip: -1, weight: -1 }, radius: 0.3, grade: 'common' },
  cap: { id: 'cap', name: '병뚜껑', emoji: '🔘', cat: 'wheel', desc: '가볍고 작은 금속 바퀴', color: '#e8453c', stats: { speed: 1 }, radius: 0.34, grade: 'common' },
  gear: { id: 'gear', name: '톱니 기어', emoji: '⚙️', cat: 'wheel', desc: '덜컹거리지만 잘 굴러감', color: '#9aa3ad', stats: { accel: 1, grip: 1 }, radius: 0.42, grade: 'rare' },
  toywheel: { id: 'toywheel', name: '장난감 바퀴', emoji: '🛞', cat: 'wheel', desc: '플라스틱 장난감차 바퀴', color: '#f2c230', stats: { speed: 1, grip: 1 }, radius: 0.44, grade: 'rare' },
  rubber: { id: 'rubber', name: '고무바퀴', emoji: '⚫', cat: 'wheel', desc: '접지력 최고의 묵직한 바퀴', color: '#2b2b30', stats: { speed: 2, grip: 2, weight: 1 }, radius: 0.56, grade: 'epic' },
  coin: { id: 'coin', name: '동전', emoji: '🪙', cat: 'wheel', desc: '얇아서 잘 구르지만 미끄러움', color: '#d9b45a', stats: { speed: 1, grip: -1 }, radius: 0.28, grade: 'common' },
  spool: { id: 'spool', name: '실패', emoji: '🧵', cat: 'wheel', desc: '실이 감긴 나무 스풀 바퀴', color: '#c9a36a', stats: { accel: 1 }, radius: 0.38, grade: 'common' },
  jarlid: { id: 'jarlid', name: '잼 뚜껑', emoji: '🫙', cat: 'wheel', desc: '넓은 접지면의 금속 뚜껑', color: '#8d99ae', stats: { grip: 2, weight: 1 }, radius: 0.48, grade: 'rare' },
  oring: { id: 'oring', name: '고무 오링', emoji: '⭕', cat: 'wheel', desc: '푹신하게 튀어오르는 링 바퀴', color: '#5a4a52', stats: { speed: 1, grip: 1, weight: -1 }, radius: 0.5, grade: 'epic' },
  inline: { id: 'inline', name: '인라인 휠', emoji: '🛼', cat: 'wheel', desc: '베어링이 살아있는 전설의 바퀴', color: '#7cf0d8', stats: { speed: 3, accel: 2, grip: 1 }, radius: 0.52, grade: 'legend' },

  // ─── 차체 ───
  matchbox: { id: 'matchbox', name: '성냥갑', emoji: '📦', cat: 'body', desc: '가볍고 빠르지만 미끄러움', color: '#d9a066', stats: { speed: 2, grip: -1 }, grade: 'common' },
  can: { id: 'can', name: '음료수 캔', emoji: '🥫', cat: 'body', desc: '빠르지만 살짝 찌그러진 차체', color: '#e2362f', stats: { speed: 1, weight: 1 }, grade: 'common' },
  tub: { id: 'tub', name: '플라스틱 통', emoji: '🪣', cat: 'body', desc: '넓고 안정적인 차체', color: '#f4f1ea', stats: { grip: 1, weight: 2 }, grade: 'rare' },
  brick: { id: 'brick', name: '장난감 블록', emoji: '🧱', cat: 'body', desc: '튼튼하고 묵직한 차체', color: '#3b82f6', stats: { grip: 2, weight: 2 }, grade: 'rare' },
  soap: { id: 'soap', name: '비누갑', emoji: '🧼', cat: 'body', desc: '매끈한 유선형 차체', color: '#8ad8c6', stats: { speed: 1, grip: 1, weight: 1 }, grade: 'epic' },
  teabox: { id: 'teabox', name: '티백 상자', emoji: '🍵', cat: 'body', desc: '아주 가벼운 종이 차체', color: '#b7d6a8', stats: { speed: 2, weight: -1, grip: -1 }, grade: 'common' },
  sardine: { id: 'sardine', name: '납작 통조림', emoji: '🥫', cat: 'body', desc: '낮고 넓어 안정적인 차체', color: '#bcc6cf', stats: { grip: 2, speed: 1 }, grade: 'common' },
  lunchbox: { id: 'lunchbox', name: '도시락통', emoji: '🍱', cat: 'body', desc: '큼직하고 튼튼한 2단 차체', color: '#e8705e', stats: { grip: 1, weight: 2, accel: 1 }, grade: 'rare' },
  thermos: { id: 'thermos', name: '보온병', emoji: '🧃', cat: 'body', desc: '길쭉한 원통형 로켓 차체', color: '#5f8fd0', stats: { speed: 2, weight: 1 }, grade: 'epic' },
  dishboat: { id: 'dishboat', name: '비누 받침배', emoji: '🛶', cat: 'body', desc: '미끄러지듯 달리는 전설의 차체', color: '#ffd9a0', stats: { speed: 3, grip: 2, weight: -1 }, grade: 'legend' },

  // ─── 엔진 ───
  windup: { id: 'windup', name: '태엽', emoji: '🔑', cat: 'engine', desc: '초반 가속이 엄청남', color: '#d4a52a', stats: { accel: 4 }, grade: 'common' },
  motor: { id: 'motor', name: '장난감 모터', emoji: '🔩', cat: 'engine', desc: '폭발적인 가속력', color: '#c0c6cc', stats: { accel: 3, speed: 1 }, grade: 'rare' },
  battery: { id: 'battery', name: '건전지', emoji: '🔋', cat: 'engine', desc: '꾸준한 최고속도', color: '#2d8a4e', stats: { accel: 2, speed: 2, weight: 1 }, grade: 'epic' },
  rubberband_engine: { id: 'rubberband_engine', name: '고무줄 동력', emoji: '➿', cat: 'engine', desc: '감았다 풀리는 단순 동력', color: '#f0b429', stats: { accel: 2 }, grade: 'common' },
  fanmotor: { id: 'fanmotor', name: '선풍기 모터', emoji: '🌬️', cat: 'engine', desc: '바람을 뿜으며 밀어준다', color: '#7fb2e5', stats: { accel: 2, speed: 1 }, grade: 'common' },
  clockwork: { id: 'clockwork', name: '시계 무브먼트', emoji: '🕰️', cat: 'engine', desc: '정교한 톱니가 꾸준히 돈다', color: '#d4b483', stats: { accel: 3, grip: 1 }, grade: 'rare' },
  solar: { id: 'solar', name: '태양전지', emoji: '🔆', cat: 'engine', desc: '가볍고 조용한 고효율 엔진', color: '#2f4f7a', stats: { speed: 3, weight: -1 }, grade: 'epic' },
  turbine: { id: 'turbine', name: '미니 터빈', emoji: '🌪️', cat: 'engine', desc: '굉음을 내는 전설의 심장', color: '#c0c6cc', stats: { accel: 4, speed: 3, weight: 1 }, grade: 'legend' },

  // ─── 부스터 ───
  balloon: { id: 'balloon', name: '풍선', emoji: '🎈', cat: 'booster', desc: '가벼워지고 점프가 높아짐', color: '#ff5e7e', stats: { boost: 1, weight: -2 }, grade: 'common' },
  spray: { id: 'spray', name: '스프레이 노즐', emoji: '🧴', cat: 'booster', desc: '강력한 순간 가속 부스터', color: '#f06292', stats: { boost: 3 }, grade: 'rare' },
  propeller: { id: 'propeller', name: '프로펠러', emoji: '🌀', cat: 'booster', desc: '부스터 + 최고속도 증가', color: '#ff9f43', stats: { boost: 2, speed: 1 }, grade: 'epic' },
  bellows: { id: 'bellows', name: '풀무', emoji: '💨', cat: 'booster', desc: '뽁 하고 바람을 밀어낸다', color: '#a8734f', stats: { boost: 1 }, grade: 'common' },
  sodacan: { id: 'sodacan', name: '흔든 탄산캔', emoji: '🥤', cat: 'booster', desc: '거품으로 터지는 즉석 부스터', color: '#e2574c', stats: { boost: 2, weight: -1 }, grade: 'common' },
  firework: { id: 'firework', name: '폭죽', emoji: '🎆', cat: 'booster', desc: '화려하게 터지는 강한 추진', color: '#ff5f8d', stats: { boost: 3, speed: 1 }, grade: 'rare' },
  jetnozzle: { id: 'jetnozzle', name: '제트 노즐', emoji: '🚿', cat: 'booster', desc: '예리하게 분사되는 제트 추진', color: '#58c7d8', stats: { boost: 3, speed: 2 }, grade: 'epic' },
  rocketpack: { id: 'rocketpack', name: '장난감 로켓', emoji: '🚀', cat: 'booster', desc: '전설의 로켓 부스터', color: '#e8453c', stats: { boost: 4, speed: 2, weight: 1 }, grade: 'legend' },

  // ─── 범퍼 ───
  chopstick: { id: 'chopstick', name: '젓가락', emoji: '🥢', cat: 'bumper', desc: '길고 가벼운 범퍼', color: '#c9a36a', stats: { speed: 1 }, grade: 'common' },
  eraser: { id: 'eraser', name: '지우개', emoji: '🩹', cat: 'bumper', desc: '푹신한 충격 흡수 범퍼', color: '#f7b2c4', stats: { grip: 1 }, grade: 'common' },
  clothespin: { id: 'clothespin', name: '빨래집게', emoji: '🧷', cat: 'bumper', desc: '충돌에 강한 나무 범퍼', color: '#deb887', stats: { weight: 1, grip: 1 }, grade: 'rare' },
  plastic: { id: 'plastic', name: '플라스틱 조각', emoji: '🔷', cat: 'bumper', desc: '뾰족한 공기역학 범퍼', color: '#4dd0e1', stats: { speed: 1, weight: -1 }, grade: 'epic' },
  sponge: { id: 'sponge', name: '수세미 스펀지', emoji: '🧽', cat: 'bumper', desc: '충격을 폭신하게 삼킨다', color: '#ffd166', stats: { grip: 1, weight: -1 }, grade: 'common' },
  cork: { id: 'cork', name: '코르크 마개', emoji: '🍾', cat: 'bumper', desc: '가볍고 탄력 있는 마개 범퍼', color: '#d2a56d', stats: { speed: 1, weight: -1 }, grade: 'common' },
  springbumper: { id: 'springbumper', name: '스프링 범퍼', emoji: '🌀', cat: 'bumper', desc: '부딪히면 통통 튕겨낸다', color: '#aab6c2', stats: { grip: 1, accel: 1 }, grade: 'rare' },
  ruler: { id: 'ruler', name: '15cm 자', emoji: '📏', cat: 'bumper', desc: '넓게 받아내는 플라스틱 판', color: '#6fd0a8', stats: { grip: 2, speed: 1 }, grade: 'rare' },
  capshield: { id: 'capshield', name: '병뚜껑 방패', emoji: '🛡️', cat: 'bumper', desc: '겹겹이 덧댄 단단한 방패', color: '#c74b5a', stats: { grip: 2, weight: 1, speed: 1 }, grade: 'epic' },

  // ─── 스포일러 ───
  leaf: { id: 'leaf', name: '나뭇잎', emoji: '🍃', cat: 'spoiler', desc: '아주 가벼운 날개', color: '#6cc04a', stats: { grip: 1, weight: -1 }, grade: 'common' },
  popsicle: { id: 'popsicle', name: '아이스크림 막대', emoji: '🍡', cat: 'spoiler', desc: '코너 안정성 증가', color: '#e0b97d', stats: { grip: 1 }, grade: 'rare' },
  card: { id: 'card', name: '트럼프 카드', emoji: '🃏', cat: 'spoiler', desc: '다운포스 + 속도', color: '#f8f8f8', stats: { grip: 1, speed: 1 }, grade: 'epic' },
  feather: { id: 'feather', name: '깃털', emoji: '🪶', cat: 'spoiler', desc: '거의 무게가 없는 날개', color: '#dfe6ef', stats: { weight: -2, grip: 1 }, grade: 'common' },
  spoon: { id: 'spoon', name: '숟가락', emoji: '🥄', cat: 'spoiler', desc: '오목하게 바람을 받는다', color: '#c3ccd4', stats: { grip: 1, weight: 1 }, grade: 'common' },
  paperfan: { id: 'paperfan', name: '종이 부채', emoji: '🪭', cat: 'spoiler', desc: '활짝 펼쳐지는 넓은 날개', color: '#f0a8b8', stats: { grip: 2, weight: -1 }, grade: 'rare' },
  comb: { id: 'comb', name: '빗', emoji: '🪮', cat: 'spoiler', desc: '빗살 사이로 공기가 흐른다', color: '#6b5ba8', stats: { grip: 1, speed: 1 }, grade: 'rare' },
  planewing: { id: 'planewing', name: '모형 비행기 날개', emoji: '✈️', cat: 'spoiler', desc: '진짜 양력을 만드는 날개', color: '#e8eef5', stats: { speed: 2, grip: 2 }, grade: 'epic' },

  // ─── 배기구 ───
  straw: { id: 'straw', name: '빨대', emoji: '🥤', cat: 'exhaust', desc: '최고속도 소폭 증가', color: '#ff7043', stats: { speed: 1 }, grade: 'common' },
  pencap: { id: 'pencap', name: '볼펜 뚜껑', emoji: '🖊️', cat: 'exhaust', desc: '가속력 소폭 증가', color: '#3f51b5', stats: { accel: 1 }, grade: 'rare' },
  whistle: { id: 'whistle', name: '호루라기', emoji: '📣', cat: 'exhaust', desc: '삑 소리를 내며 바람을 뺀다', color: '#e05c4a', stats: { accel: 1 }, grade: 'common' },
  hosepipe: { id: 'hosepipe', name: '주름 호스', emoji: '🪠', cat: 'exhaust', desc: '구불구불한 배기 호스', color: '#5e8f6a', stats: { speed: 1, weight: -1 }, grade: 'common' },
  funnel: { id: 'funnel', name: '깔때기', emoji: '🔻', cat: 'exhaust', desc: '넓게 퍼지는 배기구', color: '#f0a040', stats: { speed: 1, accel: 1 }, grade: 'rare' },
  chimney: { id: 'chimney', name: '양철 굴뚝', emoji: '🏭', cat: 'exhaust', desc: '위로 솟은 쌍둥이 굴뚝', color: '#8d99ae', stats: { speed: 1, weight: 1, accel: 1 }, grade: 'rare' },
  trumpet: { id: 'trumpet', name: '장난감 나팔', emoji: '🎺', cat: 'exhaust', desc: '우렁차게 울리는 황금 배기', color: '#e4b84a', stats: { speed: 2, accel: 1 }, grade: 'epic' },

  // ─── 안테나 ───
  wire: { id: 'wire', name: '철사', emoji: '➰', cat: 'antenna', desc: '휘어진 철사 안테나', color: '#8d99ae', stats: {}, grade: 'common' },
  toothpick: { id: 'toothpick', name: '이쑤시개 깃발', emoji: '🚩', cat: 'antenna', desc: '깃발 달린 이쑤시개', color: '#e7c9a0', stats: {}, grade: 'rare' },
  paperclip: { id: 'paperclip', name: '클립', emoji: '📎', cat: 'antenna', desc: '구부린 클립 안테나', color: '#aab6c2', stats: { weight: -1 }, grade: 'common' },
  springant: { id: 'springant', name: '스프링 더듬이', emoji: '〰️', cat: 'antenna', desc: '흔들흔들 용수철 더듬이', color: '#cfd4d8', stats: { accel: 1 }, grade: 'common' },
  balloonant: { id: 'balloonant', name: '풍선 안테나', emoji: '🎈', cat: 'antenna', desc: '둥실 떠 차체를 가볍게', color: '#ff8fb1', stats: { weight: -2 }, grade: 'rare' },
  pinwheel: { id: 'pinwheel', name: '바람개비', emoji: '🌸', cat: 'antenna', desc: '빙글빙글 도는 바람개비', color: '#6fd0e8', stats: { speed: 1, accel: 1 }, grade: 'rare' },
  radardish: { id: 'radardish', name: '미니 레이더', emoji: '📡', cat: 'antenna', desc: '길을 읽어주는 작은 접시', color: '#d8dee6', stats: { grip: 2, speed: 1 }, grade: 'epic' },

  // ─── 장식 ───
  bell: { id: 'bell', name: '방울', emoji: '🔔', cat: 'deco', desc: '딸랑딸랑 귀여운 장식', color: '#ffb300', stats: {}, grade: 'common' },
  rubberband: { id: 'rubberband', name: '고무줄', emoji: '➿', cat: 'deco', desc: '부품을 꽉 묶어 안정성 증가', color: '#f5c242', stats: { grip: 1 }, grade: 'rare' },
  sticker: { id: 'sticker', name: '번개 스티커', emoji: '⚡', cat: 'deco', desc: '왠지 더 빨라진 기분', color: '#ffd54f', stats: { speed: 1 }, grade: 'epic' },
  beads: { id: 'beads', name: '구슬 꾸러미', emoji: '📿', cat: 'deco', desc: '달그락거리는 색색 구슬', color: '#8fd3e8', stats: {}, grade: 'common' },
  pompom: { id: 'pompom', name: '방울 솜뭉치', emoji: '🧶', cat: 'deco', desc: '폭신한 털실 방울', color: '#ff9ec4', stats: { weight: -1 }, grade: 'common' },
  ribbon: { id: 'ribbon', name: '리본', emoji: '🎀', cat: 'deco', desc: '휘날리는 포장 리본', color: '#ef6f8e', stats: { speed: 1, weight: -1 }, grade: 'rare' },
  starsticker: { id: 'starsticker', name: '별 스티커', emoji: '⭐', cat: 'deco', desc: '반짝반짝 금색 별', color: '#ffc93a', stats: { accel: 1 }, grade: 'rare' },
  crown: { id: 'crown', name: '왕관 장식', emoji: '👑', cat: 'deco', desc: '고물왕의 증표', color: '#ffd35c', stats: { speed: 2, grip: 1 }, grade: 'legend' },

  // ─── 붓 (차량 뒤에 바닥을 향해 장착 — 페인트 범위를 결정) ───
  ballpen: { id: 'ballpen', name: '볼펜', emoji: '🖊️', cat: 'brush', desc: '가늘고 또렷한 선 — 가장 좁은 범위', color: '#3f51b5', stats: {}, grade: 'common', paintWidth: 0.72 },
  crayon: { id: 'crayon', name: '크레파스', emoji: '🖍️', cat: 'brush', desc: '거친 질감의 보통 선', color: '#ff7043', stats: {}, grade: 'common', paintWidth: 0.95 },
  thinbrush: { id: 'thinbrush', name: '얇은 붓', emoji: '🖌️', cat: 'brush', desc: '세필 붓 — 조금 좁지만 가벼움', color: '#8d6e4a', stats: { speed: 1 }, grade: 'rare', paintWidth: 1.0 },
  marker: { id: 'marker', name: '매직펜', emoji: '✒️', cat: 'brush', desc: '굵고 진한 선', color: '#2b2b30', stats: {}, grade: 'rare', paintWidth: 1.2 },
  widebrush: { id: 'widebrush', name: '넓은 붓', emoji: '🧹', cat: 'brush', desc: '한 번에 넓게 칠하는 평붓', color: '#c9a36a', stats: {}, grade: 'epic', paintWidth: 1.55 },
  roller: { id: 'roller', name: '페인트 롤러', emoji: '🪣', cat: 'brush', desc: '벽칠용 롤러 — 아주 넓은 범위', color: '#f06292', stats: { weight: 1 }, grade: 'epic', paintWidth: 1.85 },
  paintbucket: { id: 'paintbucket', name: '물감 통', emoji: '🎨', cat: 'brush', desc: '뒤로 물감을 줄줄 흘리는 전설의 붓', color: '#ffb703', stats: { weight: 1 }, grade: 'legend', paintWidth: 2.3 },
  chalk: { id: 'chalk', name: '분필', emoji: '🪧', cat: 'brush', desc: '뽀얗게 긁히는 분필 자국', color: '#f2efe4', stats: { weight: -1 }, grade: 'common', paintWidth: 0.85 },
  highlighter: { id: 'highlighter', name: '형광펜', emoji: '🖍️', cat: 'brush', desc: '쨍하게 번지는 형광 잉크', color: '#c6f24e', stats: { speed: 1 }, grade: 'rare', paintWidth: 1.1 },
  spongebrush: { id: 'spongebrush', name: '스펀지 붓', emoji: '🧽', cat: 'brush', desc: '물감을 머금어 폭신하게 찍는다', color: '#f6c35c', stats: {}, grade: 'rare', paintWidth: 1.35 },
  mop: { id: 'mop', name: '대걸레', emoji: '🧹', cat: 'brush', desc: '바닥을 쓸며 넓게 칠한다', color: '#7fb6d8', stats: { weight: 1 }, grade: 'epic', paintWidth: 2.0 },
  spraycan: { id: 'spraycan', name: '스프레이 캔', emoji: '🥫', cat: 'brush', desc: '안개처럼 흩뿌리는 전설의 분사', color: '#8f6fe0', stats: { speed: 1, weight: 1 }, grade: 'legend', paintWidth: 2.5 },
  // ─── 총 (차량 지붕에 장착 — 발사 버튼으로 사격) ───
  waterpistol: { id: 'waterpistol', name: '물총', emoji: '🔫', cat: 'gun', desc: '가볍고 시원하게 쏘는 3점사 물총', color: '#3fb6f0', stats: { weight: -1 }, grade: 'common', gun: { damage: 8, rate: 3.2, speed: 30, pellets: 1, spread: 0.04, life: 0.8, splash: 0, bulletColor: '#7fd8ff' } },
  rubbergun: { id: 'rubbergun', name: '고무줄 총', emoji: '🪢', cat: 'gun', desc: '나무젓가락에 고무줄을 건 단발총', color: '#c9a36a', stats: {}, grade: 'common', gun: { damage: 15, rate: 2.0, speed: 34, pellets: 1, spread: 0.02, life: 0.9, splash: 0, bulletColor: '#f5c242' } },
  slingshot: { id: 'slingshot', name: '새총', emoji: '🪃', cat: 'gun', desc: '묵직한 구슬을 날리는 Y자 새총', color: '#8d6e4a', stats: { accel: -1 }, grade: 'rare', gun: { damage: 24, rate: 1.4, speed: 32, pellets: 1, spread: 0.02, life: 1.1, splash: 0, bulletColor: '#c3ccd4' } },
  corkgun: { id: 'corkgun', name: '코르크 뽁총', emoji: '🍾', cat: 'gun', desc: '뽁! 소리와 함께 마개를 쏜다', color: '#e8705e', stats: {}, grade: 'rare', gun: { damage: 17, rate: 2.2, speed: 36, pellets: 1, spread: 0.03, life: 1.0, splash: 0, bulletColor: '#d2a56d' } },
  dartgun: { id: 'dartgun', name: '스펀지 다트건', emoji: '🎯', cat: 'gun', desc: '연사와 정확도를 모두 갖춘 다트건', color: '#ff8a3d', stats: { speed: 1 }, grade: 'epic', gun: { damage: 18, rate: 2.8, speed: 38, pellets: 1, spread: 0.015, life: 1.1, splash: 0, bulletColor: '#ff8a3d' } },
  peashotgun: { id: 'peashotgun', name: '콩알 샷건', emoji: '🫛', cat: 'gun', desc: '빨대 다발로 콩알을 흩뿌린다', color: '#6cc04a', stats: { weight: 1 }, grade: 'epic', gun: { damage: 9, rate: 1.4, speed: 30, pellets: 5, spread: 0.28, life: 0.6, splash: 0, bulletColor: '#8fdc5a' } },
  paintcannon: { id: 'paintcannon', name: '물감 대포', emoji: '💣', cat: 'gun', desc: '맞은 곳을 내 색으로 터뜨리는 전설의 대포', color: '#a66bff', stats: { weight: 1, speed: 1 }, grade: 'legend', gun: { damage: 38, rate: 1.0, speed: 28, pellets: 1, spread: 0.01, life: 1.3, splash: 2.6, bulletColor: '#ff5fa2' } },
};

export const ITEM_LIST = Object.values(ITEMS);

/** 붓이 없을 때 기본 페인트 폭 (아주 좁은 선 — 맨몸이면 발자국 수준) */
export const DEFAULT_PAINT_WIDTH = 0.55;

export interface ZoneDef {
  id: string;
  name: string;
  pos: [number, number];
  pool: string[];
  count: number;
  radius: number;
}

export const ZONES: ZoneDef[] = [
  { id: 'toybox', name: '장난감 상자', pos: [0, -22], pool: ['toywheel', 'toywheel', 'brick', 'motor', 'propeller', 'sticker', 'bell', 'button', 'card', 'balloon', 'crayon', 'waterpistol', 'dartgun'], count: 8, radius: 4.5 },
  { id: 'toolbox', name: '공구 상자', pos: [22, -8], pool: ['gear', 'gear', 'battery', 'wire', 'spray', 'plastic', 'rubber', 'rubber', 'clothespin', 'motor', 'roller', 'slingshot', 'corkgun'], count: 8, radius: 4.5 },
  { id: 'pot', name: '화분 주변', pos: [16, 17], pool: ['leaf', 'leaf', 'chopstick', 'toothpick', 'cap', 'cap', 'straw', 'rubberband', 'button', 'thinbrush', 'rubbergun', 'peashotgun'], count: 8, radius: 4.5 },
  { id: 'junk', name: '폐품 더미', pos: [-18, 15], pool: ['can', 'can', 'cap', 'cap', 'tub', 'straw', 'pencap', 'rubber', 'plastic', 'soap', 'windup', 'paintbucket', 'paintcannon'], count: 9, radius: 4.5 },
  { id: 'desk', name: '책상 구석', pos: [-23, -9], pool: ['eraser', 'matchbox', 'matchbox', 'popsicle', 'card', 'wire', 'button', 'pencap', 'rubberband', 'toywheel', 'ballpen', 'marker', 'widebrush'], count: 8, radius: 4.5 },
];

export interface CharacterDef {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'rabbit' | 'bear' | 'fox' | 'penguin' | 'deer' | 'hamster' | 'tanuki' | 'panda';
  fur: string;
  belly: string;
  accent: string;
  tagline: string;
  bonus: Partial<Stats>;
}

// 얼음땡(eska-start/ice) 동물마을 친구들 — palette identical to the original PAL table
export const CHARACTERS: CharacterDef[] = [
  { id: 'dog', name: '강아지', species: 'dog', fur: '#f0cf9a', belly: '#fff6e6', accent: '#a8733f', tagline: '뭐든 잘 주워오는 수집가', bonus: { speed: 1 } },
  { id: 'cat', name: '고양이', species: 'cat', fur: '#f6ae63', belly: '#fff1de', accent: '#d97d33', tagline: '코너링의 달인', bonus: { grip: 1 } },
  { id: 'rabbit', name: '토끼', species: 'rabbit', fur: '#fbf8f5', belly: '#ffffff', accent: '#f2d7d0', tagline: '가속이 빠른 깡충이', bonus: { accel: 1 } },
  { id: 'bear', name: '곰', species: 'bear', fur: '#a8763f', belly: '#efd2a6', accent: '#6b4522', tagline: '묵직하고 안정적', bonus: { grip: 1, weight: 1 } },
  { id: 'fox', name: '여우', species: 'fox', fur: '#f0873a', belly: '#fff8ee', accent: '#3b2a22', tagline: '날렵한 스피드광', bonus: { speed: 1 } },
  { id: 'penguin', name: '펭귄', species: 'penguin', fur: '#34466b', belly: '#ffffff', accent: '#ffb13b', tagline: '미끄러지듯 달리는 드리프터', bonus: { grip: 1 } },
  { id: 'deer', name: '사슴', species: 'deer', fur: '#cc955a', belly: '#f8e8d2', accent: '#7a5230', tagline: '점프 루트의 귀재', bonus: { boost: 1 } },
  { id: 'hamster', name: '햄스터', species: 'hamster', fur: '#f6c56e', belly: '#fff4de', accent: '#d8913a', tagline: '볼주머니 가득 고물 저장', bonus: { accel: 1 } },
  { id: 'tanuki', name: '너구리', species: 'tanuki', fur: '#9c8872', belly: '#f5e8d4', accent: '#3e3129', tagline: '고물상 단골 손님', bonus: { weight: 1, grip: 1 } },
  { id: 'panda', name: '판다', species: 'panda', fur: '#fbfbfb', belly: '#ffffff', accent: '#26262b', tagline: '느긋하지만 부스터는 화끈', bonus: { boost: 1 } },
];

export function pickWeighted<T>(arr: T[], rnd: () => number = Math.random): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/** 부품 등급 업그레이드 반영 — 기본 등급 + 업그레이드 단계 (최대 전설) */
export function upgradedGrade(base: Grade, level = 0): Grade {
  const i = Math.min(GRADE_ORDER.length - 1, GRADE_ORDER.indexOf(base) + Math.max(0, level));
  return GRADE_ORDER[i];
}
/** 업그레이드 단계에 따른 능력치 배율 (단계당 +35%) */
export const upgradeMul = (level = 0) => 1 + Math.max(0, level) * 0.35;
export const GUN_ITEMS = Object.values(ITEMS).filter((i) => i.cat === 'gun');
