import { requireViewer } from "@/server/auth/session";
import { apiRoute, json } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { followUser, unfollowUser } from "@/server/services/follows";

/** 팔로우 */
export const POST = apiRoute<{ username: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const { username } = await ctx.params;
  return json(await followUser(viewer, decodeURIComponent(username)));
});

/** 언팔로우 */
export const DELETE = apiRoute<{ username: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const { username } = await ctx.params;
  return json(await unfollowUser(viewer, decodeURIComponent(username)));
});
