import { analyzeImage } from "@/server/ai/pipeline";
import { cleanupImageIfOrphan } from "@/server/services/images";
import { claimJob, completeJob, failJob, type ClaimedJob, type JobType } from "./queue";

const handlers: Record<JobType, (payload: Record<string, unknown>) => Promise<void>> = {
  "image.analyze": async (p) => analyzeImage(Number(p.imageId)),
  "image.cleanup": async (p) => {
    await cleanupImageIfOrphan(Number(p.imageId));
  },
};

export async function runJob(job: ClaimedJob): Promise<boolean> {
  const handler = handlers[job.type];
  try {
    if (!handler) throw new Error(`알 수 없는 작업 유형: ${job.type}`);
    await handler(job.payload);
    await completeJob(job.id);
    return true;
  } catch (err) {
    console.error(`[jobs] #${job.id} ${job.type} 실패 (시도 ${job.attempts}/${job.maxAttempts}):`, err);
    await failJob(job, err);
    return false;
  }
}

/** 특정 작업을 즉시 실행 (inline 모드). 다른 워커가 이미 가져갔다면 아무것도 하지 않습니다. */
export async function runJobById(id: number): Promise<void> {
  const job = await claimJob(id);
  if (job) await runJob(job);
}

/** 대기 중인 작업을 최대 max 개까지 처리 */
export async function processPendingJobs(max = 20): Promise<number> {
  let processed = 0;
  while (processed < max) {
    const job = await claimJob();
    if (!job) break;
    await runJob(job);
    processed += 1;
  }
  return processed;
}
