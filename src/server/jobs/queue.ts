import { eq, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { jobs } from "@/db/schema";

/**
 * PostgreSQL 기반 경량 작업 큐
 *  - FOR UPDATE SKIP LOCKED 로 여러 워커가 동시에 안전하게 작업을 가져갑니다.
 *  - 실패 시 지수 백오프로 재시도, max_attempts 초과 시 failed.
 *  - 트랜잭션 안에서 enqueue 하므로 "핀은 저장됐는데 작업은 누락" 같은 불일치가 없습니다 (Transactional Outbox).
 */
export type JobType = "image.analyze" | "image.cleanup";

export interface ClaimedJob {
  id: number;
  type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
}

export async function enqueueJob(
  tx: DbOrTx,
  type: JobType,
  payload: Record<string, unknown>,
  opts: { runAt?: Date; maxAttempts?: number } = {},
): Promise<number> {
  const [row] = await tx
    .insert(jobs)
    .values({ type, payload, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 3 })
    .returning({ id: jobs.id });
  return row!.id;
}

/** 대기 중인 작업 하나를 원자적으로 점유합니다. id 를 지정하면 해당 작업만 점유를 시도합니다. */
export async function claimJob(specificId?: number): Promise<ClaimedJob | null> {
  const filter = specificId ? sql`and id = ${specificId}` : sql``;
  const res = await db.execute<{
    id: string | number;
    type: JobType;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
  }>(sql`
    update jobs set status = 'running', locked_at = now(), attempts = attempts + 1
    where id = (
      select id from jobs
      where status = 'pending' and run_at <= now() ${filter}
      order by run_at, id
      for update skip locked
      limit 1
    )
    returning id, type, payload, attempts, max_attempts
  `);
  const r = res.rows[0];
  if (!r) return null;
  return { id: Number(r.id), type: r.type, payload: r.payload, attempts: r.attempts, maxAttempts: r.max_attempts };
}

export async function completeJob(id: number) {
  await db.update(jobs).set({ status: "completed", completedAt: new Date(), lockedAt: null }).where(eq(jobs.id, id));
}

export async function failJob(job: ClaimedJob, err: unknown) {
  const message = err instanceof Error ? `${err.message}\n${err.stack ?? ""}`.slice(0, 4000) : String(err);
  const exhausted = job.attempts >= job.maxAttempts;
  const backoffSec = Math.min(3600, 2 ** job.attempts * 15);
  await db
    .update(jobs)
    .set({
      status: exhausted ? "failed" : "pending",
      lastError: message,
      lockedAt: null,
      runAt: exhausted ? undefined : new Date(Date.now() + backoffSec * 1000),
    })
    .where(eq(jobs.id, job.id));
}

/** 워커가 비정상 종료되어 running 상태로 남은 작업을 복구합니다. */
export async function recoverStaleJobs(staleMinutes = 10): Promise<number> {
  const res = await db.execute(sql`
    update jobs set status = 'pending', locked_at = null
    where status = 'running' and locked_at < now() - make_interval(mins => ${staleMinutes})
  `);
  return res.rowCount ?? 0;
}
