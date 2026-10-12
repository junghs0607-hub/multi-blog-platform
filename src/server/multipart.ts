import type { NextRequest } from "next/server";
import { env } from "@/server/env";
import { Errors } from "@/server/http";

export interface MultipartFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * multipart/form-data 파싱. Content-Length 로 1차 차단 후, 파일 크기를 다시 확인합니다.
 * (파일 필드 이름: file)
 */
export async function readMultipart(
  req: NextRequest,
  maxFileBytes: number,
): Promise<{ fields: Record<string, string>; file: MultipartFile | null }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw Errors.badRequest("multipart/form-data 형식으로 요청해주세요.");
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared && declared > maxFileBytes + 1024 * 1024) {
    throw Errors.tooLarge(`파일 크기는 최대 ${env.UPLOAD_MAX_MB}MB 까지 업로드할 수 있습니다.`);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw Errors.badRequest("업로드 데이터를 읽을 수 없습니다.");
  }

  const fields: Record<string, string> = {};
  let file: MultipartFile | null = null;
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      fields[key] = value;
    } else if (key === "file" && !file) {
      if (value.size > maxFileBytes) {
        throw Errors.tooLarge(`파일 크기는 최대 ${env.UPLOAD_MAX_MB}MB 까지 업로드할 수 있습니다.`);
      }
      file = {
        buffer: Buffer.from(await value.arrayBuffer()),
        mimeType: value.type,
        filename: value.name || "upload",
      };
    }
  }
  return { fields, file };
}
