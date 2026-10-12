import { getViewer } from "@/server/auth/session";
import { apiRoute, Errors, json } from "@/server/http";
import { getProfile } from "@/server/services/users";

/** 공개 프로필 */
export const GET = apiRoute<{ username: string }>(async (_req, ctx) => {
  const { username } = await ctx.params;
  const profile = await getProfile(decodeURIComponent(username), await getViewer());
  if (!profile) throw Errors.notFound("사용자를 찾을 수 없습니다.");
  return json({ user: profile });
});
