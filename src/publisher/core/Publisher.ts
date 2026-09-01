import { BrowserSession } from "./BrowserSession";
import { createFormatter, type FormattedArticle } from "./ArticleFormatter";
import {
  PublishError,
  PublishErrorCode,
  toPublishError,
  type PublishAccountConfig,
  type PublishArticle,
  type PublishLogEntry,
  type PublishResult,
  type SessionCheckResult,
} from "./PublishResult";

/**
 * Adapter base class. Adding a new platform (e.g. WordPress) only requires a
 * subclass implementing checkSession() and runPublish() plus its own
 * Selectors/Editor/Session files — nothing here or in the worker changes.
 */
export abstract class Publisher {
  abstract readonly platform: "NAVER" | "TISTORY";
  protected readonly account: PublishAccountConfig;
  protected readonly session: BrowserSession;
  private readonly logs: PublishLogEntry[] = [];

  constructor(account: PublishAccountConfig) {
    this.account = account;
    this.session = new BrowserSession(account.profileDir);
  }

  protected log(step: string, message: string, level: PublishLogEntry["level"] = "info") {
    this.logs.push({ step, level, message });
  }

  protected getLogs(): PublishLogEntry[] {
    return [...this.logs];
  }

  protected formatArticle(article: PublishArticle): FormattedArticle {
    return createFormatter(this.platform).format(article);
  }

  /** Verifies the stored browser profile is still logged in. */
  abstract checkSession(): Promise<SessionCheckResult>;

  /** Platform-specific publishing pipeline. Returns the external post URL. */
  protected abstract runPublish(article: PublishArticle): Promise<string | null>;

  /**
   * Template method: wraps runPublish with uniform error typing, logging and
   * guaranteed browser teardown so one platform's failure never leaks.
   */
  async publish(article: PublishArticle): Promise<PublishResult> {
    try {
      this.log("start", `${this.platform} 발행을 시작합니다. (계정: ${this.account.label})`);
      const externalUrl = await this.runPublish(article);
      this.log("done", externalUrl ? `발행 완료: ${externalUrl}` : "발행 완료 (URL 미확인)");
      return { ok: true, externalUrl, logs: this.getLogs() };
    } catch (error) {
      const publishError = toPublishError(error);
      this.log("error", `${publishError.code}: ${publishError.message}`, "error");
      return {
        ok: false,
        code: publishError.code,
        message: publishError.message,
        logs: this.getLogs(),
      };
    } finally {
      await this.session.close();
    }
  }

  /** Runs a session check with the same safety guarantees as publish(). */
  async testSession(): Promise<SessionCheckResult> {
    try {
      return await this.checkSession();
    } catch (error) {
      const publishError = toPublishError(error);
      return { ok: false, code: publishError.code, message: publishError.message };
    } finally {
      await this.session.close();
    }
  }

  protected requireLogin(message: string): never {
    throw new PublishError(PublishErrorCode.LOGIN_REQUIRED, message);
  }
}
