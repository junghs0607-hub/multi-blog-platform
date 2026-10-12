/**
 * 백그라운드 작업 워커 (JOB_MODE=worker 일 때 사용)
 *   npm run worker            # 상주 실행 (jobs 테이블 폴링)
 *   npm run worker -- --once  # 대기 작업을 모두 처리하고 종료 (cron 용)
 *
 * 여러 개를 동시에 띄워도 FOR UPDATE SKIP LOCKED 로 같은 작업을 중복 처리하지 않습니다.
 */
import "./load-env";
import { lt } from "drizzle-orm";
import { db, pool } from "@/db";
import { sessions } from "@/db/schema";
import { recoverStaleJobs } from "@/server/jobs/queue";
import { processPendingJobs } from "@/server/jobs/runner";

const ONCE = process.argv.includes("--once");
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
let running = true;

const stop = () => {
  if (running) console.log("\n⏹  종료 요청 수신, 현재 작업 완료 후 종료합니다...");
  running = false;
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function maintenance() {
  const recovered = await recoverStaleJobs();
  const expired = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  if (recovered || expired.length) console.log(`🧽 정리: 복구된 작업 ${recovered}개, 만료 세션 ${expired.length}개 삭제`);
}

async function main() {
  console.log(`🛠  Mosaic worker 시작 (poll ${POLL_MS}ms${ONCE ? ", --once" : ""})`);
  let lastMaintenance = 0;
  while (running) {
    if (Date.now() - lastMaintenance > 60_000) {
      await maintenance().catch((err) => console.error("maintenance error:", err));
      lastMaintenance = Date.now();
    }
    const n = await processPendingJobs(10);
    if (n > 0) console.log(`✅ ${n}개 작업 처리`);
    if (n === 0) {
      if (ONCE) break;
      await sleep(POLL_MS);
    }
  }
  await pool.end();
  console.log("👋 worker 종료");
}

main().catch((err) => {
  console.error("❌ worker 오류:", err);
  process.exit(1);
});
