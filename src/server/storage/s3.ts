import { AwsClient } from "aws4fetch";
import type { StorageDriver, StoredObject } from "./types";

export interface S3StorageOptions {
  bucket: string;
  region: string;
  /** 비워두면 AWS S3 (https://s3.<region>.amazonaws.com) */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** true: <endpoint>/<bucket>/<key> (MinIO 등) · false: <bucket>.<endpoint 호스트>/<key> */
  forcePathStyle: boolean;
}

/** 5xx·429 응답과 네트워크 오류의 최대 재시도 횟수 */
const MAX_RETRIES = 3;

/**
 * S3 호환 객체 저장소 (AWS S3, MinIO, Cloudflare R2 …).
 * SDK 없이 aws4fetch 로 SigV4 서명한 fetch 요청을 보냅니다.
 */
export class S3Storage implements StorageDriver {
  readonly name = "s3" as const;
  private readonly client: AwsClient;
  private readonly baseUrl: string;

  constructor(opts: S3StorageOptions) {
    if (!opts.bucket) throw new Error("S3_BUCKET 이 설정되지 않았습니다.");
    if (!opts.accessKeyId || !opts.secretAccessKey) {
      throw new Error("S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY 가 설정되지 않았습니다.");
    }
    this.client = new AwsClient({
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
      service: "s3",
      region: opts.region,
    });

    const url = new URL(opts.endpoint || `https://s3.${opts.region}.amazonaws.com`);
    const basePath = url.pathname.replace(/\/+$/, "");
    if (opts.forcePathStyle) {
      this.baseUrl = `${url.origin}${basePath}/${opts.bucket}`;
    } else {
      url.hostname = `${opts.bucket}.${url.hostname}`;
      this.baseUrl = `${url.origin}${basePath}`;
    }
  }

  private url(key: string): string {
    return `${this.baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  /**
   * 서명한 요청을 보냅니다. 5xx·429·네트워크 오류는 지수 백오프로 재시도합니다.
   *
   * Next.js 서버의 전역 fetch 는 GET 요청을 중복 제거(dedupe)하면서 응답 본문을 tee 해 한쪽을 보관합니다.
   * 그러면 받은 스트림을 cancel() 해도 끝나지 않고, 큰 객체가 메모리에 한 벌 더 쌓입니다.
   * fetch 에 signal 을 직접 넘기면 이 처리에서 빠지므로 항상 signal 을 넘깁니다.
   */
  private async send(
    method: "GET" | "PUT" | "DELETE",
    key: string,
    init: { body?: Uint8Array<ArrayBuffer>; headers?: Record<string, string> } = {},
  ): Promise<Response> {
    const url = this.url(key);
    for (let attempt = 0; ; attempt++) {
      const signed = await this.client.sign(url, { method, ...init });
      try {
        const res = await fetch(signed, { signal: new AbortController().signal });
        if ((res.status < 500 && res.status !== 429) || attempt >= MAX_RETRIES) return res;
        await discard(res);
      } catch (err) {
        if (attempt >= MAX_RETRIES) throw err;
      }
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const res = await this.send("PUT", key, {
      body: new Uint8Array(data),
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    if (!res.ok) throw await s3Error("PUT", key, res);
    await discard(res);
  }

  async get(key: string): Promise<StoredObject | null> {
    const res = await this.send("GET", key);
    if (res.status === 404) {
      await discard(res);
      return null;
    }
    if (!res.ok || !res.body) throw await s3Error("GET", key, res);
    const size = Number(res.headers.get("content-length"));
    return {
      body: res.body,
      size: Number.isFinite(size) && size > 0 ? size : undefined,
      contentType: res.headers.get("content-type") ?? undefined,
    };
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    const res = await this.send("GET", key);
    if (res.status === 404) {
      await discard(res);
      return null;
    }
    if (!res.ok) throw await s3Error("GET", key, res);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const res = await this.send("DELETE", key);
    if (!res.ok && res.status !== 404) throw await s3Error("DELETE", key, res);
    await discard(res);
  }
}

/** 쓰지 않는 응답 본문을 끝까지 읽어 연결을 반환합니다. (작은 응답에만 사용) */
async function discard(res: Response): Promise<void> {
  await res.arrayBuffer().catch(() => undefined);
}

async function s3Error(op: string, key: string, res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  const code = /<Code>([^<]+)<\/Code>/.exec(text)?.[1];
  return new Error(`S3 ${op} ${key} 실패: HTTP ${res.status}${code ? ` (${code})` : ""}`);
}
