import { Publisher } from "../core/Publisher";
import { PublishError, PublishErrorCode, type PublishArticle, type SessionCheckResult } from "../core/PublishResult";
import { NaverEditor } from "./NaverEditor";
import { NaverSelectors, NaverUrls } from "./NaverSelectors";
import { checkNaverSession, isNaverLoggedIn, openNaverLoginWindow } from "./NaverSession";

/**
 * Naver Blog adapter.
 *
 * 로그인 세션 확인 → 글쓰기 페이지 → 제목 → 본문 → 이미지 →
 * 카테고리 → 태그 → 공개설정 → 발행 → URL 추출
 */
export class NaverPublisher extends Publisher {
  readonly platform = "NAVER" as const;

  private get blogId(): string {
    const id = this.account.blogAddress || this.account.loginId;
    if (!id) {
      throw new PublishError(
        PublishErrorCode.PUBLISH_FAILED,
        "네이버 블로그 ID가 설정되지 않았습니다. 계정 설정에서 블로그 주소를 입력하세요.",
      );
    }
    return id;
  }

  async checkSession(): Promise<SessionCheckResult> {
    const page = await this.session.newPage();
    return checkNaverSession(page, this.account.blogAddress || this.account.loginId);
  }

  /** Headed login helper used by the admin "로그인 갱신" action. */
  async interactiveLogin(waitMs = 180_000): Promise<SessionCheckResult> {
    const page = await this.session.newPage();
    const success = await openNaverLoginWindow(page, waitMs);
    return success
      ? { ok: true, message: "네이버 로그인이 저장되었습니다." }
      : {
          ok: false,
          code: PublishErrorCode.LOGIN_REQUIRED,
          message: "제한 시간 내 로그인이 완료되지 않았습니다.",
        };
  }

  protected async runPublish(article: PublishArticle): Promise<string | null> {
    const page = await this.session.newPage();

    this.log("session", "네이버 로그인 세션을 확인합니다.");
    if (!(await isNaverLoggedIn(page))) {
      this.requireLogin("네이버 로그인 세션이 없습니다. 관리자 화면에서 로그인을 갱신하세요.");
    }

    const blogId = this.blogId;
    this.log("navigate", `글쓰기 페이지로 이동합니다. (blogId: ${blogId})`);
    await page.goto(NaverUrls.write(blogId), { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (page.url().includes("nid.naver.com")) {
      throw new PublishError(PublishErrorCode.SESSION_EXPIRED, "세션이 만료되어 로그인 페이지로 이동했습니다.");
    }

    const editor = new NaverEditor(page);
    await editor.waitForEditor();
    await editor.dismissPopups();

    const formatted = this.formatArticle(article);

    this.log("title", "제목을 입력합니다.");
    await editor.setTitle(formatted.title);

    this.log("body", `본문 ${formatted.plainBlocks.length}개 블록을 입력합니다.`);
    await editor.setBody(formatted.plainBlocks);

    if (article.images.length > 0) {
      try {
        const uploaded = await editor.uploadImages(article.images);
        this.log("image", `이미지 ${uploaded}장을 네이버에 직접 업로드했습니다.`);
      } catch (error) {
        // Image failure must not abort an otherwise valid post.
        this.log("image", error instanceof Error ? error.message : "이미지 업로드 실패", "warn");
      }
    }

    this.log("publish-panel", "발행 패널을 엽니다.");
    await editor.openPublishPanel();

    if (formatted.category) {
      const selected = await editor.selectCategory(formatted.category);
      this.log(
        "category",
        selected ? `카테고리 '${formatted.category}' 선택 완료` : `카테고리 '${formatted.category}'를 찾지 못했습니다.`,
        selected ? "info" : "warn",
      );
    }

    if (formatted.tags.length > 0) {
      try {
        await editor.enterTags(formatted.tags);
        this.log("tag", `태그 ${formatted.tags.length}개를 입력했습니다.`);
      } catch (error) {
        this.log("tag", error instanceof Error ? error.message : "태그 입력 실패", "warn");
      }
    }

    await editor.setVisibility(formatted.visibility);
    this.log("visibility", `공개 설정: ${formatted.visibility === "public" ? "공개" : "비공개"}`);

    if (article.scheduledAt && article.scheduledAt.getTime() > Date.now()) {
      const scheduled = await editor.setSchedule(article.scheduledAt);
      this.log(
        "schedule",
        scheduled ? `예약 발행 시간 설정: ${article.scheduledAt.toISOString()}` : "예약 발행 UI를 찾지 못해 즉시 발행합니다.",
        scheduled ? "info" : "warn",
      );
    }

    this.log("publish", "발행을 실행합니다.");
    await editor.confirmPublish();

    return this.resolvePublishedUrl(page, blogId);
  }

  /** Waits for the post-publish redirect and extracts the canonical post URL. */
  private async resolvePublishedUrl(
    page: Awaited<ReturnType<typeof this.session.newPage>>,
    blogId: string,
  ): Promise<string | null> {
    try {
      await page.waitForURL(/blog\.naver\.com/, { timeout: 60_000 });
    } catch {
      this.log("url", "발행 후 리디렉션을 감지하지 못했습니다.", "warn");
    }
    await page.waitForTimeout(2_500);

    const currentUrl = page.url();
    const logNo = currentUrl.match(/logNo=(\d+)/)?.[1];
    if (logNo) return `https://blog.naver.com/${blogId}/${logNo}`;

    const directMatch = currentUrl.match(/blog\.naver\.com\/[^/]+\/(\d+)/);
    if (directMatch) return currentUrl.split("?")[0];

    // Fall back to the newest post shown inside the blog frame.
    try {
      const frame = page.frameLocator(NaverSelectors.editorFrames[0]);
      const href = await frame
        .locator("a[href*='logNo=']")
        .first()
        .getAttribute("href", { timeout: 5_000 });
      const fallbackLogNo = href?.match(/logNo=(\d+)/)?.[1];
      if (fallbackLogNo) return `https://blog.naver.com/${blogId}/${fallbackLogNo}`;
    } catch {
      // No link available; return the blog root below.
    }

    return `https://blog.naver.com/${blogId}`;
  }
}
