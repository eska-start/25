import { useState } from 'react';
import { CHARACTERS, ITEMS, CATEGORY_LABEL, GRADE_COLOR, GRADE_LABEL, GRADE_SPEED, type Category } from '../data/items';
import { useGame, SLOT_CATEGORY, SLOT_LABEL, PLAYER_COLORS, MODE_LABEL, type GameMode, type Slot, type LocalPlayer } from '../store';
import { sfx } from '../game/audio';
import { MenuShowroom } from '../three/MenuShowroom';
import { CharacterFace } from './CharacterFace';
import { GameIcon, type IconName } from './GameIcon';
import { Modal } from './Modal';
import { PartPreview } from './PartPreview';
import { CopyButton, OnlineLobby, loadSession, roomFromUrl } from './Lobby';

const MENU: { id: string; icon: IconName; en: string; ko: string }[] = [
  { id: 'start', icon: 'play', en: 'GAME START', ko: '게임 시작' },
  { id: 'multi', icon: 'people', en: 'MULTIPLAYER', ko: '멀티플레이' },
  { id: 'parts', icon: 'parts', en: 'PARTS', ko: '부품 도감' },
  { id: 'customize', icon: 'paint', en: 'CUSTOMIZE', ko: '차량 꾸미기' },
  { id: 'settings', icon: 'settings', en: 'SETTINGS', ko: '설정' },
];
function CharacterPicker({ onClose }: { onClose: () => void }) {
  const current = useGame((s) => s.characterId), select = useGame((s) => s.setCharacter);
  return <Modal title="작은 레이서, 큰 개성." label="CHOOSE YOUR RACER" onClose={onClose} wide>
    <p className="jr-muted">얼음땡 동물마을의 친구들. 당신의 레이서는 누구인가요?</p>
    <div className="jr-character-grid">
      {CHARACTERS.map((c) => <button key={c.id} className={`jr-character-option ${current === c.id ? 'selected' : ''}`} aria-pressed={current === c.id} onClick={() => { sfx.click(); select(c.id); onClose(); }}>
        <span className="jr-character-face" style={{ background: c.belly }}><CharacterFace species={c.species} size={70} /></span>
        <strong>{c.name}</strong><span>{c.tagline}</span>
        {current === c.id && <i className="jr-selected-dot" />}
      </button>)}
    </div>
  </Modal>;
}
function PartsCatalog({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<Category>('wheel');
  return <Modal title="고물도 다 쓸모가 있어요." label="PARTS COLLECTION" onClose={onClose} wide>
    <p className="jr-muted">15초 동안 수집한 부품만 실제 배틀 차량에 장착할 수 있습니다.</p>
    <div className="jr-tabs" role="tablist">{(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => <button key={cat} role="tab" aria-selected={category === cat} className={cat === category ? 'active' : ''} onClick={() => setCategory(cat)}>{CATEGORY_LABEL[cat]}</button>)}</div>
    {category === 'brush' && <p className="jr-muted" style={{ marginTop: -8 }}>붓은 차량 뒤에 바닥을 향해 달립니다. 넓고 등급이 높을수록 지나간 자리에 페인트가 넓게 남아요.</p>}
    <div className="jr-catalog-list">{Object.values(ITEMS).filter((i) => i.cat === category).map((item) => <div key={item.id}>
      <PartPreview itemId={item.id} />
      <div><strong>{item.name} <em className="jr-grade" style={{ color: GRADE_COLOR[item.grade] }}>{GRADE_LABEL[item.grade]}</em></strong><p>{item.desc}{item.paintWidth ? ` · 페인트 폭 ×${item.paintWidth.toFixed(2)}` : ''} · 속도 +{GRADE_SPEED[item.grade]}</p></div>
    </div>)}</div>
  </Modal>;
}
function Customize({ onClose }: { onClose: () => void }) {
  const garage = useGame((s) => s.garage), customize = useGame((s) => s.customizeGarage);
  const color = useGame((s) => s.paintColor), setColor = useGame((s) => s.setPaintColor);
  const [slot, setSlot] = useState<Slot | number>('body');
  const cat = typeof slot === 'number' ? 'wheel' : SLOT_CATEGORY[slot];
  const uid = typeof slot === 'number' ? garage.build.wheels[slot] : garage.build.slots[slot];
  const current = uid != null ? garage.items[uid] : null;
  return <Modal title="내 고물차의 새로운 모습." label="THE LITTLE GARAGE" onClose={onClose} wide>
    <div className="jr-paint-picker"><span>내 페인트 색</span>{PLAYER_COLORS.map((c, i) => <button key={c} aria-label={['코랄', '민트', '블루', '허니'][i]} aria-pressed={color === c} className={color === c ? 'selected' : ''} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
    <div className="jr-tabs">{(Object.keys(SLOT_LABEL) as Slot[]).map((s) => <button key={s} className={slot === s ? 'active' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}
      {[0, 1, 2, 3].map((i) => <button key={i} className={slot === i ? 'active' : ''} onClick={() => setSlot(i)}>바퀴 {i + 1}</button>)}
    </div>
    <div className="jr-part-options">
      <button className={current === null ? 'selected' : ''} onClick={() => customize(slot, null)}><span className="jr-part-color empty"><GameIcon name="close" /></span><strong>장착 안 함</strong></button>
      {Object.values(ITEMS).filter((i) => i.cat === cat).map((item) => <button key={item.id} className={current === item.id ? 'selected' : ''} onClick={() => { sfx.click(); customize(slot, item.id); }}>
        <PartPreview itemId={item.id} /><strong>{item.name} <em className="jr-grade" style={{ color: GRADE_COLOR[item.grade] }}>{GRADE_LABEL[item.grade]}</em></strong><small>{item.desc}</small>
      </button>)}
    </div>
    <p className="jr-footnote">쇼룸 전시는 바로 변경되고 저장됩니다. 실제 게임에서는 매 판 모은 부품으로 새로 조립합니다.</p>
  </Modal>;
}
function Settings({ onClose }: { onClose: () => void }) {
  const [muted, setMuted] = useState(sfx.muted);
  return <Modal title="내 방식으로 플레이." label="SETTINGS" onClose={onClose}>
    <button className="jr-setting" onClick={() => { sfx.init(); setMuted(sfx.toggleMute()); }}><span><GameIcon name={muted ? 'mute' : 'sound'} /> 배경음 / 효과음</span><strong>{muted ? 'OFF' : 'ON'}</strong></button>
    <button className="jr-setting" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); }}><span>전체 화면</span><GameIcon name="arrow" /></button>
    <div className="jr-help"><h3>부품 쟁탈전</h3><p>WASD / 방향키로 이동. Shift 또는 F로 돌진하면 상대가 부품을 흘립니다.</p><h3>페인트 영역 배틀</h3>
      <p>W / ↑ 가속 · S / ↓ 제동 및 후진<br />A / D 또는 ← / → 조향<br />Space(J) 발사 · Q 점프 · Shift 부스트 · E 아이템</p>
      <p>자동 전진은 없습니다. 가속에서 손을 떼면 자연스럽게 감속합니다. 모바일은 왼쪽 스틱으로 전후좌우 주행하고 오른쪽 아래에서 점프·부스트·아이템을 사용합니다.</p>
    </div>
  </Modal>;
}
function ModePick() {
  const mode = useGame((s) => s.gameMode), set = useGame((s) => s.setGameMode);
  return <div className="jr-mode-pick" role="group" aria-label="게임 모드">
    {(['ffa', 'team'] as GameMode[]).map((m) => <button key={m} className={mode === m ? 'active' : ''} onClick={() => { sfx.init(); sfx.click(); set(m); }}>
      {MODE_LABEL[m]}<small>{m === 'ffa' ? 'FREE FOR ALL' : '2 VS 2 TEAM'}</small>
    </button>)}
  </div>;
}
const SEAT_KEYS = ['방향키 / Enter 발사 / M', 'IJKL / U 발사 / P', '숫자패드 / 0 발사 / 7'];
const SEAT_CHARACTERS = ['cat', 'bear', 'hamster'];

function LocalMultiplayer({ onClose }: { onClose: () => void }) {
  const game = useGame.getState();
  const makeCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };
  // 방장은 모달을 여는 즉시 자기 방에 입장한다. 코드 입력 단계가 없다.
  const [code] = useState(makeCode);
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const localColors = [game.paintColor, ...PLAYER_COLORS.filter((c) => c !== game.paintColor)];
  const shareLink = `${location.origin}${location.pathname}#local=${code}`;
  const save = (next: LocalPlayer[]) => {
    setPlayers(next);
    try { localStorage.setItem(`junk-local-${code}`, JSON.stringify(next)); } catch { /* Optional storage. */ }
  };
  const addSeat = () => {
    if (players.length >= 3) return;
    sfx.click();
    save([...players, { name: `P${players.length + 2}`, characterId: SEAT_CHARACTERS[players.length] }]);
  };
  const mode = useGame((s) => s.gameMode);
  return <>
    <ModePick />
    {mode === 'team' && <p className="jr-footnote" style={{ margin: '8px 0 0' }}>팀전: P1·P2가 A팀, P3·P4(또는 AI)가 B팀이 됩니다. 아군에게는 피해를 주지 않고, 같은 팀 색으로 영역을 함께 칠해요.</p>}
    <p className="jr-muted" style={{ marginTop: 12 }}>같은 PC에서 키보드를 나눠 쓰는 로컬 2~4인 모드입니다. 빈 자리는 AI가 채웁니다.</p>

    <div className="jr-room-code">
      <span>ROOM CODE</span>
      <strong>{code}</strong>
      <small>{players.length + 1} / 4 PLAYERS · 방장으로 입장 완료</small>
      <div className="jr-room-share">
        <CopyButton value={code} label="코드 복사" icon="copy" />
        <CopyButton value={shareLink} label="게임 링크 복사" icon="link" />
      </div>
    </div>

    <div className="jr-local-player host">
      <i style={{ background: game.paintColor }} />
      <strong>P1</strong>
      <span>{CHARACTERS.find((c) => c.id === game.characterId)?.name} · 방장</span>
      <small>WASD / Space 발사 / E</small>
    </div>
    {players.map((p, i) => <div className="jr-local-player" key={i}>
      <i style={{ background: localColors[i + 1] }} />
      <strong>P{i + 2}</strong>
      <select value={p.characterId} aria-label={`P${i + 2} 캐릭터`} onChange={(e) => save(players.map((x, n) => n === i ? { ...x, characterId: e.target.value } : x))}>
        {CHARACTERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <small>{SEAT_KEYS[i]}</small>
    </div>)}

    <div className="jr-room-actions">
      <button disabled={players.length >= 3} onClick={addSeat}>+ 플레이어 추가</button>
      <button disabled={players.length === 0} onClick={() => { sfx.click(); save(players.slice(0, -1)); }}>마지막 플레이어 제거</button>
    </div>
    <button className="jr-primary full" disabled={players.length === 0} onClick={() => {
      sfx.click();
      game.setOnline(null);
      game.setLocalPlayers(players, code);
      game.startCollect();
      onClose();
    }}>{players.length === 0 ? '플레이어를 추가하세요' : '함께 시작하기'}<GameIcon name="arrow" /></button>
    <p className="jr-footnote">로컬 모드는 한 화면을 나눠 씁니다. 다른 기기와 함께하려면 온라인 대기실을 이용하세요.</p>
  </>;
}

function Multiplayer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'online' | 'local'>('online');
  return <Modal title={tab === 'online' ? '친구와 온라인 대전.' : '한 화면에서, 함께.'} label={tab === 'online' ? 'ONLINE LOBBY' : 'LOCAL MULTIPLAYER'} onClose={onClose}>
    <div className="jr-lobby-tabs">
      <button className={tab === 'online' ? 'active' : ''} onClick={() => setTab('online')}>온라인 대기실</button>
      <button className={tab === 'local' ? 'active' : ''} onClick={() => setTab('local')}>로컬 (한 PC)</button>
    </div>
    {tab === 'online' ? <OnlineLobby onStarted={onClose} /> : <LocalMultiplayer onClose={onClose} />}
  </Modal>;
}

export function SelectScreen() {
  const characterId = useGame((s) => s.characterId), color = useGame((s) => s.paintColor), garage = useGame((s) => s.garage);
  const ch = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  // 공유 링크(#room=코드)로 들어오면 멀티 화면을 바로 연다
  const [active, setActive] = useState('start');
  // 공유 링크(?room=코드)로 들어오거나, 온라인 방에 있는 상태로 메뉴에 돌아오면 대기실을 바로 연다
  const [dialog, setDialog] = useState<string | null>(() => (roomFromUrl() || loadSession() || /#local=/.test(location.hash) ? 'multi' : null));
  const activate = (id: string) => {
    sfx.init(); sfx.click(); setActive(id);
    if (id === 'start') { useGame.getState().setOnline(null); useGame.getState().setLocalPlayers([]); useGame.getState().startCollect(); }
    else setDialog(id);
  };
  const close = () => {
    setDialog(null);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  };
  return <main className="jr-main-menu">
    <section className="jr-showroom" aria-label="캐릭터와 고물 자동차 쇼룸"><MenuShowroom characterId={characterId} build={garage.build} items={garage.items} color={color} /></section>
    <aside className="jr-menu-sidebar">
      <header className="jr-menu-brand">
        <span className="jr-brand-en"><i />JUNK RACERS</span>
        <h1><span>고물</span><span className="jr-logo-last">레이서즈<span className="jr-logo-dot">.</span></span></h1>
        <p>작게 모으고, 크게 물들여라.</p>
      </header>
      <ModePick />
      <nav className="jr-main-nav" aria-label="메인 메뉴">
        {MENU.map((m, i) => <button key={m.id} className={`jr-menu-action ${active === m.id ? 'active' : ''} ${m.id === 'start' ? 'primary' : ''}`} onMouseEnter={() => setActive(m.id)} onFocus={() => setActive(m.id)} onClick={() => activate(m.id)}>
          <span className="jr-menu-icon"><GameIcon name={m.icon} size={m.id === 'start' ? 25 : 21} /></span>
          <span><strong>{m.ko}</strong><small>{m.en}</small></span>
          <span className="jr-menu-end">{active === m.id ? <GameIcon name="arrow" size={22} /> : <small>0{i + 1}</small>}</span>
        </button>)}
      </nav>
      <button className="jr-current-racer" onClick={() => { sfx.click(); setDialog('character'); }} aria-label="캐릭터 변경">
        <span className="jr-current-avatar"><CharacterFace species={ch.species} size={45} /></span>
        <span><small>YOUR LITTLE RACER</small><strong>{ch.name}<i style={{ background: color }} /></strong></span>
        <span className="jr-change-text">캐릭터 변경<GameIcon name="arrow" size={17} /></span>
      </button>
      <footer className="jr-menu-bottom"><span><i />ONLINE · LOCAL PLAY</span><span>15s 수집 · 90s 컬러 배틀</span></footer>
    </aside>
    {dialog === 'character' && <CharacterPicker onClose={close} />}
    {dialog === 'parts' && <PartsCatalog onClose={close} />}
    {dialog === 'customize' && <Customize onClose={close} />}
    {dialog === 'settings' && <Settings onClose={close} />}
    {dialog === 'multi' && <Multiplayer onClose={close} />}
  </main>;
}