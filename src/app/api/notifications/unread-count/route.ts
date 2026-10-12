import { getViewer } from "@/server/auth/session";
import { apiRoute, json } from "@/server/http";
import { unreadCount } from "@/server/services/notifications";

/** 읽지 않은 알림 수 (헤더 배지 폴링용, 부분 인덱스 사용) */
export const GET = apiRoute(async () => {
  const viewer = await getViewer();
  return json({ count: viewer ? await unreadCount(viewer) : 0 });
});
