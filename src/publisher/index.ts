import type { Publisher } from "./core/Publisher";
import type { PublishAccountConfig } from "./core/PublishResult";
import { NaverPublisher } from "./naver/NaverPublisher";
import { TistoryPublisher } from "./tistory/TistoryPublisher";

export type SupportedPlatform = "NAVER" | "TISTORY";

export const SUPPORTED_PLATFORMS: { value: SupportedPlatform; label: string; needsAddress: string }[] = [
  { value: "NAVER", label: "Naver Blog", needsAddress: "네이버 블로그 ID (blog.naver.com/<ID>)" },
  { value: "TISTORY", label: "Tistory", needsAddress: "티스토리 주소 (<주소>.tistory.com)" },
];

/**
 * Single place where platforms are registered. Adding WordPress later means
 * writing its adapter folder and appending one line here.
 */
export function createPublisher(account: PublishAccountConfig): Publisher {
  switch (account.platform) {
    case "NAVER":
      return new NaverPublisher(account);
    case "TISTORY":
      return new TistoryPublisher(account);
    default:
      throw new Error(`지원하지 않는 플랫폼입니다: ${account.platform}`);
  }
}

export { Publisher } from "./core/Publisher";
export * from "./core/PublishResult";
