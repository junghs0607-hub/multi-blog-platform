import { after } from "next/server";
import { env } from "@/server/env";
import { processPendingJobs, runJobById } from "./runner";

/**
 * JOB_MODE=inline 일 때: 응답을 보낸 직후(after) 같은 프로세스에서 작업을 실행합니다.
 * JOB_MODE=worker 일 때: 아무것도 하지 않고 별도 워커(npm run worker)가 처리합니다.
 */
export function scheduleJobs(jobIds: number[]) {
  if (env.JOB_MODE !== "inline" || jobIds.length === 0) return;
  after(async () => {
    for (const id of jobIds) {
      await runJobById(id).catch((err) => console.error("[jobs] inline run failed:", err));
    }
    // 서버 재시작 등으로 밀려있던 작업도 조금씩 처리
    await processPendingJobs(5).catch(() => undefined);
  });
}
