import { Publisher } from "../core/Publisher";
import { PublishError, PublishErrorCode, type PublishArticle, type SessionCheckResult } from "../core/PublishResult";
import { TistoryEditor } from "./TistoryEditor";
import { TistoryUrls } from "./TistorySelectors";
import { checkTistorySession, isTistoryLoggedIn, openTistoryLoginWindow } from "./TistorySession";

/**
 * Tistory adapter.
 *
 * 로그인 세션 확인 → 새 글 → 제목 → 본문(TinyMCE) → 이미지 →
 * 카테고리 → 태그 → 공개설정 → 즉시/예약 발행 → URL 추출
 */
export class TistoryPublisher extends Publisher {
  readonly platform = "TISTORY" as const;

  private get blogAddress(): string {
    if (!this.account.blogAddress) {
      throw new PublishError(
        PublishErrorCode.PUBLISH_FAILED,
        "티스토리 블로그 주소가 설정되지 않았습니다. 계정 설정에서 입력하세요.",
      );
    }
    return this.account.blogAddress;
  }

  async checkSession(): Promise<SessionCheckResult> {
    const page = await this.session.newPage();
    return checkTistorySession(page, this.account.blogAddress);
  }

  async interactiveLogin(waitMs = 180_000): Promise<SessionCheckResult> {
    const page = await this.session.newPage();
    const success = await openTistoryLoginWindow(page, waitMs);
    return success
      ? { ok: true, message: "티스토리 로그인이 저장되었습니다." }
      : {
          ok: false,
          code: PublishErrorCode.LOGIN_REQUIRED,
          message: "제한 시간 내 로그인이 완료되지 않았습니다.",
        };
  }

  protected async runPublish(article: PublishArticle): Promise<string | null> {
    const page = await this.session.newPage();

    this.log("session", "티스토리 로그인 세션을 확인합니다.");
    if (!(await isTistoryLoggedIn(page))) {
      this.requireLogin("티스토리 로그인 세션이 없습니다. 관리자 화면에서 로그인을 갱신하세요.");
    }

    const blog = this.blogAddress;
    this.log("navigate", `새 글 작성 페이지로 이동합니다. (${blog}.tistory.com)`);
    await page.goto(TistoryUrls.write(blog), { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (page.url().includes("/auth/login") || page.url().includes("accounts.kakao.com")) {
      throw new PublishError(PublishErrorCode.SESSION_EXPIRED, "세션이 만료되어 로그인 페이지로 이동했습니다.");
    }

    const editor = new TistoryEditor(page);
    await editor.dismissDraftPopup();
    await editor.waitForEditor();

    const formatted = this.formatArticle(article);

    this.log("title", "제목을 입력합니다.");
    await editor.setTitle(formatted.title);

    const mode = await editor.setBody(formatted.html, formatted.plainBlocks);
    this.log("body", mode === "html" ? "본문 HTML을 주입했습니다." : "본문을 텍스트로 입력했습니다.");

    if (article.images.length > 0) {
      try {
        const uploaded = await editor.uploadImages(article.images);
        this.log("image", `이미지 ${uploaded}장을 티스토리에 직접 업로드했습니다.`);
      } catch (error) {
        this.log("image", error instanceof Error ? error.message : "이미지 업로드 실패", "warn");
      }
    }

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

    this.log("publish-panel", "발행 레이어를 엽니다.");
    await editor.openPublishLayer();
    await editor.setVisibility(formatted.visibility);
    this.log("visibility", `공개 설정: ${formatted.visibility === "public" ? "공개" : "비공개"}`);

    if (article.scheduledAt && article.scheduledAt.getTime() > Date.now()) {
      const scheduled = await editor.setSchedule(article.scheduledAt);
      this.log(
        "schedule",
        scheduled ? `예약 발행 시간 설정: ${article.scheduledAt.toISOString()}` : "예약 UI를 찾지 못해 즉시 발행합니다.",
        scheduled ? "info" : "warn",
      );
    }

    this.log("publish", "발행을 실행합니다.");
    await editor.confirmPublish();

    try {
      await page.waitForURL(new RegExp(`${blog}\\.tistory\\.com`), { timeout: 60_000 });
    } catch {
      this.log("url", "발행 후 리디렉션을 감지하지 못했습니다.", "warn");
    }
    await page.waitForTimeout(2_500);

    const url = page.url();
    const entryMatch = url.match(new RegExp(`https?://${blog}\\.tistory\\.com/(\\d+)`));
    if (entryMatch) return `https://${blog}.tistory.com/${entryMatch[1]}`;
    return `https://${blog}.tistory.com`;
  }
}
