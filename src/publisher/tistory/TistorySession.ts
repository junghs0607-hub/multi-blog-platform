import type { Page } from "playwright";
import { TistorySelectors, TistoryUrls } from "./TistorySelectors";
import { PublishErrorCode, type SessionCheckResult } from "../core/PublishResult";

async function anyVisible(page: Page, selectors: readonly string[], timeout = 3_000): Promise<boolean> {
  for (const selector of selectors) {
    try {
      if (await page.locator(selector).first().isVisible({ timeout })) return true;
    } catch {
      // Selector absent on this layout variant.
    }
  }
  return false;
}

export async function isTistoryLoggedIn(page: Page): Promise<boolean> {
  await page.goto(TistoryUrls.home, { waitUntil: "domcontentloaded" });
  if (await anyVisible(page, TistorySelectors.loggedInMarkers, 2_500)) return true;
  if (await anyVisible(page, TistorySelectors.loggedOutMarkers, 2_500)) return false;
  return !page.url().includes("/auth/login");
}

/** Confirms the Kakao session survives and the blog's writer page loads. */
export async function checkTistorySession(page: Page, blogAddress: string | null): Promise<SessionCheckResult> {
  if (!(await isTistoryLoggedIn(page))) {
    return {
      ok: false,
      code: PublishErrorCode.LOGIN_REQUIRED,
      message: "티스토리(카카오) 로그인이 필요합니다. [로그인 갱신]을 실행하세요.",
      canWrite: false,
    };
  }

  if (!blogAddress) {
    return { ok: true, message: "티스토리 로그인 세션이 유효합니다. (블로그 주소 미설정)", canWrite: false };
  }

  try {
    await page.goto(TistoryUrls.write(blogAddress), { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (page.url().includes("/auth/login") || page.url().includes("accounts.kakao.com")) {
      return {
        ok: false,
        code: PublishErrorCode.SESSION_EXPIRED,
        message: "세션이 만료되었습니다. 로그인을 갱신하세요.",
        canWrite: false,
      };
    }
    const titleReady = await page
      .locator(TistorySelectors.title[0])
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    return {
      ok: true,
      message: titleReady
        ? "티스토리 로그인 및 글쓰기 페이지 접근이 정상입니다."
        : "로그인은 유효하지만 에디터 로딩을 확인하지 못했습니다.",
      canWrite: titleReady,
    };
  } catch (error) {
    return {
      ok: true,
      message: `로그인은 유효하지만 글쓰기 페이지 확인에 실패했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`,
      canWrite: false,
    };
  }
}

/** Headed window for manual Kakao login (supports 2FA and captcha). */
export async function openTistoryLoginWindow(page: Page, waitMs: number): Promise<boolean> {
  await page.goto(TistoryUrls.login, { waitUntil: "domcontentloaded" });
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(3_000);
    const url = page.url();
    if (!url.includes("/auth/login") && !url.includes("accounts.kakao.com")) return true;
  }
  return false;
}
