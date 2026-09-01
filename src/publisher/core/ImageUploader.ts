import path from "path";
import { existsSync } from "fs";
import { mkdir, writeFile, rm } from "fs/promises";
import { randomUUID } from "crypto";
import type { Locator, Page } from "playwright";
import { PublishError, PublishErrorCode, type PublishImage } from "./PublishResult";

const TEMP_ROOT = () => path.join(process.cwd(), "uploads", ".publish-temp");

/** Extracts every <img src> from article HTML, in document order. */
export function extractImageSources(html: string): { src: string; alt: string }[] {
  const results: { src: string; alt: string }[] = [];
  const imgRegex = /<img\b[^>]*>/gi;
  const matches = html.match(imgRegex) || [];
  for (const tag of matches) {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || "";
    results.push({ src, alt });
  }
  return results;
}

/**
 * Turns article image references into real files on disk that Playwright can
 * feed to a platform's native uploader.
 *
 * - `/api/uploads/<blog>/<file>`  → already local, mapped straight to disk
 * - `https://...`                 → downloaded into a temp dir
 * - anything else                 → skipped (never blocks publishing)
 */
export async function resolveArticleImages(
  html: string,
  options: { siteOrigin: string; limit?: number },
): Promise<{ images: PublishImage[]; tempDir: string | null; warnings: string[] }> {
  const sources = extractImageSources(html);
  const limit = options.limit ?? 20;
  const warnings: string[] = [];
  const images: PublishImage[] = [];
  let tempDir: string | null = null;

  for (const { src, alt } of sources.slice(0, limit)) {
    try {
      const localPath = src.startsWith("/api/uploads/")
        ? mapUploadPath(src)
        : null;

      if (localPath) {
        if (existsSync(localPath)) {
          images.push({ localPath, originalSrc: src, alt });
        } else {
          warnings.push(`로컬 이미지를 찾지 못했습니다: ${src}`);
        }
        continue;
      }

      const absolute = src.startsWith("http")
        ? src
        : src.startsWith("/")
          ? `${options.siteOrigin.replace(/\/$/, "")}${src}`
          : null;

      if (!absolute) {
        warnings.push(`지원하지 않는 이미지 경로입니다: ${src}`);
        continue;
      }

      if (!tempDir) {
        tempDir = path.join(TEMP_ROOT(), randomUUID());
        await mkdir(tempDir, { recursive: true });
      }
      const downloaded = await downloadTo(absolute, tempDir);
      if (downloaded) images.push({ localPath: downloaded, originalSrc: src, alt });
      else warnings.push(`이미지 다운로드 실패: ${src}`);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `이미지 처리 실패: ${src}`);
    }
  }

  return { images, tempDir, warnings };
}

function mapUploadPath(src: string): string {
  const relative = src.replace(/^\/api\/uploads\//, "");
  const decoded = relative.split("/").map((part) => decodeURIComponent(part));
  const resolved = path.join(process.cwd(), "uploads", ...decoded);
  const root = path.join(process.cwd(), "uploads");
  if (!path.normalize(resolved).startsWith(root)) {
    throw new PublishError(PublishErrorCode.IMAGE_UPLOAD_FAILED, "허용되지 않은 이미지 경로입니다.");
  }
  return resolved;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

async function downloadTo(url: string, dir: string): Promise<string | null> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "BlogHub-Publisher/1.0" },
  });
  if (!response.ok) return null;

  const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const extension = EXTENSION_BY_MIME[contentType];
  if (!extension) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > 20 * 1024 * 1024) return null;

  const filePath = path.join(dir, `${randomUUID()}.${extension}`);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupTempDir(tempDir: string | null): Promise<void> {
  if (!tempDir) return;
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    // Temp cleanup must never fail a successful publish.
  }
}

/**
 * Drives a platform's own image uploader through a hidden <input type=file>.
 * Falls back to the file chooser dialog when the input is not directly usable.
 */
export async function uploadViaFileInput(
  page: Page,
  trigger: Locator | null,
  fileInputSelector: string,
  files: string[],
): Promise<void> {
  if (files.length === 0) return;

  const input = page.locator(fileInputSelector).first();
  if ((await input.count()) > 0) {
    await input.setInputFiles(files);
    return;
  }

  if (!trigger) {
    throw new PublishError(PublishErrorCode.IMAGE_UPLOAD_FAILED, "이미지 업로드 입력을 찾지 못했습니다.");
  }

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 15_000 }),
    trigger.click(),
  ]);
  await chooser.setFiles(files);
}
