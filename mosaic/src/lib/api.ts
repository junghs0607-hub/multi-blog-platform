import { CSRF_HEADER } from "./constants";

/**
 * 브라우저용 API 클라이언트
 *  - 상태 변경 요청에 CSRF 보호 헤더 자동 첨부
 *  - 표준 에러 형식 { error: { code, message, details } } → ApiError
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return new ApiError(
    res.status,
    body?.error?.code ?? "HTTP_ERROR",
    body?.error?.message ?? (res.status === 413 ? "파일이 너무 큽니다." : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."),
    body?.error?.details,
  );
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; query?: Query; signal?: AbortSignal } = {},
): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers[CSRF_HEADER] = "1";
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(withQuery(path, opts.query), {
      method,
      headers,
      body,
      credentials: "same-origin",
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "네트워크 연결을 확인해주세요.");
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/** 업로드 진행률이 필요한 multipart 요청 (fetch 는 업로드 진행률을 제공하지 않으므로 XHR 사용) */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress?: (ratio: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.setRequestHeader(CSRF_HEADER, "1");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as T);
      const e = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      reject(
        new ApiError(
          xhr.status,
          e?.code ?? "HTTP_ERROR",
          e?.message ?? (xhr.status === 413 ? "파일이 너무 큽니다." : "업로드에 실패했습니다."),
          e?.details,
        ),
      );
    };
    xhr.onerror = () => reject(new ApiError(0, "NETWORK_ERROR", "네트워크 연결을 확인해주세요."));
    xhr.send(form);
  });
}

export function errorMessage(err: unknown, fallback = "문제가 발생했습니다."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** 브라우저에서 파일 SHA-256 계산 (업로드 전 중복 확인용) */
export async function sha256OfFile(file: File): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
