import { requireViewer } from "@/server/auth/session";
import { UPLOAD_MAX_BYTES } from "@/server/env";
import { apiRoute, Errors, json } from "@/server/http";
import { readMultipart } from "@/server/multipart";
import { limit } from "@/server/rate-limit";
import { avatarUrl } from "@/server/services/mappers";
import { removeAvatar, setAvatar } from "@/server/services/users";

/** 프로필 이미지 업로드 (정사각형 320px WebP 로 변환) */
export const POST = apiRoute(async (req) => {
  const viewer = await requireViewer();
  limit("upload", viewer.id);
  const { file } = await readMultipart(req, UPLOAD_MAX_BYTES);
  if (!file) throw Errors.badRequest("이미지 파일(file)이 필요합니다.");
  const key = await setAvatar(viewer, file);
  return json({ avatarUrl: avatarUrl(key) });
});

/** 프로필 이미지 삭제 */
export const DELETE = apiRoute(async () => {
  const viewer = await requireViewer();
  await removeAvatar(viewer);
  return json({ avatarUrl: null });
});
