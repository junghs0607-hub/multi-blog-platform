import { z } from "zod";
import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { findDuplicatePin, findImageBySha } from "@/server/services/images";

const querySchema = z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/, "sha256 형식이 올바르지 않습니다.") });

/**
 * 업로드 전 중복 확인 (브라우저에서 Web Crypto 로 계산한 SHA-256)
 * 업로드 전에 사용자에게 미리 알려 불필요한 전송을 줄입니다. (최종 검증은 업로드 시 서버에서 다시 수행)
 */
export const GET = apiRoute(async (req) => {
  const viewer = await requireViewer();
  const { sha256 } = readQuery(req, querySchema);
  const image = await findImageBySha(sha256);
  const duplicate = image ? await findDuplicatePin(image.id, viewer) : null;
  return json({ duplicate: duplicate ? { existingPinId: duplicate.pinId, own: duplicate.own } : null });
});
