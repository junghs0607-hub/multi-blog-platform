import type { FrameLocator, Locator, Page } from "playwright";
import { TistorySelectors } from "./TistorySelectors";
import { PublishError, PublishErrorCode, type PublishImage } from "../core/PublishResult";

/**
 * Controls the Tistory TinyMCE editor. Body content lives inside an iframe, so
 * all text interactions go through Playwright's FrameLocator API.
 */
export class TistoryEditor {
  constructor(private readonly page: Page) {}

  private async firstVisible(selectors: readonly string[], timeout = 8_000): Promise<Locator | null> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      try {
        await locator.waitFor({ state: "visible", timeout });
        return locator;
      } catch {
        // Try next candidate.
      }
    }
    return null;
  }

  private bodyFrame(): FrameLocator {
    return this.page.frameLocator(TistorySelectors.editorIframe[0]);
  }

  /** Tistory shows a native confirm() for restoring autosaved drafts. */
  async dismissDraftPopup(): Promise<void> {
    this.page.once("dialog", (dialog) => {
      dialog.dismiss().catch(() => undefined);
    });
    await this.page.waitForTimeout(1_200);

    for (const selector of TistorySelectors.draftPopupCancel) {
      const locator = this.page.locator(selector).first();
      try {
        if (await locator.isVisible({ timeout: 1_200 })) {
          await locator.click({ timeout: 3_000 });
          await this.page.waitForTimeout(400);
        }
      } catch {
        // Popup absent — normal.
      }
    }
  }

  async waitForEditor(): Promise<void> {
    const title = await this.firstVisible(TistorySelectors.title, 25_000);
    if (!title) {
      throw new PublishError(
        PublishErrorCode.EDITOR_NOT_FOUND,
        "티스토리 에디터를 찾지 못했습니다. 레이아웃이 변경되었을 수 있습니다.",
      );
    }
  }

  async setTitle(title: string): Promise<void> {
    const target = await this.firstVisible(TistorySelectors.title, 15_000);
    if (!target) {
      throw new PublishError(PublishErrorCode.EDITOR_NOT_FOUND, "제목 입력란을 찾지 못했습니다.");
    }
    await target.click();
    await target.fill(title);
    await this.page.waitForTimeout(300);
  }

  /**
   * Writes the body into TinyMCE. Rich HTML is injected directly through the
   * TinyMCE API when available, otherwise typed as plain text blocks.
   */
  async setBody(html: string, plainBlocks: string[]): Promise<"html" | "text"> {
    const injected = await this.page
      .evaluate((content) => {
        const win = window as unknown as {
          tinymce?: { activeEditor?: { setContent: (value: string) => void } };
        };
        if (win.tinymce?.activeEditor) {
          win.tinymce.activeEditor.setContent(content);
          return true;
        }
        return false;
      }, html)
      .catch(() => false);

    if (injected) {
      await this.page.waitForTimeout(600);
      return "html";
    }

    const body = this.bodyFrame().locator(TistorySelectors.editorBody[0]).first();
    try {
      await body.waitFor({ state: "visible", timeout: 12_000 });
    } catch {
      throw new PublishError(PublishErrorCode.EDITOR_NOT_FOUND, "본문 iframe을 찾지 못했습니다.");
    }

    await body.click();
    for (let index = 0; index < plainBlocks.length; index++) {
      await this.page.keyboard.type(plainBlocks[index], { delay: 4 });
      if (index < plainBlocks.length - 1) await this.page.keyboard.press("Enter");
    }
    await this.page.waitForTimeout(400);
    return "text";
  }

  /** Uploads images to Tistory's own CDN via the native attach input. */
  async uploadImages(images: PublishImage[]): Promise<number> {
    if (images.length === 0) return 0;
    const files = images.map((image) => image.localPath);

    for (const selector of TistorySelectors.imageFileInput) {
      const input = this.page.locator(selector).first();
      if ((await input.count()) === 0) continue;
      try {
        await input.setInputFiles(files);
        await this.page.waitForTimeout(1_500 * Math.min(files.length, 4));
        return files.length;
      } catch {
        // Try next candidate.
      }
    }

    for (const selector of TistorySelectors.imageButton) {
      const button = this.page.locator(selector).first();
      if ((await button.count()) === 0) continue;
      try {
        const [chooser] = await Promise.all([
          this.page.waitForEvent("filechooser", { timeout: 12_000 }),
          button.click(),
        ]);
        await chooser.setFiles(files);
        await this.page.waitForTimeout(1_500 * Math.min(files.length, 4));
        return files.length;
      } catch {
        // Try next candidate.
      }
    }

    throw new PublishError(
      PublishErrorCode.IMAGE_UPLOAD_FAILED,
      "티스토리 이미지 업로드 UI에 접근하지 못했습니다.",
    );
  }

  async selectCategory(category: string | null): Promise<boolean> {
    if (!category) return false;
    for (const selector of TistorySelectors.categoryButton) {
      const trigger = this.page.locator(selector).first();
      try {
        if (!(await trigger.isVisible({ timeout: 3_000 }))) continue;
        await trigger.click();
        await this.page.waitForTimeout(600);
        const option = this.page.locator(TistorySelectors.categoryOption).filter({ hasText: category }).first();
        if ((await option.count()) === 0) return false;
        await option.click();
        await this.page.waitForTimeout(400);
        return true;
      } catch {
        // Try next candidate.
      }
    }
    return false;
  }

  async enterTags(tags: string[]): Promise<number> {
    if (tags.length === 0) return 0;
    for (const selector of TistorySelectors.tagInput) {
      const input = this.page.locator(selector).first();
      try {
        if (!(await input.isVisible({ timeout: 3_000 }))) continue;
        await input.click();
        for (const tag of tags) {
          await input.type(tag, { delay: 25 });
          await this.page.keyboard.press("Enter");
          await this.page.waitForTimeout(180);
        }
        return tags.length;
      } catch {
        // Try next candidate.
      }
    }
    throw new PublishError(PublishErrorCode.TAG_INPUT_FAILED, "태그 입력란을 찾지 못했습니다.");
  }

  /** Opens the publish layer holding visibility / schedule controls. */
  async openPublishLayer(): Promise<void> {
    for (const selector of TistorySelectors.publishLayerOpen) {
      const button = this.page.locator(selector).first();
      try {
        if (!(await button.isVisible({ timeout: 4_000 }))) continue;
        await button.click();
        await this.page.waitForTimeout(900);
        return;
      } catch {
        // Try next candidate.
      }
    }
    throw new PublishError(PublishErrorCode.PUBLISH_FAILED, "발행 레이어를 열지 못했습니다.");
  }

  async setVisibility(visibility: "public" | "private"): Promise<void> {
    const candidates =
      visibility === "public" ? TistorySelectors.visibilityOpen : TistorySelectors.visibilityPrivate;
    for (const selector of candidates) {
      const option = this.page.locator(selector).first();
      try {
        if (!(await option.count())) continue;
        await option.click({ force: true, timeout: 3_000 });
        await this.page.waitForTimeout(250);
        return;
      } catch {
        // Try next candidate.
      }
    }
  }

  async setSchedule(scheduledAt: Date): Promise<boolean> {
    let toggled = false;
    for (const selector of TistorySelectors.scheduleRadio) {
      const radio = this.page.locator(selector).first();
      try {
        if (!(await radio.count())) continue;
        await radio.click({ force: true, timeout: 3_000 });
        toggled = true;
        break;
      } catch {
        // Try next candidate.
      }
    }
    if (!toggled) return false;

    await this.page.waitForTimeout(400);
    const date = `${scheduledAt.getFullYear()}-${String(scheduledAt.getMonth() + 1).padStart(2, "0")}-${String(
      scheduledAt.getDate(),
    ).padStart(2, "0")}`;
    const time = `${String(scheduledAt.getHours()).padStart(2, "0")}:${String(scheduledAt.getMinutes()).padStart(2, "0")}`;

    for (const selector of TistorySelectors.scheduleDate) {
      try {
        await this.page.locator(selector).first().fill(date, { timeout: 3_000 });
        break;
      } catch {
        // Try next candidate.
      }
    }
    for (const selector of TistorySelectors.scheduleTime) {
      try {
        await this.page.locator(selector).first().fill(time, { timeout: 3_000 });
        break;
      } catch {
        // Try next candidate.
      }
    }
    return true;
  }

  async confirmPublish(): Promise<void> {
    for (const selector of TistorySelectors.publishConfirm) {
      const button = this.page.locator(selector).first();
      try {
        if (!(await button.isVisible({ timeout: 4_000 }))) continue;
        await button.click();
        return;
      } catch {
        // Try next candidate.
      }
    }
    throw new PublishError(PublishErrorCode.PUBLISH_FAILED, "발행 버튼을 찾지 못했습니다.");
  }
}
