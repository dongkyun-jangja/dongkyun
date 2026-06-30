/**
 * 배송 요청 Excel의 '특이사항' 컬럼 텍스트를 파싱해 상품 플래그를 감지한다.
 *
 * MD가 수기 입력하므로 아래 변형을 모두 동일하게 인식한다.
 *   - 공백 유무 (블랙멤버십 / 블랙 멤버십)
 *   - 모음 변형  (멤버십 / 맴버십)
 *   - 어미 변형  (멤버십 / 멤버쉽)
 *   - 영한 혼용  (콜드체인 / cold chain)
 *   - 유사어     (냉장, 냉동 → 콜드체인으로 처리)
 */

/** 입력 문자열을 공백 제거 + 소문자로 정규화 */
function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

// ─── 블랙 멤버십 키워드 ──────────────────────────────────────────────────────
// 공백 제거 후 매칭하므로 "블랙 멤버십" / "블랙멤버십" 구분 불필요.
// 모음(멤/맴) × 어미(십/쉽) 4가지 조합만 등록.
const BLACK_KEYWORDS: string[] = [
  '블랙멤버십',  // 블랙 멤버십
  '블랙맴버십',  // 블랙 맴버십
  '블랙멤버쉽',  // 블랙 멤버쉽
  '블랙맴버쉽',  // 블랙 맴버쉽
  'blackmembership',
  'blackmember',
];

// ─── 콜드체인 키워드 ─────────────────────────────────────────────────────────
const COLD_CHAIN_KEYWORDS: string[] = [
  '콜드체인',    // 콜드 체인
  'coldchain',   // cold chain
  '냉장',        // 냉장 / 냉장상품 / 냉장보관
  '냉동',        // 냉동 / 냉동상품
  '냉장보관',
];

/** 특이사항 텍스트에서 블랙멤버십 여부 감지 */
export function isBlackMembership(note: string | undefined | null): boolean {
  if (!note) return false;
  const n = normalize(note);
  return BLACK_KEYWORDS.some((kw) => n.includes(kw));
}

/** 특이사항 텍스트에서 콜드체인 여부 감지 */
export function isColdChainItem(note: string | undefined | null): boolean {
  if (!note) return false;
  const n = normalize(note);
  return COLD_CHAIN_KEYWORDS.some((kw) => n.includes(kw));
}

/**
 * 특이사항 텍스트 전체를 파싱해 플래그 객체 반환.
 * Excel 업로드 파싱 로직에서 호출하면 된다.
 *
 * @example
 * parseItemFlags('블랙 맴버쉽 상품입니다')
 * // → { isBlack: true, isColdChain: false }
 *
 * parseItemFlags('콜드 체인 상품 / 냉장 보관 필수')
 * // → { isBlack: false, isColdChain: true }
 */
export function parseItemFlags(note: string | undefined | null): {
  isBlack: boolean;
  isColdChain: boolean;
} {
  return {
    isBlack: isBlackMembership(note),
    isColdChain: isColdChainItem(note),
  };
}
