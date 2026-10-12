import { getViewer, requireViewer } from "@/server/auth/session";
import { UPLOAD_MAX_BYTES } from "@/server/env";
import { apiRoute, Errors, json, readQuery } from "@/server/http";
import { scheduleJobs } from "@/server/jobs/schedule";
import { readMultipart } from "@/server/multipart";
import { limit } from "@/server/rate-limit";
import { getPinDetail, listPins } from "@/server/services/pins";
import { createPinFromUpload } from "@/server/services/upload";
import { createPinSchema, listPinsQuerySchema } from "@/server/validation";

/**
 * 피드 / 검색
 *  ?q=검색어 &tag=태그 &category=slug &feed=all|following &sort=latest|popular|relevance &cursor= &limit=
 */
export const GET = apiRoute(async (req) => {
  const q = readQuery(req, listPinsQuerySchema);
  const viewer = await getViewer();
  const page = await listPins({
    viewer,
    q: q.q,
    tag: q.tag,
    categorySlug: q.category,
    feed: q.feed,
    sort: q.sort,
    cursor: q.cursor,
    limit: q.limit,
  });
  return json(page);
});

/**
 * 이미지 업로드 + 핀 생성 (multipart/form-data)
 *  file, title, description, sourceUrl, tags(쉼표 구분 또는 JSON 배열), categoryId, boardId, visibility, allowSimilar
 */
export const POST = apiRoute(async (req) => {
  const viewer = await requireViewer();
  limit("upload", viewer.id);
  const { fields, file } = await readMultipart(req, UPLOAD_MAX_BYTES);
  if (!file) throw Errors.badRequest("업로드할 이미지 파일(file)이 필요합니다.");
  const input = createPinSchema.parse(fields);
  const result = await createPinFromUpload(viewer, file, input);
  scheduleJobs(result.jobIds);
  const pin = await getPinDetail(result.pinId, viewer);
  return json({ pin, reusedImage: result.reusedImage }, 201);
});
