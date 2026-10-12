import { z } from "zod";
import { getViewer, requireViewer } from "@/server/auth/session";
import { apiRoute, json, parseId, readJson, readQuery } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { listBoardPins, savePinToBoard } from "@/server/services/boards";
import { boardPinSchema, cursorSchema, limitSchema } from "@/server/validation";

const querySchema = z.object({ cursor: cursorSchema, limit: limitSchema(25, 50) });

/** 보드에 저장된 핀 목록 */
export const GET = apiRoute<{ id: string }>(async (req, ctx) => {
  const id = parseId((await ctx.params).id);
  const { cursor, limit: size } = readQuery(req, querySchema);
  return json(await listBoardPins(id, await getViewer(), cursor, size));
});

/** 보드에 핀 저장 */
export const POST = apiRoute<{ id: string }>(async (req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const id = parseId((await ctx.params).id);
  const { pinId } = await readJson(req, boardPinSchema);
  return json(await savePinToBoard(id, pinId, viewer));
});
