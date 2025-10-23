/**
 * 가격 포맷 유틸리티
 * base_price_text와 base_price를 스마트하게 처리
 */

/**
 * 파트너 가격 표시 로직
 * @param base_price_text - 텍스트 가격 (우선순위 1)
 * @param base_price - 숫자 가격 (우선순위 2)
 * @returns 표시할 가격 문자열
 */
export function formatPartnerPrice(
  base_price_text: string | null | undefined,
  base_price: number | string | null | undefined
): string {
  // 1순위: base_price_text가 있으면 사용
  if (base_price_text && base_price_text.trim()) {
    const text = base_price_text.trim();

    // 순수 숫자인지 확인
    const numericValue = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(numericValue) && text.match(/^[\d,]+$/)) {
      // 순수 숫자면 포맷팅
      if (numericValue === 0) {
        return '무료';
      }
      return `${numericValue.toLocaleString()}원`;
    }

    // 텍스트면 그대로 반환
    return text;
  }

  // 2순위: base_price 사용
  if (base_price !== null && base_price !== undefined && base_price !== '') {
    const numericPrice = typeof base_price === 'string'
      ? parseFloat(base_price)
      : base_price;

    if (!isNaN(numericPrice)) {
      if (numericPrice === 0) {
        return '무료';
      }
      if (numericPrice > 0) {
        return `${numericPrice.toLocaleString()}원`;
      }
    }
  }

  // 3순위: 아무것도 없으면 빈 문자열 (아무것도 표시 안함)
  return '';
}

/**
 * 가격 입력값 검증 및 정리
 * @param input - 사용자 입력값
 * @returns 정리된 가격 문자열
 */
export function sanitizePriceInput(input: string): string {
  if (!input || !input.trim()) {
    return '';
  }

  const trimmed = input.trim();

  // 순수 숫자인 경우 콤마 제거
  const numericValue = parseFloat(trimmed.replace(/,/g, ''));
  if (!isNaN(numericValue) && trimmed.match(/^[\d,]+$/)) {
    return numericValue.toString();
  }

  // 텍스트는 그대로 반환
  return trimmed;
}

/**
 * 가격 미리보기 (입력 필드 아래에 표시할 내용)
 * @param input - 사용자 입력값
 * @returns 미리보기 문자열
 */
export function previewPrice(input: string): string {
  if (!input || !input.trim()) {
    return '가격 미표시';
  }

  const trimmed = input.trim();

  // 순수 숫자인 경우
  const numericValue = parseFloat(trimmed.replace(/,/g, ''));
  if (!isNaN(numericValue) && trimmed.match(/^[\d,]+$/)) {
    if (numericValue === 0) {
      return '표시: 무료';
    }
    return `표시: ${numericValue.toLocaleString()}원`;
  }

  // 텍스트는 그대로
  return `표시: ${trimmed}`;
}
