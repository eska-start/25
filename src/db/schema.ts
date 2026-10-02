import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** 멀티플레이 방 (대기실) */
export const rooms = pgTable("rooms", {
  code: text("code").primaryKey(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().default("waiting"), // waiting | playing
  mode: text("mode").notNull().default("ffa"), // ffa(개인전) | team(2:2 팀전)
  round: integer("round").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 방 참가자 */
export const roomPlayers = pgTable(
  "room_players",
  {
    id: text("id").primaryKey(),
    roomCode: text("room_code").notNull().references(() => rooms.code, { onDelete: "cascade" }),
    name: text("name").notNull(),
    characterId: text("character_id").notNull(),
    color: text("color").notNull(),
    team: integer("team").notNull().default(0), // 팀전: 0 = A팀, 1 = B팀
    ready: boolean("ready").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("room_players_room_idx").on(t.roomCode)],
);

/** 대기실 채팅 */
export const roomMessages = pgTable(
  "room_messages",
  {
    id: serial("id").primaryKey(),
    roomCode: text("room_code").notNull().references(() => rooms.code, { onDelete: "cascade" }),
    playerId: text("player_id"),
    name: text("name").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("room_messages_room_idx").on(t.roomCode)],
);

/** 배틀 중 실시간 차량 상태 (서버 인스턴스가 여러 개여도 동작하도록 DB에 저장) */
export const roomStates = pgTable(
  "room_states",
  {
    playerId: text("player_id").primaryKey(),
    roomCode: text("room_code").notNull(),
    state: jsonb("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("room_states_room_idx").on(t.roomCode)],
);
