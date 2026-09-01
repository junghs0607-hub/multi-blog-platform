import path from "path";
import { mkdir } from "fs/promises";
import type { BrowserContext, Page } from "playwright";
import { PublishError, PublishErrorCode } from "./PublishResult";

/**
 * Wraps a Playwright *persistent* context so each external account keeps its
 * own logged-in browser profile on disk:
 *
 *   browser-profiles/
 *   ├── naver-account-1/
 *   ├── naver-account-2/
 *   └── tistory-account-1/
 *
 * Playwright is imported lazily so that the Next.js server bundle never has to
 * resolve it — only the worker process pays that cost.
 */
export class BrowserSession {
  private context: BrowserContext | null = null;
  readonly profileDir: string;
  readonly headless: boolean;

  constructor(profileDir: string, options: { headless?: boolean } = {}) {
    this.profileDir = profileDir;
    this.headless = options.headless ?? process.env.PUBLISHER_HEADLESS !== "false";
  }

  static profileRoot(): string {
    return process.env.PUBLISHER_PROFILE_ROOT || path.join(process.cwd(), "browser-profiles");
  }

  profilePath(): string {
    return path.join(BrowserSession.profileRoot(), this.profileDir);
  }

  async open(): Promise<BrowserContext> {
    if (this.context) return this.context;

    const dir = this.profilePath();
    await mkdir(dir, { recursive: true });

    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch {
      throw new PublishError(
        PublishErrorCode.UNKNOWN_ERROR,
        "Playwright를 불러올 수 없습니다. `npm i playwright` 후 `npx playwright install chromium`을 실행하세요.",
      );
    }

    try {
      this.context = await chromium.launchPersistentContext(dir, {
        headless: this.headless,
        viewport: { width: 1440, height: 960 },
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
        args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Executable doesn't exist") || message.includes("browserType.launch")) {
        throw new PublishError(
          PublishErrorCode.UNKNOWN_ERROR,
          "Chromium 브라우저가 설치되지 않았습니다. 워커 서버에서 `npx playwright install chromium`을 실행하세요.",
        );
      }
      throw error;
    }

    this.context.setDefaultTimeout(45_000);
    this.context.setDefaultNavigationTimeout(60_000);
    return this.context;
  }

  async newPage(): Promise<Page> {
    const context = await this.open();
    const existing = context.pages();
    return existing.length > 0 ? existing[0] : context.newPage();
  }

  async close(): Promise<void> {
    if (!this.context) return;
    try {
      await this.context.close();
    } catch {
      // A crashed browser must never break job bookkeeping.
    } finally {
      this.context = null;
    }
  }
}

/**
 * Per-account in-process mutex. Guarantees a single Playwright job runs for a
 * given external account at a time; other jobs queue behind it.
 */
const accountLocks = new Map<string, Promise<unknown>>();

export async function withAccountLock<T>(accountKey: string, task: () => Promise<T>): Promise<T> {
  const previous = accountLocks.get(accountKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  accountLocks.set(accountKey, previous.then(() => gate));

  try {
    await previous;
  } catch {
    // Ignore the previous holder's failure; ordering is all we need.
  }

  try {
    return await task();
  } finally {
    release();
    // Drop the entry when no one else queued behind us.
    queueMicrotask(() => {
      if (accountLocks.get(accountKey) === gate) accountLocks.delete(accountKey);
    });
  }
}
