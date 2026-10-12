import { z } from "zod";
import { getViewer } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { searchUsers } from "@/server/services/users";

const querySchema = z.object({
  q: z.string().trim().max(50).optional().default(""),
  limit: z.coerce.number().int().min(1).max(30).optional().default(10),
});

/** 사용자 검색 (아이디 접두 일치 / 이름 부분 일치) */
export const GET = apiRoute(async (req) => {
  const { q, limit } = readQuery(req, querySchema);
  return json({ items: await searchUsers(q, await getViewer(), limit) });
});
