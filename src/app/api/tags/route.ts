import { z } from "zod";
import { apiRoute, json, readQuery } from "@/server/http";
import { popularTags, suggestTags } from "@/server/services/tags";

const querySchema = z.object({
  q: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/** 태그 자동완성 (?q=접두어) / 인기 태그 */
export const GET = apiRoute(async (req) => {
  const { q, limit } = readQuery(req, querySchema);
  return json({ items: q ? await suggestTags(q, limit) : await popularTags(limit, { userOnly: true }) });
});
