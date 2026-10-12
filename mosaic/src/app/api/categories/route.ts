import { apiRoute, json } from "@/server/http";
import { listCategories } from "@/server/services/categories";

export const GET = apiRoute(async () => json({ items: await listCategories() }));
