import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureSchema(); // 새 DB라면 멀티플레이 테이블을 자동 생성
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
