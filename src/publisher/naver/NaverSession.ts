import type { Page } from "playwright";
import { NaverSelectors, NaverUrls } from "./NaverSelectors";
import { PublishErrorCode, type SessionCheckResult } from "../core/PublishResult";

async function anyVisible(page: Page, selectors: readonly string[], timeout = 3_000): Promise<boolean> {
  for (const selector of selectors) {
    try {
      if (await page.locator(selector).first().isVisible({ timeout })) return true;
    } catch {
      // Selector absent on this layout variant; try the next candidate.
    }
  }
  return false;
}

/** True when the persistent profile still holds a valid Naver login. */
export async function isNaverLoggedIn(page: Page): Promise<boolean> {
  await page.goto(NaverUrls.home, { waitUntil: "domcontentloaded" });
  if (await anyVisible(page, NaverSelectors.loggedInMarkers, 2_500)) return true;
  if (await anyVisible(page, NaverSelectors.loggedOutMarkers, 2_500)) return false;
  // Ambiguous layout: fall back to the login page redirect behaviour.
  await page.goto(NaverUrls.blogHome, { waitUntil: "domcontentloaded" });
  return !page.url().includes("nid.naver.com");
}

/**
 * Verifies login *and* that the writer page is actually reachable, which is a
 * much stronger guarantee than a landing-page check alone.
 */
export async function checkNaverSession(page: Page, blogId: string | null): Promise<SessionCheckResult> {
  const loggedIn = await isNaverLoggedIn(page);
  if (!loggedIn) {
    return {
      ok: false,
      code: PublishErrorCode.LOGIN_REQUIRED,
      message: "네이버 로그인이 필요합니다. [로그인 갱신]으로 브라우저에서 로그인하세요.",
      canWrite: false,
    };
  }

  if (!blogId) {
    return { ok: true, message: "네이버 로그인 세션이 유효합니다. (블로그 ID 미설정)", canWrite: false };
  }

  try {
    await page.goto(NaverUrls.write(blogId), { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (page.url().includes("nid.naver.com")) {
      return {
        ok: false,
        code: PublishErrorCode.SESSION_EXPIRED,
        message: "세션이 만료되어 로그인 페이지로 이동했습니다. 로그인을 갱신하세요.",
        canWrite: false,
      };
    }
    const frame = page.frameLocator(NaverSelectors.editorFrames[0]);
    const editorReady = await frame
      .locator(NaverSelectors.title[0])
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    return {
      ok: true,
      message: editorReady
        ? "네이버 로그인 및 글쓰기 페이지 접근이 정상입니다."
        : "로그인은 유효하지만 에디터 로딩을 확인하지 못했습니다.",
      canWrite: editorReady,
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

/**
 * Opens a *headed* browser so the operator can complete login (incl. 2FA/캡차)
 * by hand. The persistent profile then keeps that session for future jobs.
 */
export async function openNaverLoginWindow(page: Page, waitMs: number): Promise<boolean> {
  await page.goto(NaverUrls.login, { waitUntil: "domcontentloaded" });
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(3_000);
    if (!page.url().includes("nid.naver.com")) return true;
  }
  return false;
}
