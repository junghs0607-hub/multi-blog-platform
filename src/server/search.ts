/**
 * 검색어 처리
 *
 * PostgreSQL 'simple' 텍스트 검색 구성은 공백 단위로 토큰화하므로, 한국어처럼 조사가 붙거나(고양이가)
 * 띄어쓰기 없이 쓰이는 언어는 부분 일치가 어렵습니다. 이를 보완하기 위해
 *  - 문서: 제목/설명/태그의 CJK 연속 문자열을 2-gram(바이그램)으로 분해하여 search_ngrams 에 저장 (가중치 C)
 *  - 질의: 각 검색어를 접두 일치('고양':*) OR 바이그램 AND 조합('고양' & '양이')으로 변환
 * 확장 모듈(pg_trgm, 형태소 분석기) 없이 GIN 인덱스만으로 한국어 부분 검색을 지원합니다.
 */

const CJK_RUN = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]{2,}/gu;
const HAS_CJK = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/u;
const MAX_NGRAMS = 3000;

export function bigrams(run: string): string[] {
  const chars = Array.from(run);
  if (chars.length < 2) return [];
  const out: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) out.push(chars[i]! + chars[i + 1]!);
  return out;
}

export function buildSearchNgrams(...texts: (string | null | undefined)[]): string {
  const set = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.toLowerCase().matchAll(CJK_RUN)) {
      for (const bg of bigrams(match[0])) {
        set.add(bg);
        if (set.size >= MAX_NGRAMS) return [...set].join(" ");
      }
    }
  }
  return [...set].join(" ");
}

/** tsquery 렉심 인용 (특수문자 제거 후 작은따옴표로 감싸기) */
function lexeme(term: string): string {
  return `'${term.replace(/['\\]/g, "")}'`;
}

/**
 * 사용자 검색어 → to_tsquery('simple', ...) 입력 문자열. 유효한 검색어가 없으면 null.
 * 예) "귀여운 고양이" → ('귀여운':* | ('귀여' & '여운')) & ('고양이':* | ('고양' & '양이'))
 */
export function buildTsQuery(q: string): string | null {
  const terms = q
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^#/, "")
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]/gu, "").replace(/^[-_]+|[-_]+$/g, ""))
    .filter(Boolean)
    .slice(0, 8);
  if (terms.length === 0) return null;

  const parts = terms.map((term) => {
    const prefix = `${lexeme(term)}:*`;
    if (!HAS_CJK.test(term)) return prefix;
    const grams = bigrams(term);
    if (grams.length <= 1) return prefix;
    return `(${prefix} | (${grams.map(lexeme).join(" & ")}))`;
  });
  return parts.join(" & ");
}
