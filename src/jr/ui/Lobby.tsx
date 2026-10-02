import { useCallback, useEffect, useRef, useState } from 'react';
import { CHARACTERS } from '../data/items';
import { useGame, MODE_LABEL, TEAM_LABEL, TEAM_COLORS, type GameMode } from '../store';
import { sfx } from '../game/audio';
import { CharacterFace } from './CharacterFace';
import { GameIcon } from './GameIcon';

export interface RoomPlayer { id: string; name: string; characterId: string; color: string; team: number; ready: boolean; isHost: boolean }
export interface RoomMessage { id: number; name: string; text: string; playerId: string | null; system: boolean }
export interface RoomData { code: string; hostId: string; status: string; mode: GameMode; round: number; maxPlayers: number; players: RoomPlayer[]; messages: RoomMessage[] }
interface SavedSession { code: string; playerId: string; seenRound: number }

const SESSION_KEY = 'jr-online-session';
const NAME_KEY = 'jr-player-name';

export function loadSession(): SavedSession | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as SavedSession | null; } catch { return null; }
}
function saveSession(s: SavedSession | null) {
  try { if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); } catch { /* optional */ }
}
/** 공유 링크(?room=CODE 또는 #room=CODE)에서 방 코드 읽기 */
export function roomFromUrl(): string | null {
  const q = new URLSearchParams(location.search).get('room');
  const h = /room=([A-Za-z0-9]+)/.exec(location.hash)?.[1];
  return (q ?? h ?? '').toUpperCase() || null;
}

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(data.error ?? '요청에 실패했습니다.'), { status: res.status });
  return data;
}

/** 게임 중에도 방 접속을 유지하는 하트비트 (App에서 사용) */
export function useOnlineHeartbeat() {
  const online = useGame((s) => s.online);
  useEffect(() => {
    if (!online) return;
    const ping = () => { void fetch(`/api/rooms/${online.code}?playerId=${online.playerId}`, { cache: 'no-store' }).catch(() => undefined); };
    const id = setInterval(ping, 8000);
    return () => clearInterval(id);
  }, [online]);
}

export function CopyButton({ value, label, icon }: { value: string; label: string; icon: 'copy' | 'link' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    sfx.click();
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const area = document.createElement('textarea');
        area.value = value; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.select(); document.execCommand('copy'); document.body.removeChild(area);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  };
  return <button type="button" className={`jr-copy-button ${copied ? 'done' : ''}`} onClick={copy}>
    <GameIcon name={copied ? 'check' : icon} size={15} />{copied ? '복사됨!' : label}
  </button>;
}

export function OnlineLobby({ onStarted }: { onStarted: () => void }) {
  const characterId = useGame((s) => s.characterId);
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } });
  const [joinCode, setJoinCode] = useState(() => roomFromUrl() ?? '');
  const [session, setSession] = useState<SavedSession | null>(loadSession);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState('');
  const chatList = useRef<HTMLUListElement>(null);
  const autoJoined = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const remember = (n: string) => { try { localStorage.setItem(NAME_KEY, n); } catch { /* optional */ } };
  const displayName = () => name.trim() || `레이서${Math.floor(Math.random() * 900 + 100)}`;

  const enterGame = useCallback((r: RoomData, s: SavedSession) => {
    const next = { ...s, seenRound: r.round };
    saveSession(next); setSession(next);
    const game = useGame.getState();
    const me = r.players.find((p) => p.id === s.playerId);
    if (me) { game.setCharacter(me.characterId); game.setPaintColor(me.color); }
    game.setOnline({ code: r.code, playerId: s.playerId, players: r.players.map((p) => ({ id: p.id, name: p.name, characterId: p.characterId, color: p.color, team: p.team })) });
    useGame.setState({ gameMode: r.mode });
    game.setLocalPlayers([], r.code);
    game.startCollect();
    onStarted();
  }, [onStarted]);

  const applyRoom = useCallback((r: RoomData) => {
    setRoom(r);
    const s = sessionRef.current;
    if (!s) return;
    if (!r.players.some((p) => p.id === s.playerId)) {
      saveSession(null); setSession(null); setRoom(null); useGame.getState().setOnline(null);
      setError('방에서 나가졌습니다.');
      return;
    }
    if (r.status === 'playing' && r.round > s.seenRound) enterGame(r, s);
  }, [enterGame]);

  // ── 폴링 ──
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await api<RoomData>(`/api/rooms/${session.code}?playerId=${session.playerId}`);
        if (alive) applyRoom(r);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (alive && (status === 404 || status === 403)) {
          saveSession(null); setSession(null); setRoom(null); useGame.getState().setOnline(null);
          setError((e as Error).message);
        }
      }
    };
    void poll();
    const id = setInterval(poll, 1000);
    return () => { alive = false; clearInterval(id); };
  }, [session, applyRoom]);

  useEffect(() => { chatList.current?.scrollTo({ top: chatList.current.scrollHeight }); }, [room?.messages.length]);

  const create = async () => {
    setBusy(true); setError(''); sfx.click();
    try {
      const n = displayName(); remember(n); setName(n);
      const r = await api<{ code: string; playerId: string }>('/api/rooms', { name: n, characterId, mode: useGame.getState().gameMode });
      const s = { code: r.code, playerId: r.playerId, seenRound: 0 };
      saveSession(s); setSession(s);
      history.replaceState(null, '', `${location.pathname}?room=${r.code}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const join = useCallback(async (codeArg?: string) => {
    const code = (codeArg ?? joinCode).trim().toUpperCase();
    if (!code) { setError('방 코드를 입력하세요.'); return; }
    setBusy(true); setError(''); sfx.click();
    try {
      const n = name.trim() || `레이서${Math.floor(Math.random() * 900 + 100)}`; remember(n); setName(n);
      const r = await api<{ code: string; playerId: string; round: number; room: RoomData }>(`/api/rooms/${code}`, { action: 'join', name: n, characterId });
      const s = { code: r.code, playerId: r.playerId, seenRound: r.round };
      saveSession(s); setSession(s); setRoom(r.room);
      history.replaceState(null, '', `${location.pathname}?room=${r.code}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [joinCode, name, characterId]);

  // 공유 링크로 들어오면 자동 입장
  useEffect(() => {
    const code = roomFromUrl();
    if (autoJoined.current || session || !code) return;
    autoJoined.current = true;
    void join(code);
  }, [session, join]);

  const act = async (body: Record<string, unknown>) => {
    if (!session) return;
    setError('');
    try {
      const r = await api<RoomData & { left?: boolean }>(`/api/rooms/${session.code}`, { ...body, playerId: session.playerId });
      if (r.left) return;
      applyRoom(r);
    } catch (e) { setError((e as Error).message); }
  };
  const leave = async () => {
    sfx.click();
    await act({ action: 'leave' });
    saveSession(null); setSession(null); setRoom(null); useGame.getState().setOnline(null);
    history.replaceState(null, '', location.pathname);
  };

  // ── 방 입장 전: 방 만들기 / 코드로 참가 ──
  if (!session) {
    return <div>
      <p className="jr-muted">방을 만들고 코드나 링크를 친구에게 보내세요. 최대 4명, 빈 자리는 AI가 채웁니다.</p>
      <div className="jr-lobby-field">
        <label htmlFor="jr-name">닉네임</label>
        <input id="jr-name" value={name} maxLength={12} placeholder="닉네임 (최대 12자)" onChange={(e) => setName(e.target.value)} />
      </div>
      <button className="jr-primary full" disabled={busy} onClick={create}>방 만들기<GameIcon name="arrow" /></button>
      <div className="jr-lobby-divider">또는 코드로 참가</div>
      <div className="jr-lobby-join">
        <input value={joinCode} maxLength={8} placeholder="CODE" aria-label="방 코드" onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') void join(); }} />
        <button disabled={busy} onClick={() => void join()}>참가</button>
      </div>
      {error && <p className="jr-lobby-error">{error}</p>}
    </div>;
  }

  if (!room) return <p className="jr-lobby-status">대기실에 연결하는 중…</p>;

  const me = room.players.find((p) => p.id === session.playerId);
  const isHost = room.hostId === session.playerId;
  const others = room.players.filter((p) => p.id !== room.hostId);
  const allReady = others.every((p) => p.ready);
  const playing = room.status === 'playing';
  const link = `${location.origin}${location.pathname}?room=${room.code}`;

  const seat = (p: RoomPlayer) => {
    const ch = CHARACTERS.find((c) => c.id === p.characterId) ?? CHARACTERS[0];
    return <div key={p.id} className={`jr-lobby-seat ${p.id === session.playerId ? 'me' : ''}`}>
      <i className="dot" style={{ background: room.mode === 'team' ? TEAM_COLORS[p.team] : p.color }} />
      <CharacterFace species={ch.species} size={36} />
      <div className="info">
        <strong>{p.name}{p.id === session.playerId ? ' (나)' : ''}</strong>
        <small>{ch.name}</small>
        <span>
          {p.isHost ? <span className="badge host">방장</span> : <span className={`badge ${p.ready ? 'ready' : ''}`}>{p.ready ? '준비 완료' : '대기 중'}</span>}
          {isHost && !p.isHost && <button className="badge" style={{ border: 0, marginLeft: 4 }} onClick={() => void act({ action: 'kick', targetId: p.id })}>강퇴</button>}
        </span>
      </div>
    </div>;
  };

  return <div>
    <div className="jr-room-code">
      <span>ROOM CODE</span>
      <strong>{room.code}</strong>
      <small>{room.players.length} / {room.maxPlayers} PLAYERS · {MODE_LABEL[room.mode]} · {playing ? '게임 진행 중' : '대기 중'}</small>
      <div className="jr-room-share">
        <CopyButton value={room.code} label="코드 복사" icon="copy" />
        <CopyButton value={link} label="초대 링크 복사" icon="link" />
      </div>
    </div>

    <div className="jr-mode-switch" role="group" aria-label="게임 모드">
      {(['ffa', 'team'] as GameMode[]).map((m) => <button key={m} className={room.mode === m ? 'active' : ''} disabled={!isHost || playing} onClick={() => { sfx.click(); if (room.mode !== m) void act({ action: 'mode', mode: m }); }}>{MODE_LABEL[m]}</button>)}
    </div>
    {!isHost && <p className="jr-lobby-status" style={{ marginTop: 0 }}>게임 모드는 방장이 정해요 · 현재 {MODE_LABEL[room.mode]}</p>}

    {room.mode === 'team' ? (
      <div className="jr-lobby-teams">
        {[0, 1].map((t) => {
          const members = room.players.filter((p) => p.team === t);
          const canJoin = members.length < 2 && me?.team !== t && !playing;
          return <div key={t} className="jr-lobby-team" style={{ borderColor: TEAM_COLORS[t] }}>
            <div className="jr-lobby-team-head" style={{ background: TEAM_COLORS[t] }}>
              <strong>{TEAM_LABEL[t]}</strong><small>{members.length} / 2</small>
              {canJoin && <button onClick={() => { sfx.click(); void act({ action: 'team', team: t }); }}>이 팀으로 이동</button>}
            </div>
            {Array.from({ length: 2 }, (_, i) => members[i] ? seat(members[i]) : <div key={i} className="jr-lobby-seat empty">빈 자리 · AI</div>)}
          </div>;
        })}
      </div>
    ) : (
      <div className="jr-lobby-players">
        {Array.from({ length: room.maxPlayers }, (_, i) => room.players[i] ? seat(room.players[i]) : <div key={i} className="jr-lobby-seat empty">빈 자리 · AI</div>)}
      </div>
    )}

    <div className="jr-lobby-field">
      <label htmlFor="jr-char">내 캐릭터</label>
      <select id="jr-char" value={me?.characterId ?? characterId} disabled={Boolean(me?.ready) || playing} onChange={(e) => { useGame.getState().setCharacter(e.target.value); void act({ action: 'update', characterId: e.target.value }); }}>
        {CHARACTERS.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.tagline}</option>)}
      </select>
    </div>

    <div className="jr-lobby-chat">
      <ul ref={chatList}>
        {room.messages.map((m) => <li key={m.id} className={m.system ? 'sys' : ''}>{m.system ? `· ${m.text}` : <><b style={{ color: room.players.find((p) => p.id === m.playerId)?.color ?? '#203c35' }}>{m.name}</b>{m.text}</>}</li>)}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (chat.trim()) { void act({ action: 'chat', text: chat }); setChat(''); } }}>
        <input value={chat} maxLength={120} placeholder="메시지 입력…" onChange={(e) => setChat(e.target.value)} />
        <button type="submit">전송</button>
      </form>
    </div>

    {playing ? (
      <>
        <p className="jr-lobby-status">{isHost ? '게임이 진행 중입니다. 모두 끝났다면 대기실로 돌려주세요.' : '게임이 진행 중입니다. 방장이 대기실로 돌리면 다시 준비할 수 있어요.'}</p>
        {isHost && <button className="jr-primary full" onClick={() => { sfx.click(); void act({ action: 'reset' }); }}>대기실로 돌아가기<GameIcon name="arrow" /></button>}
      </>
    ) : isHost ? (
      <button className="jr-primary full" disabled={!allReady} onClick={() => { sfx.click(); void act({ action: 'start' }); }}>
        {allReady ? (room.players.length > 1 ? '게임 시작' : '혼자 시작 (AI와 대결)') : '모두 준비하면 시작할 수 있어요'}<GameIcon name="arrow" />
      </button>
    ) : (
      <button className={`jr-lobby-btn full ${me?.ready ? '' : 'ready'}`} style={{ width: '100%' }} onClick={() => { sfx.click(); void act({ action: 'update', ready: !me?.ready }); }}>
        {me?.ready ? '준비 취소' : '준비 완료'}
      </button>
    )}
    <div className="jr-lobby-actions" style={{ marginTop: 10 }}>
      <button className="jr-lobby-btn ghost" onClick={leave}>방 나가기</button>
    </div>
    {error && <p className="jr-lobby-error">{error}</p>}
  </div>;
}
