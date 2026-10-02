import { NextResponse } from "next/server";
import { cleanCharacter, cleanMode, cleanName, createRoom, RoomError } from "@/lib/rooms";

export const dynamic = "force-dynamic";

/** 방 만들기 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createRoom(cleanName(body.name), cleanCharacter(body.characterId), cleanMode(body.mode));
    return NextResponse.json(result);
  } catch (e) {
    const status = e instanceof RoomError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status });
  }
}
