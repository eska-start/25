import { NextResponse } from "next/server";
import { cleanCharacter, cleanName, getRoom, joinRoom, normCode, roomAction, RoomError } from "@/lib/rooms";

export const dynamic = "force-dynamic";

function fail(e: unknown) {
  const status = e instanceof RoomError ? e.status : 500;
  if (!(e instanceof RoomError)) console.error(e);
  return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status });
}

/** 방 정보 조회 (폴링) — playerId를 주면 접속 유지 처리 */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    const { code } = await ctx.params;
    const playerId = new URL(req.url).searchParams.get("playerId");
    return NextResponse.json(await getRoom(normCode(code), playerId));
  } catch (e) {
    return fail(e);
  }
}

/** 참가 / 준비 / 채팅 / 시작 / 나가기 등 */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    const { code: raw } = await ctx.params;
    const code = normCode(raw);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === "join") {
      const joined = await joinRoom(code, cleanName(body.name), cleanCharacter(body.characterId));
      return NextResponse.json({ ...joined, room: await getRoom(code, joined.playerId) });
    }
    return NextResponse.json(await roomAction(code, body));
  } catch (e) {
    return fail(e);
  }
}
