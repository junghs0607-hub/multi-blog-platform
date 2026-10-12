import { sql } from "drizzle-orm";
import { db } from "@/db";
import { apiRoute, json } from "@/server/http";

/** 헬스 체크: DB 연결 확인 */
export const GET = apiRoute(async () => {
  const started = Date.now();
  await db.execute(sql`select 1`);
  return json({ status: "ok", db: "ok", latencyMs: Date.now() - started, time: new Date().toISOString() });
});
