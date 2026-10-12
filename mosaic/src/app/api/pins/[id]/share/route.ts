import { getViewer } from "@/server/auth/session";
import { apiRoute, getClientIp, json, parseId, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { recordShare } from "@/server/services/pins";
import { shareSchema } from "@/server/validation";

/** 공유 기록 (공유 수 집계). 동일 IP·핀 기준 10분에 1회만 집계 */
export const POST = apiRoute<{ id: string }>(async (req, ctx) => {
  const id = parseId((await ctx.params).id);
  await readJson(req, shareSchema);
  const viewer = await getViewer();
  try {
    rateLimit(`share:${getClientIp(req)}:${id}`, 1, 10 * 60_000);
  } catch {
    return json({ counted: false });
  }
  return json({ counted: true, ...(await recordShare(id, viewer)) });
});
