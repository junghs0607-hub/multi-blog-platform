import type { ReportReason } from "@/types";

/** 상태 변경 API 요청에 반드시 포함해야 하는 CSRF 방어용 커스텀 헤더 */
export const CSRF_HEADER = "x-mosaic-csrf";

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "spam", label: "스팸", description: "광고, 반복 게시, 오해의 소지가 있는 링크" },
  { value: "nudity", label: "음란물·선정성", description: "성적인 콘텐츠 또는 노출" },
  { value: "violence", label: "폭력·위험", description: "폭력적이거나 위험한 행위 조장" },
  { value: "hate", label: "혐오 발언", description: "특정 집단에 대한 차별·혐오" },
  { value: "harassment", label: "괴롭힘", description: "특정인을 겨냥한 괴롭힘·따돌림" },
  { value: "copyright", label: "저작권 침해", description: "허락 없이 타인의 저작물을 게시" },
  { value: "misinformation", label: "허위 정보", description: "사실과 다른 정보의 유포" },
  { value: "other", label: "기타", description: "위 항목에 해당하지 않는 문제" },
];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
) as Record<ReportReason, string>;

export const PIN_TITLE_MAX = 100;
export const PIN_DESCRIPTION_MAX = 1000;
export const BOARD_NAME_MAX = 50;
export const BOARD_DESCRIPTION_MAX = 500;
export const COMMENT_MAX = 1000;
