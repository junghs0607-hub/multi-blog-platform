import { lookup } from "dns/promises";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { blogs, media } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ImageQuery = {
  query: string;
  alt: string;
  caption?: string;
};

export type SavedImage = {
  url: string;
  alt: string;
  caption: string;
  creator?: string;
  creatorUrl?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  source: "openverse" | "generated" | "fallback";
};

type ImageSettings = {
  imageProvider?: string | null;
  imageApiBaseUrl?: string | null;
  imageApiKey?: string | null;
  imageModel?: string | null;
  imageCount?: number | null;
};

type OpenverseResult = {
  url?: string;
  thumbnail?: string;
  title?: string;
  creator?: string;
  creator_url?: string;
  license?: string;
  license_url?: string;
  foreign_landing_url?: string;
};

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "0.0.0.0") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("127.") || normalized.startsWith("10.") || normalized.startsWith("192.168.")) return true;
  const match = normalized.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  return normalized.startsWith("169.254.");
}

async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("HTTPS 이미지만 저장할 수 있습니다.");
  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("허용되지 않은 이미지 주소입니다.");
  }
  return url;
}

async function getBlog(userId: number) {
  const [blog] = await db.select().from(blogs).where(eq(blogs.userId, userId)).limit(1);
  if (!blog) throw new Error("블로그가 없습니다.");
  return blog;
}

async function saveImageBuffer(params: {
  userId: number;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  alt: string;
}): Promise<string> {
  const blog = await getBlog(params.userId);
  const extension = MIME_EXTENSIONS[params.mimeType] || "png";
  const fileName = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "uploads", blog.slug);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), params.buffer);

  const url = `/api/uploads/${blog.slug}/${fileName}`;
  await db.insert(media).values({
    userId: params.userId,
    blogId: blog.id,
    fileName,
    originalName: params.originalName,
    mimeType: params.mimeType,
    fileSize: params.buffer.length,
    url,
  });
  return url;
}

async function downloadAndSaveImage(params: {
  userId: number;
  remoteUrl: string;
  alt: string;
  namePrefix: string;
}): Promise<string> {
  let currentUrl = await assertSafeRemoteUrl(params.remoteUrl);
  let response: Response | null = null;
  for (let redirectCount = 0; redirectCount < 4; redirectCount++) {
    response = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "BlogHub/1.0 (image import)" },
    });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("이미지 리디렉션 주소가 없습니다.");
    currentUrl = await assertSafeRemoteUrl(new URL(location, currentUrl).toString());
  }
  if (!response || !response.ok) throw new Error(`이미지 다운로드 실패 (${response?.status || 0})`);

  const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!MIME_EXTENSIONS[contentType]) throw new Error("지원하지 않는 원격 이미지 형식입니다.");

  const length = Number(response.headers.get("content-length") || 0);
  if (length > 12 * 1024 * 1024) throw new Error("원격 이미지가 12MB를 초과합니다.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > 12 * 1024 * 1024) throw new Error("원격 이미지 크기가 올바르지 않습니다.");

  return saveImageBuffer({
    userId: params.userId,
    buffer,
    mimeType: contentType,
    originalName: `${params.namePrefix}.${MIME_EXTENSIONS[contentType]}`,
    alt: params.alt,
  });
}

async function searchOpenverse(query: ImageQuery): Promise<OpenverseResult[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query.query);
  url.searchParams.set("page_size", "12");
  url.searchParams.set("license_type", "commercial");
  url.searchParams.set("aspect_ratio", "wide");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json", "User-Agent": "BlogHub/1.0" },
  });
  if (!response.ok) throw new Error(`Openverse 검색 실패 (${response.status})`);
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function getOpenverseImage(userId: number, query: ImageQuery, index: number): Promise<SavedImage | null> {
  const results = await searchOpenverse(query);
  for (const result of results) {
    const candidates = [result.url, result.thumbnail].filter(Boolean) as string[];
    for (const candidate of candidates) {
      try {
        const localUrl = await downloadAndSaveImage({
          userId,
          remoteUrl: candidate,
          alt: query.alt,
          namePrefix: `openverse-${index + 1}`,
        });
        return {
          url: localUrl,
          alt: query.alt,
          caption: query.caption || result.title || query.alt,
          creator: result.creator || undefined,
          creatorUrl: result.creator_url || undefined,
          license: result.license?.toUpperCase() || undefined,
          licenseUrl: result.license_url || undefined,
          sourceUrl: result.foreign_landing_url || undefined,
          source: "openverse",
        };
      } catch {
        // Some indexed originals no longer exist; try the next candidate/result.
      }
    }
  }
  return null;
}

async function getGeneratedImage(
  userId: number,
  query: ImageQuery,
  index: number,
  settings: ImageSettings,
): Promise<SavedImage | null> {
  const apiKey = settings.imageApiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("이미지 생성 API 키가 설정되지 않았습니다.");
  const baseUrl = (settings.imageApiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = settings.imageModel || "gpt-image-1";

  const prompt = `${query.query}. ${query.alt}. Premium editorial blog photography, landscape composition, no text, no watermark.`;
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    signal: AbortSignal.timeout(120_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, size: "1536x1024" }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`이미지 생성 실패 (${response.status}): ${detail.slice(0, 160)}`);
  }

  const payload = await response.json();
  const item = payload.data?.[0];
  if (!item) return null;

  let localUrl: string;
  if (item.b64_json) {
    localUrl = await saveImageBuffer({
      userId,
      buffer: Buffer.from(item.b64_json, "base64"),
      mimeType: "image/png",
      originalName: `ai-generated-${index + 1}.png`,
      alt: query.alt,
    });
  } else if (item.url) {
    localUrl = await downloadAndSaveImage({
      userId,
      remoteUrl: item.url,
      alt: query.alt,
      namePrefix: `ai-generated-${index + 1}`,
    });
  } else {
    return null;
  }

  return {
    url: localUrl,
    alt: query.alt,
    caption: query.caption || query.alt,
    source: "generated",
  };
}

async function createFallbackImage(userId: number, query: ImageQuery, index: number): Promise<SavedImage> {
  const palettes = [
    ["#0f766e", "#14b8a6", "#99f6e4"],
    ["#1d4ed8", "#60a5fa", "#dbeafe"],
    ["#7e22ce", "#c084fc", "#f3e8ff"],
  ];
  const colors = palettes[index % palettes.length];
  const title = escapeHtml(query.alt.slice(0, 55));
  const keyword = escapeHtml(query.query.slice(0, 70));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="0.55" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs>
    <rect width="1200" height="720" fill="url(#g)"/>
    <circle cx="1030" cy="110" r="250" fill="white" opacity=".12"/><circle cx="160" cy="650" r="300" fill="white" opacity=".1"/>
    <rect x="88" y="126" width="1024" height="468" rx="36" fill="#071d2a" opacity=".2"/>
    <text x="120" y="310" fill="white" font-family="sans-serif" font-size="28" opacity=".8">BLOGHUB VISUAL</text>
    <text x="120" y="390" fill="white" font-family="sans-serif" font-size="54" font-weight="700">${title}</text>
    <text x="120" y="458" fill="white" font-family="sans-serif" font-size="24" opacity=".76">${keyword}</text>
  </svg>`;
  const localUrl = await saveImageBuffer({
    userId,
    buffer: Buffer.from(svg),
    mimeType: "image/svg+xml",
    originalName: `fallback-${index + 1}.svg`,
    alt: query.alt,
  });
  return { url: localUrl, alt: query.alt, caption: query.caption || query.alt, source: "fallback" };
}

export function normalizeImageQueries(value: unknown, topic: string, count: number): ImageQuery[] {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((item): ImageQuery | null => {
      if (typeof item === "string") return { query: item, alt: item };
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const query = typeof record.query === "string" ? record.query.trim() : "";
      const alt = typeof record.alt === "string" ? record.alt.trim() : query;
      const caption = typeof record.caption === "string" ? record.caption.trim() : undefined;
      return query ? { query, alt: alt || query, caption } : null;
    })
    .filter((item): item is ImageQuery => Boolean(item));

  const fallbackTerms = [
    `${topic} editorial photography`,
    `${topic} detail lifestyle`,
    `${topic} wide landscape`,
    `${topic} modern concept`,
    `${topic} natural scene`,
  ];
  while (normalized.length < count) {
    const fallback = fallbackTerms[normalized.length % fallbackTerms.length];
    normalized.push({ query: fallback, alt: `${topic} 관련 이미지 ${normalized.length + 1}` });
  }
  return normalized.slice(0, count);
}

export async function acquireBlogImages(params: {
  userId: number;
  topic: string;
  queries: ImageQuery[];
  settings: ImageSettings;
}): Promise<{ images: SavedImage[]; warnings: string[] }> {
  const count = Math.max(1, Math.min(params.settings.imageCount || 3, 5));
  const provider = params.settings.imageProvider || "openverse";
  const images: SavedImage[] = [];
  const warnings: string[] = [];

  for (let index = 0; index < Math.min(count, params.queries.length); index++) {
    const query = params.queries[index];
    try {
      const image = provider === "openai-compatible"
        ? await getGeneratedImage(params.userId, query, index, params.settings)
        : await getOpenverseImage(params.userId, query, index);
      if (image) images.push(image);
      else warnings.push(`${index + 1}번 이미지 결과가 없습니다.`);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `${index + 1}번 이미지 처리 실패`);
    }
  }

  // Never leave broken external URLs in the article.
  if (images.length === 0) {
    for (let index = 0; index < Math.min(count, params.queries.length); index++) {
      images.push(await createFallbackImage(params.userId, params.queries[index], index));
    }
    warnings.push("이미지 Provider 응답이 없어 로컬 대체 이미지를 사용했습니다.");
  }

  return { images, warnings };
}

function imageFigure(image: SavedImage): string {
  const attributionParts: string[] = [];
  if (image.creator) {
    attributionParts.push(image.creatorUrl
      ? `<a href="${escapeHtml(image.creatorUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(image.creator)}</a>`
      : escapeHtml(image.creator));
  }
  if (image.license) {
    attributionParts.push(image.licenseUrl
      ? `<a href="${escapeHtml(image.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(image.license)}</a>`
      : escapeHtml(image.license));
  }
  if (image.sourceUrl) {
    attributionParts.push(`<a href="${escapeHtml(image.sourceUrl)}" target="_blank" rel="noopener noreferrer">원본</a>`);
  }
  const attribution = attributionParts.length ? ` · ${attributionParts.join(" · ")}` : "";
  return `<figure class="ai-blog-image" style="margin:28px 0"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" loading="lazy" style="display:block;width:100%;height:auto;border-radius:14px"/><figcaption style="margin-top:8px;text-align:center;color:#64748b;font-size:12px">${escapeHtml(image.caption)}${attribution}</figcaption></figure>`;
}

export function injectImagesIntoContent(content: string, images: SavedImage[]): string {
  if (!content || images.length === 0) return content;
  const paragraphCount = (content.match(/<\/p>/gi) || []).length;
  if (paragraphCount === 0) return `${images.map(imageFigure).join("")}${content}`;

  const targetIndexes = images.map((_, index) =>
    Math.max(1, Math.round(((index + 1) * paragraphCount) / (images.length + 1))),
  );
  let currentParagraph = 0;
  let imageIndex = 0;
  const result = content.replace(/<\/p>/gi, (closingTag) => {
    currentParagraph += 1;
    let addition = "";
    while (imageIndex < images.length && targetIndexes[imageIndex] === currentParagraph) {
      addition += imageFigure(images[imageIndex]);
      imageIndex += 1;
    }
    return `${closingTag}${addition}`;
  });
  return imageIndex < images.length
    ? `${result}${images.slice(imageIndex).map(imageFigure).join("")}`
    : result;
}
