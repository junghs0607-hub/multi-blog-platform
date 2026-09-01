import type { FrameLocator, Locator, Page } from "playwright";
import { NaverSelectors } from "./NaverSelectors";
import { PublishError, PublishErrorCode, type PublishImage } from "../core/PublishResult";

/**
 * Thin wrapper around Naver SmartEditor ONE, which renders inside `mainFrame`.
 * Every interaction goes through candidate selector lists so a single markup
 * change does not break the whole flow.
 */
export class NaverEditor {
  constructor(private readonly page: Page) {}

  private frame(): FrameLocator {
    return this.page.frameLocator(NaverSelectors.editorFrames[0]);
  }

  private async firstVisible(selectors: readonly string[], timeout = 8_000): Promise<Locator | null> {
    const frame = this.frame();
    for (const selector of selectors) {
      const locator = frame.locator(selector).first();
      try {
        await locator.waitFor({ state: "visible", timeout });
        return locator;
      } catch {
        // Try next candidate.
      }
    }
    return null;
  }

  /** SmartEditor greets with draft-restore / help popups that block input. */
  async dismissPopups(): Promise<void> {
    const frame = this.frame();
    for (const selector of NaverSelectors.dismissPopups) {
      const locator = frame.locator(selector).first();
      try {
        if (await locator.isVisible({ timeout: 1_500 })) {
          await locator.click({ timeout: 3_000 });
          await this.page.waitForTimeout(400);
        }
      } catch {
        // Popup not present — expected in most runs.
      }
    }
  }

  async waitForEditor(): Promise<void> {
    const title = await this.firstVisible(NaverSelectors.title, 25_000);
    if (!title) {
      throw new PublishError(
        PublishErrorCode.EDITOR_NOT_FOUND,
        "네이버 스마트에디터를 찾지 못했습니다. 레이아웃이 변경되었을 수 있습니다.",
      );
    }
  }

  async setTitle(title: string): Promise<void> {
    const target = await this.firstVisible(NaverSelectors.title, 15_000);
    if (!target) {
      throw new PublishError(PublishErrorCode.EDITOR_NOT_FOUND, "제목 입력 영역을 찾지 못했습니다.");
    }
    await target.click();
    await this.page.keyboard.type(title, { delay: 12 });
    await this.page.waitForTimeout(300);
  }

  /** Types body text block by block; SmartEditor rejects raw HTML injection. */
  async setBody(blocks: string[]): Promise<void> {
    const body = await this.firstVisible(NaverSelectors.body, 15_000);
    if (!body) {
      throw new PublishError(PublishErrorCode.EDITOR_NOT_FOUND, "본문 입력 영역을 찾지 못했습니다.");
    }
    await body.click();
    for (let index = 0; index < blocks.length; index++) {
      await this.page.keyboard.type(blocks[index], { delay: 4 });
      if (index < blocks.length - 1) await this.page.keyboard.press("Enter");
    }
    await this.page.waitForTimeout(400);
  }

  /** Uploads images through Naver's native uploader so they are hosted there. */
  async uploadImages(images: PublishImage[]): Promise<number> {
    if (images.length === 0) return 0;
    const frame = this.frame();
    const files = images.map((image) => image.localPath);

    for (const selector of NaverSelectors.imageFileInput) {
      const input = frame.locator(selector).first();
      if ((await input.count()) === 0) continue;
      try {
        await input.setInputFiles(files);
        await this.page.waitForTimeout(1_500 * Math.min(files.length, 4));
        return files.length;
      } catch {
        // Try next input candidate.
      }
    }

    for (const selector of NaverSelectors.imageButton) {
      const button = frame.locator(selector).first();
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
        // Try next trigger candidate.
      }
    }

    throw new PublishError(
      PublishErrorCode.IMAGE_UPLOAD_FAILED,
      "네이버 이미지 업로드 UI에 접근하지 못했습니다.",
    );
  }

  /** Opens the publish side panel where category/tags/visibility live. */
  async openPublishPanel(): Promise<void> {
    const frame = this.frame();
    for (const selector of NaverSelectors.publishOpen) {
      const button = frame.locator(selector).first();
      try {
        if (await button.isVisible({ timeout: 4_000 })) {
          await button.click();
          await this.page.waitForTimeout(1_200);
          return;
        }
      } catch {
        // Try next candidate.
      }
    }
    throw new PublishError(PublishErrorCode.PUBLISH_FAILED, "발행 패널을 열지 못했습니다.");
  }

  async selectCategory(category: string | null): Promise<boolean> {
    if (!category) return false;
    const frame = this.frame();
    for (const selector of NaverSelectors.categorySelect) {
      const trigger = frame.locator(selector).first();
      try {
        if (!(await trigger.isVisible({ timeout: 3_000 }))) continue;
        await trigger.click();
        await this.page.waitForTimeout(600);
        const option = frame.locator(NaverSelectors.categoryOption).filter({ hasText: category }).first();
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
    const frame = this.frame();
    for (const selector of NaverSelectors.tagInput) {
      const input = frame.locator(selector).first();
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

  async setVisibility(visibility: "public" | "private"): Promise<void> {
    const frame = this.frame();
    const candidates =
      visibility === "public" ? NaverSelectors.openToPublic : NaverSelectors.openToPrivate;
    for (const selector of candidates) {
      const option = frame.locator(selector).first();
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

  /** Switches the panel to reservation mode and fills the target datetime. */
  async setSchedule(scheduledAt: Date): Promise<boolean> {
    const frame = this.frame();
    let toggled = false;
    for (const selector of NaverSelectors.scheduleToggle) {
      const toggle = frame.locator(selector).first();
      try {
        if (!(await toggle.count())) continue;
        await toggle.click({ force: true, timeout: 3_000 });
        toggled = true;
        break;
      } catch {
        // Try next candidate.
      }
    }
    if (!toggled) return false;

    await this.page.waitForTimeout(500);
    const yyyy = scheduledAt.getFullYear();
    const mm = String(scheduledAt.getMonth() + 1).padStart(2, "0");
    const dd = String(scheduledAt.getDate()).padStart(2, "0");
    const hour = String(scheduledAt.getHours()).padStart(2, "0");
    const minute = String(Math.floor(scheduledAt.getMinutes() / 10) * 10).padStart(2, "0");

    for (const selector of NaverSelectors.scheduleDate) {
      const input = frame.locator(selector).first();
      try {
        if (!(await input.count())) continue;
        await input.fill(`${yyyy}.${mm}.${dd}.`);
        break;
      } catch {
        // Try next candidate.
      }
    }
    for (const selector of NaverSelectors.scheduleHour) {
      try {
        await frame.locator(selector).first().selectOption(hour, { timeout: 3_000 });
        break;
      } catch {
        // Try next candidate.
      }
    }
    for (const selector of NaverSelectors.scheduleMinute) {
      try {
        await frame.locator(selector).first().selectOption(minute, { timeout: 3_000 });
        break;
      } catch {
        // Try next candidate.
      }
    }
    return true;
  }

  async confirmPublish(): Promise<void> {
    const frame = this.frame();
    for (const selector of NaverSelectors.publishConfirm) {
      const button = frame.locator(selector).first();
      try {
        if (!(await button.isVisible({ timeout: 4_000 }))) continue;
        await button.click();
        return;
      } catch {
        // Try next candidate.
      }
    }
    throw new PublishError(PublishErrorCode.PUBLISH_FAILED, "발행 확인 버튼을 찾지 못했습니다.");
  }
}
