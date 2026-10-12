import { getViewer } from "@/server/auth/session";
import { apiRoute, Errors, json } from "@/server/http";
import { listBoardsForUser } from "@/server/services/boards";
import { getProfile } from "@/server/services/users";

/** 사용자의 보드 목록 (비공개 보드는 본인/관리자에게만) */
export const GET = apiRoute<{ username: string }>(async (_req, ctx) => {
  const { username } = await ctx.params;
  const viewer = await getViewer();
  const profile = await getProfile(decodeURIComponent(username), viewer);
  if (!profile) throw Errors.notFound("사용자를 찾을 수 없습니다.");
  return json({ items: await listBoardsForUser(profile.id, viewer) });
});
