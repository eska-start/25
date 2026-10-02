import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { normCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

interface Row extends Record<string, unknown> {
  player_id: string;
  state: Record<string, unknown>;
  t: string | number;
  now: string | number;
}

/**
 * 실시간 차량 상태 교환 (120ms 폴링).
 * 서버 인스턴스가 여러 개이거나 서버리스여도 동작하도록 DB(jsonb)에 저장한다.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/state">) {
  try {
    await ensureSchema();
    const { code: raw } = await ctx.params;
    const code = normCode(raw);
    const body = (await req.json().catch(() => ({}))) as { playerId?: string; state?: Record<string, unknown> };
    const me = typeof body.playerId === "string" ? body.playerId.slice(0, 64) : "";
    if (me && body.state && typeof body.state === "object") {
      const json = JSON.stringify(body.state);
      if (json.length < 20_000) {
        await db.execute(sql`
          INSERT INTO room_states (player_id, room_code, state, updated_at)
          VALUES (${me}, ${code}, ${json}::jsonb, now())
          ON CONFLICT (player_id) DO UPDATE
            SET state = room_states.state || EXCLUDED.state, room_code = EXCLUDED.room_code, updated_at = now()`);
      }
    }
    const res = await db.execute<Row>(sql`
      SELECT player_id, state,
             (extract(epoch from updated_at) * 1000)::bigint AS t,
             (extract(epoch from now()) * 1000)::bigint AS now
      FROM room_states
      WHERE room_code = ${code} AND player_id <> ${me} AND updated_at > now() - interval '30 seconds'`);
    const states: Record<string, unknown> = {};
    let now = Date.now();
    for (const r of res.rows) {
      now = Number(r.now);
      states[r.player_id] = { ...r.state, t: Number(r.t) };
    }
    return NextResponse.json({ states, now });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ states: {}, now: Date.now() }, { status: 200 });
  }
}
