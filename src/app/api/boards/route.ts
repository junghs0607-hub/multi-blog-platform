import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { createBoard, listMyBoardOptions } from "@/server/services/boards";
import { createBoardSchema } from "@/server/validation";

/** 내 보드 목록 (선택 상자용 요약) */
export const GET = apiRoute(async () => {
  const viewer = await requireViewer();
  return json({ items: await listMyBoardOptions(viewer) });
});

/** 보드 생성 */
export const POST = apiRoute(async (req) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const input = await readJson(req, createBoardSchema);
  return json({ board: await createBoard(viewer, input) }, 201);
});
