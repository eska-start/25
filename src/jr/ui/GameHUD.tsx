import { useEffect, useRef, useState } from 'react';
import { useGame, TEAM_LABEL } from '../store';
import { CHARACTERS } from '../data/items';
import { scramble } from '../three/ScrambleWorld';
import { battleHUD, BATTLE_ITEMS } from '../three/BattleWorld';
import { paintImageData } from '../game/paintView';
import { ARENA_SIZE, HALF } from '../game/battleMap';
import { TouchControls } from './TouchControls';
import { GameIcon } from './GameIcon';
import { CharacterFace } from './CharacterFace';

function useRefresh() {
  const [, setTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setTick((s) => s + 1), 80); return () => clearInterval(timer); }, []);
}
function HomeButton() {
  return <button className="jr-hud-home" aria-label="메인 메뉴로 나가기" onClick={() => useGame.getState().resetToSelect()}><GameIcon name="back" size={19} /><span>나가기</span></button>;
}

export function CollectHUD() {
  useRefresh();
  const characterId = useGame((s) => s.characterId), color = useGame((s) => s.paintColor);
  const ch = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const ready = scramble.phase === 'ready', outro = scramble.phase === 'outro';
  const sorted = [...scramble.board].sort((a, b) => b.count - a.count);
  return <div className="ui jr-game-hud">
    <header className="jr-hud-top">
      <div className="jr-hud-left"><HomeButton /><span className="jr-hud-stage">01 / SCRAP SCRAMBLE</span></div>
      <div className={`jr-round-timer ${scramble.remaining < 5 && !ready ? 'urgent' : ''}`}><span>부품 쟁탈전</span><strong>{Math.ceil(scramble.remaining)}</strong><small>SEC</small></div>
      <div className="jr-pick-count"><CharacterFace species={ch.species} size={43} /><div><small>머리 위 부품</small><strong>{scramble.count}<span>개</span></strong></div></div>
    </header>
    <div className="jr-collect-board">{sorted.map((r, i) => <div key={r.name} className={r.isPlayer ? 'me' : ''}><small>{i + 1}</small><i style={{ background: r.jersey }} /><span>{r.name}</span><strong>{r.count}</strong></div>)}</div>
    {scramble.toast && !outro && <div key={scramble.toast.id} className="jr-game-toast" style={{ color: scramble.toast.text.startsWith('-') ? '#ffadb6' : '#fff9dc' }}>{scramble.toast.text}</div>}
    {ready && <div className="jr-center-message jr-collect-intro"><span className="jr-eyebrow">15 SECONDS. GRAB WHAT YOU CAN.</span><h1>모으고, 쌓고, 지켜라!</h1><p>부품은 머리 위에 쌓입니다.<br />상대에게 돌진하면 부품이 떨어져요.</p><div className="jr-inline-controls"><kbd>WASD</kbd> 이동 <kbd>Shift / F</kbd> 돌진</div></div>}
    {outro && <div className="jr-center-message jr-scrap-result"><span className="jr-eyebrow">COLLECTION COMPLETE</span><h1>이제, 자동차를 만들어요.</h1><div>{sorted.map((r) => <p key={r.name}><i style={{ background: r.jersey }} />{r.name}<strong>{r.count}<small>개</small></strong></p>)}</div></div>}
    {!ready && !outro && <div className="jr-collect-caption"><i style={{ background: color }} />가진 부품이 많을수록, 상대의 표적이 됩니다.</div>}
    <TouchControls dash dashCd={scramble.dashCd} disabled={ready || outro} hint="WASD / 방향키 이동  ·  Shift / F 돌진  ·  부품은 자동 획득" />
  </div>;
}

function TerritoryMinimap() {
  const ref = useRef<HTMLCanvasElement>(null), lastVersion = useRef(-1);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  useRefresh();
  const map = battleHUD.paint;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    if (!bufferRef.current) {
      bufferRef.current = document.createElement('canvas');
      bufferRef.current.width = bufferRef.current.height = map.resolution;
    }
    const buffer = bufferRef.current;
    if (lastVersion.current !== map.version) {
      lastVersion.current = map.version;
      buffer.getContext('2d')!.putImageData(paintImageData(map), 0, 0);
    }
    ctx.clearRect(0, 0, 180, 180); ctx.drawImage(buffer, 0, 0, 180, 180);
    battleHUD.positions.forEach((p, i) => {
      const x = (p.x + HALF) / ARENA_SIZE * 180, y = (p.z + HALF) / ARENA_SIZE * 180;
      ctx.fillStyle = p.color; ctx.strokeStyle = i === battleHUD.focus ? '#fffef0' : '#223b32'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, i === battleHUD.focus ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (i === battleHUD.focus) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(p.heading) * 9, y + Math.cos(p.heading) * 9); ctx.stroke(); }
    });
  });
  return <div className="jr-territory-map"><canvas ref={ref} width={180} height={180} aria-label="현재 페인트 영역 지도" /><span>COLOR FACTORY</span></div>;
}
export function BattleHUD() {
  useRefresh();
  const h = battleHUD, me = h.scores[h.focus] ?? h.scores[0];
  const ready = h.phase === 'ready', finished = h.phase === 'finished';
  const secs = Math.ceil(h.remaining), time = `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;
  const sorted = [...h.scores].sort((a, b) => b.paint - a.paint);
  const item = h.item ? BATTLE_ITEMS[h.item] : null;
  return <div className="ui jr-game-hud jr-battle-hud">
    <header className="jr-hud-top">
      <div className="jr-hud-left"><HomeButton /><span className="jr-hud-stage">03 / PAINT TERRITORY</span></div>
      <div className={`jr-round-timer ${h.remaining <= 10 && !ready ? 'urgent' : ''}`}><span>페인트 배틀</span><strong>{time}</strong><small>남은 시간</small></div>
      <div className="jr-own-territory" style={{ color: me?.color ?? '#f56a87' }}><GameIcon name="paint" size={23} /><div><small>{h.mode === 'team' ? `${TEAM_LABEL[h.myTeam]}이 칠한 영역` : '내 색으로 칠한 영역'}</small><strong>{((me?.paint ?? 0) * 100).toFixed(1)}<span>%</span></strong></div></div>
    </header>
    <div className="jr-coverage-strip">{h.mode === 'team' ? h.teamScores.map((t) => <div key={t.team} style={{ width: `${t.paint * 100}%`, background: t.color }} />) : h.scores.map((s) => <div key={s.id} style={{ width: `${s.paint * 100}%`, background: s.color }} />)}</div>
    <div className="jr-right-col">
    <div className="jr-battle-board"><span className="jr-eyebrow">{h.mode === 'team' ? '2 VS 2 · TEAM TERRITORY' : 'LIVE TERRITORY'}</span>
      {h.mode === 'team' && <div className="jr-team-bar">{h.teamScores.map((t) => <div key={t.team} className={t.team === h.myTeam ? 'mine' : ''} style={{ background: t.color }}><b>{TEAM_LABEL[t.team]}</b><span>{(t.paint * 100).toFixed(1)}%</span></div>)}</div>}
      {sorted.map((s, i) => {
      const ch = CHARACTERS.find((c) => c.id === s.characterId) ?? CHARACTERS[0];
      return <button key={s.id} className={s.id === me?.id ? 'selected' : ''} onClick={() => { h.focus = h.scores.findIndex((x) => x.id === s.id); }} title="캐릭터 시점 보기"><small>{i + 1}</small><span className="jr-board-avatar"><CharacterFace species={ch.species} size={28} /></span><span><i style={{ background: s.color }} />{s.name}</span><strong>{(s.paint * 100).toFixed(1)}<small>%</small></strong></button>;
    })}</div>
    <TerritoryMinimap />
    </div>
    <div className="jr-left-col">
    <div className="jr-held-item"><div className={item ? 'loaded' : ''} style={{ borderColor: me?.color }}><GameIcon name={item?.icon ?? 'parts'} size={30} /><kbd>E</kbd></div><strong>{item?.name ?? '아이템 없음'}</strong>{item && <small>{item.desc}</small>}</div>
    <div className="jr-combat-panel" style={{ borderColor: me?.color }}>
      <div className="jr-combat-row"><GameIcon name="target" size={16} /><strong>{h.gunName ?? '맨손 (약함)'}</strong>{h.gunGrade && <em>{h.gunGrade}</em>}<kbd>Space</kbd></div>
      <div className="jr-combat-stats"><span>공격 {h.gunDamage.toFixed(0)}</span><span>연사 {h.gunRate.toFixed(1)}/s</span><span>부품 {h.partCount}</span></div>
      <div className={`jr-hp ${h.hp < 0.3 ? 'low' : ''}`}><small>내구도</small><i><b style={{ width: `${h.hp * 100}%` }} /></i></div>
      <div className="jr-combat-stats"><span>속도 {h.statSpeed.toFixed(1)}</span><span>가속 {h.statAccel.toFixed(1)}</span><span>접지 {(h.statGrip * 10).toFixed(1)}</span></div>
      <small className="jr-combat-tip">충돌/피격 시 부품이 빠져요 · 부품을 먹으면 장착 / 같은 종류는 등급 업</small>
    </div>
    </div>
    <div className="jr-speed-readout"><strong>{Math.round(Math.abs(h.speed) * 6)}</strong><small>km/h</small><div><GameIcon name="boost" size={15} /><i><b style={{ width: `${h.boost * 100}%`, background: me?.color }} /></i></div>
      <div className="jr-brush-readout"><GameIcon name="paint" size={13} /><span>{h.onFoot ? '맨몸 · ' : ''}{h.brushName ?? '붓 없음'}</span><em>폭 ×{h.paintWidth.toFixed(2)}</em></div>
    </div>
    {ready && <div className="jr-center-message jr-battle-intro"><span className="jr-eyebrow">NO FINISH LINE. JUST YOUR COLOR.</span><h1 key={h.countdown} className="jr-countdown-number">{h.countdown}</h1><p>90초 후, 가장 넓게 칠한 플레이어가 승리합니다.</p><div className="jr-inline-controls"><kbd>W / ↑</kbd> 가속 <kbd>Space</kbd> 발사 <kbd>Q</kbd> 점프 <kbd>E</kbd> 아이템</div><p className="jr-mobile-guide">모바일: 왼쪽 스틱으로 주행 · 오른쪽 버튼으로 발사 / 점프 / 부스트 / 아이템</p></div>}
    {!ready && h.elapsed < 1 && <div className="jr-center-message"><h1 className="jr-countdown-number">PAINT!</h1></div>}
    {!ready && !finished && Math.abs(h.speed) < 0.25 && h.throttle <= 0 && h.elapsed > 1 && <div className="jr-accelerate-prompt"><GameIcon name="play" size={18} />스틱을 위로 밀거나 W / ↑로 출발하세요</div>}
    {h.message && !ready && !finished && <div key={h.message.id} className="jr-game-toast">{h.message.text}</div>}
    {finished && <div className="jr-center-message"><span className="jr-eyebrow">BRUSHES DOWN</span><h1>TIME'S UP!</h1><p>최종 페인트 면적을 집계했습니다.</p></div>}
    <TouchControls mode="drive" boost fire item={item?.icon ?? null} disabled={ready || finished} hint="W / ↑ 가속 · S / ↓ 제동 / 후진 · A / D 조향 · Space(J) 발사 · Q 점프 · Shift 부스트 · E 아이템" />
  </div>;
}