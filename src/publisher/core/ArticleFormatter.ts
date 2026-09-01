import type { PublishArticle } from "./PublishResult";

export type FormattedArticle = {
  title: string;
  html: string;
  /** Plain-text rendering used by editors that reject rich paste. */
  plainBlocks: string[];
  tags: string[];
  category: string | null;
  visibility: "public" | "private";
};

/**
 * Base formatter. Never mutates the source article — every method returns new
 * values so the original DB record stays untouched.
 */
export abstract class ArticleFormatter {
  abstract readonly platform: string;

  format(article: PublishArticle): FormattedArticle {
    const html = this.formatHtml(article.contentHtml);
    return {
      title: this.formatTitle(article.title),
      html,
      plainBlocks: this.toPlainBlocks(html),
      tags: this.formatTags(article.tags),
      category: article.category,
      visibility: article.visibility,
    };
  }

  protected formatTitle(title: string): string {
    return title.replace(/\s+/g, " ").trim().slice(0, 100);
  }

  protected formatTags(tags: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of tags) {
      const tag = raw.replace(/^#/, "").replace(/[,\s]+/g, " ").trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(tag.slice(0, 30));
      if (result.length >= this.maxTags) break;
    }
    return result;
  }

  protected get maxTags(): number {
    return 10;
  }

  /** Platform-specific HTML normalization. */
  protected abstract formatHtml(html: string): string;

  /** Removes editor-hostile markup that every platform rejects. */
  protected sanitizeCommon(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/ on[a-z]+="[^"]*"/gi, "")
      .replace(/ on[a-z]+='[^']*'/gi, "")
      .replace(/\u00a0/g, " ");
  }

  /** Splits HTML into readable text blocks, preserving list/quote semantics. */
  protected toPlainBlocks(html: string): string[] {
    const withBreaks = html
      .replace(/<\/(p|div|h[1-6]|li|blockquote|figure|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<figcaption[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'");

    return withBreaks
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter((line) => line.length > 0);
  }
}

/** Naver SmartEditor keeps simple block markup but drops custom classes. */
export class NaverFormatter extends ArticleFormatter {
  readonly platform = "NAVER";
  protected get maxTags(): number {
    return 30; // Naver allows up to 30 tags.
  }

  protected formatHtml(html: string): string {
    return this.sanitizeCommon(html)
      .replace(/ class="[^"]*"/gi, "")
      .replace(/<figure[^>]*>/gi, "<div>")
      .replace(/<\/figure>/gi, "</div>")
      .replace(/<figcaption[^>]*>/gi, "<p><em>")
      .replace(/<\/figcaption>/gi, "</em></p>")
      .replace(/<pre[^>]*>/gi, "<blockquote>")
      .replace(/<\/pre>/gi, "</blockquote>")
      .trim();
  }
}

/** Tistory ships TinyMCE and accepts richer HTML, including code blocks. */
export class TistoryFormatter extends ArticleFormatter {
  readonly platform = "TISTORY";

  protected formatHtml(html: string): string {
    return this.sanitizeCommon(html)
      .replace(/ style="[^"]*border-radius:[^"]*"/gi, "")
      .replace(/<figure([^>]*)>/gi, '<figure$1 contenteditable="false">')
      .trim();
  }
}

export function createFormatter(platform: "NAVER" | "TISTORY"): ArticleFormatter {
  return platform === "NAVER" ? new NaverFormatter() : new TistoryFormatter();
}
