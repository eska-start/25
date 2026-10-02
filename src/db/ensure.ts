import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * 새 DB(배포 환경)에서도 별도 마이그레이션 없이 동작하도록
 * 처음 한 번 테이블/컬럼을 보장한다. (idempotent)
 */
const g = globalThis as typeof globalThis & { __jrSchemaReady?: Promise<void> };

async function run() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS rooms (
    code text PRIMARY KEY,
    host_id text NOT NULL,
    status text NOT NULL DEFAULT 'waiting',
    mode text NOT NULL DEFAULT 'ffa',
    round integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'ffa'`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS room_players (
    id text PRIMARY KEY,
    room_code text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    name text NOT NULL,
    character_id text NOT NULL,
    color text NOT NULL,
    team integer NOT NULL DEFAULT 0,
    ready boolean NOT NULL DEFAULT false,
    joined_at timestamptz NOT NULL DEFAULT now(),
    last_seen timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`ALTER TABLE room_players ADD COLUMN IF NOT EXISTS team integer NOT NULL DEFAULT 0`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS room_players_room_idx ON room_players (room_code)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS room_messages (
    id serial PRIMARY KEY,
    room_code text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    player_id text,
    name text NOT NULL,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS room_messages_room_idx ON room_messages (room_code)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS room_states (
    player_id text PRIMARY KEY,
    room_code text NOT NULL,
    state jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS room_states_room_idx ON room_states (room_code)`);
  // 오래된 방 정리 (24시간 이상 갱신 없음)
  await db.execute(sql`DELETE FROM rooms WHERE updated_at < now() - interval '24 hours'`);
  await db.execute(sql`DELETE FROM room_states WHERE updated_at < now() - interval '1 hour'`);
}

export function ensureSchema(): Promise<void> {
  if (!g.__jrSchemaReady) {
    g.__jrSchemaReady = run().catch((e) => {
      g.__jrSchemaReady = undefined; // 다음 요청에서 재시도
      throw e;
    });
  }
  return g.__jrSchemaReady;
}
