import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageDriver, StoredObject } from "./types";

/**
 * 서버 디스크 저장소.
 * 키를 그대로 하위 경로로 사용합니다. 예) <LOCAL_STORAGE_DIR>/thumbs/ab/cd/<sha256>.webp
 */
export class LocalStorage implements StorageDriver {
  readonly name = "local" as const;
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir);
  }

  /** 키 → 절대 경로. 저장소 루트 밖을 가리키는 키(경로 조작)는 거부합니다. */
  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error(`잘못된 저장소 키입니다: ${key}`);
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    // 임시 파일에 쓴 뒤 rename 합니다. 중간에 실패해도 반쯤 쓰인 파일이 남지 않습니다.
    const tmp = `${full}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(tmp, data);
      await fs.rename(tmp, full);
    } catch (err) {
      await fs.rm(tmp, { force: true });
      throw err;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    const full = this.resolve(key);
    const stat = await fs.stat(full).catch(nullIfMissing);
    if (!stat?.isFile()) return null;
    const body = Readable.toWeb(createReadStream(full)) as unknown as ReadableStream<Uint8Array>;
    return { body, size: stat.size };
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    return fs.readFile(this.resolve(key)).catch(nullIfMissing);
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }
}

function nullIfMissing(err: NodeJS.ErrnoException): null {
  if (err.code === "ENOENT" || err.code === "ENOTDIR") return null;
  throw err;
}
