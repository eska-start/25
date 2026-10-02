import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { roomMessages, roomPlayers, rooms } from "@/db/schema";
import { ensureSchema } from "@/db/ensure";

export const MAX_PLAYERS = 4;
export const PLAYER_COLORS = ["#f56a87", "#50ccb6", "#699cfa", "#ffc16b"];
const STALE_MS = 25_000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CHARACTER_IDS = ["dog", "cat", "rabbit", "bear", "fox", "penguin", "deer", "hamster", "tanuki", "panda"];

export class RoomError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const cleanMode = (m: unknown): "ffa" | "team" => (m === "team" ? "team" : "ffa");

export const makeCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const makeId = () => `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
export const normCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
export const cleanName = (name: unknown) => (typeof name === "string" ? name.trim().slice(0, 12) : "") || "레이서";
export const cleanCharacter = (id: unknown) => (typeof id === "string" && CHARACTER_IDS.includes(id) ? id : "dog");

async function systemMessage(code: string, text: string) {
  await db.insert(roomMessages).values({ roomCode: code, name: "SYSTEM", text });
}

export async function createRoom(name: string, characterId: string, mode: "ffa" | "team" = "ffa") {
  await ensureSchema();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode();
    const exists = await db.select({ code: rooms.code }).from(rooms).where(eq(rooms.code, code)).limit(1);
    if (exists.length) continue;
    const playerId = makeId();
    await db.insert(rooms).values({ code, hostId: playerId, mode });
    await db.insert(roomPlayers).values({ id: playerId, roomCode: code, name, characterId, color: PLAYER_COLORS[0], team: 0 });
    await systemMessage(code, `${name} 님이 방을 만들었습니다.`);
    return { code, playerId };
  }
  throw new RoomError("방 코드를 만들 수 없습니다. 다시 시도해 주세요.", 500);
}

/** 오래 응답 없는 참가자 정리 + 방장 위임 */
async function prune(code: string) {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await db.select().from(roomPlayers).where(and(eq(roomPlayers.roomCode, code), lt(roomPlayers.lastSeen, cutoff)));
  if (stale.length) {
    await db.delete(roomPlayers).where(and(eq(roomPlayers.roomCode, code), lt(roomPlayers.lastSeen, cutoff)));
    for (const p of stale) await systemMessage(code, `${p.name} 님의 연결이 끊어졌습니다.`);
  }
  await ensureHost(code);
}

async function ensureHost(code: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) return null;
  const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomCode, code)).orderBy(asc(roomPlayers.joinedAt));
  if (!players.length) {
    await db.delete(rooms).where(eq(rooms.code, code));
    return null;
  }
  if (!players.some((p) => p.id === room.hostId)) {
    await db.update(rooms).set({ hostId: players[0].id, updatedAt: new Date() }).where(eq(rooms.code, code));
    await systemMessage(code, `${players[0].name} 님이 새 방장이 되었습니다.`);
  }
  return room;
}

export async function getRoom(code: string, playerId?: string | null) {
  await ensureSchema();
  if (playerId) await db.update(roomPlayers).set({ lastSeen: new Date() }).where(and(eq(roomPlayers.id, playerId), eq(roomPlayers.roomCode, code)));
  await prune(code);
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new RoomError("존재하지 않거나 닫힌 방입니다.", 404);
  const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomCode, code)).orderBy(asc(roomPlayers.joinedAt));
  const messages = await db.select().from(roomMessages).where(eq(roomMessages.roomCode, code)).orderBy(desc(roomMessages.id)).limit(40);
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    mode: room.mode,
    round: room.round,
    maxPlayers: MAX_PLAYERS,
    players: players.map((p) => ({ id: p.id, name: p.name, characterId: p.characterId, color: p.color, team: p.team, ready: p.ready, isHost: p.id === room.hostId })),
    messages: messages.reverse().map((m) => ({ id: m.id, name: m.name, text: m.text, playerId: m.playerId, system: m.name === "SYSTEM" })),
  };
}

async function requirePlayer(code: string, playerId: unknown) {
  if (typeof playerId !== "string") throw new RoomError("참가자 정보가 없습니다.", 401);
  const [p] = await db.select().from(roomPlayers).where(and(eq(roomPlayers.id, playerId), eq(roomPlayers.roomCode, code))).limit(1);
  if (!p) throw new RoomError("이 방의 참가자가 아닙니다.", 403);
  return p;
}

export async function joinRoom(code: string, name: string, characterId: string) {
  await ensureSchema();
  await prune(code);
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new RoomError("존재하지 않는 방 코드입니다.", 404);
  const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomCode, code));
  if (players.length >= MAX_PLAYERS) throw new RoomError("방이 가득 찼습니다. (최대 4명)", 409);
  const color = PLAYER_COLORS.find((c) => !players.some((p) => p.color === c)) ?? PLAYER_COLORS[players.length % 4];
  // 인원이 적은 팀으로 자동 배정 (팀전이 아니어도 미리 균형 있게 배정해 둔다)
  const teamA = players.filter((p) => p.team === 0).length;
  const teamB = players.length - teamA;
  const team = teamA <= teamB ? 0 : 1;
  const playerId = makeId();
  await db.insert(roomPlayers).values({ id: playerId, roomCode: code, name, characterId, color, team });
  await systemMessage(code, `${name} 님이 입장했습니다.`);
  return { code, playerId, round: room.round };
}

export async function roomAction(code: string, body: Record<string, unknown>) {
  await ensureSchema();
  const action = body.action;
  const player = await requirePlayer(code, body.playerId);
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new RoomError("방이 닫혔습니다.", 404);
  const isHost = room.hostId === player.id;

  switch (action) {
    case "update": {
      const patch: Partial<typeof roomPlayers.$inferInsert> = { lastSeen: new Date() };
      if (typeof body.ready === "boolean") patch.ready = body.ready;
      if (body.characterId !== undefined) patch.characterId = cleanCharacter(body.characterId);
      if (body.name !== undefined) patch.name = cleanName(body.name);
      await db.update(roomPlayers).set(patch).where(eq(roomPlayers.id, player.id));
      break;
    }
    case "mode": {
      if (!isHost) throw new RoomError("방장만 게임 모드를 바꿀 수 있습니다.", 403);
      const mode = cleanMode(body.mode);
      await db.update(rooms).set({ mode, updatedAt: new Date() }).where(eq(rooms.code, code));
      if (mode === "team") {
        // 팀전으로 바꾸면 입장 순서대로 A/B 팀을 번갈아 배정
        const list = await db.select().from(roomPlayers).where(eq(roomPlayers.roomCode, code)).orderBy(asc(roomPlayers.joinedAt));
        for (let i = 0; i < list.length; i++) await db.update(roomPlayers).set({ team: i % 2, ready: false }).where(eq(roomPlayers.id, list[i].id));
      }
      await systemMessage(code, mode === "team" ? "게임 모드: 2:2 팀전" : "게임 모드: 개인전");
      break;
    }
    case "team": {
      if (room.mode !== "team") throw new RoomError("팀전 모드에서만 팀을 바꿀 수 있습니다.");
      if (room.status === "playing") throw new RoomError("게임 중에는 팀을 바꿀 수 없습니다.");
      const team = body.team === 1 ? 1 : 0;
      const list = await db.select().from(roomPlayers).where(eq(roomPlayers.roomCode, code));
      if (list.filter((p) => p.team === team && p.id !== player.id).length >= 2) throw new RoomError("그 팀은 가득 찼습니다. (팀당 최대 2명)", 409);
      await db.update(roomPlayers).set({ team, ready: isHost ? player.ready : false }).where(eq(roomPlayers.id, player.id));
      break;
    }
    case "chat": {
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 120) : "";
      if (text) await db.insert(roomMessages).values({ roomCode: code, playerId: player.id, name: player.name, text });
      break;
    }
    case "kick": {
      if (!isHost) throw new RoomError("방장만 내보낼 수 있습니다.", 403);
      if (typeof body.targetId === "string" && body.targetId !== player.id) {
        const [t] = await db.select().from(roomPlayers).where(and(eq(roomPlayers.id, body.targetId), eq(roomPlayers.roomCode, code))).limit(1);
        if (t) {
          await db.delete(roomPlayers).where(eq(roomPlayers.id, t.id));
          await systemMessage(code, `${t.name} 님이 강퇴되었습니다.`);
        }
      }
      break;
    }
    case "start": {
      if (!isHost) throw new RoomError("방장만 게임을 시작할 수 있습니다.", 403);
      const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomCode, code));
      if (room.mode === "team") {
        const a = players.filter((p) => p.team === 0).length;
        const b = players.length - a;
        if (a > 2 || b > 2) throw new RoomError("팀당 최대 2명입니다. 팀을 조정해 주세요.", 409);
      }
      const notReady = players.filter((p) => p.id !== player.id && !p.ready);
      if (notReady.length) throw new RoomError(`${notReady.map((p) => p.name).join(", ")} 님이 아직 준비하지 않았습니다.`, 409);
      await db.update(rooms).set({ status: "playing", round: sql`${rooms.round} + 1`, updatedAt: new Date() }).where(eq(rooms.code, code));
      await systemMessage(code, "게임이 시작되었습니다! 🏁");
      break;
    }
    case "reset": {
      if (!isHost) throw new RoomError("방장만 대기실로 돌릴 수 있습니다.", 403);
      await db.update(rooms).set({ status: "waiting", updatedAt: new Date() }).where(eq(rooms.code, code));
      await db.update(roomPlayers).set({ ready: false }).where(eq(roomPlayers.roomCode, code));
      await systemMessage(code, "대기실로 돌아왔습니다. 다시 준비해 주세요.");
      break;
    }
    case "leave": {
      await db.delete(roomPlayers).where(eq(roomPlayers.id, player.id));
      await systemMessage(code, `${player.name} 님이 나갔습니다.`);
      await ensureHost(code);
      return { left: true };
    }
    default:
      throw new RoomError("알 수 없는 요청입니다.");
  }
  return getRoom(code, player.id);
}
