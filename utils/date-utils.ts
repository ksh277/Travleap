/**
 * 날짜/시간 유틸리티 함수
 * MySQL DATETIME(UTC)을 한국 시간으로 변환
 */

/**
 * MySQL DATETIME 문자열을 한국 시간 문자열로 변환
 *
 * @param dateStr MySQL DATETIME 문자열 (예: "2025-10-29 17:31:00")
 * @param options Intl.DateTimeFormatOptions
 * @returns 한국 시간 문자열 (예: "2025년 10월 30일 오전 02:31")
 */
export function formatKoreanDateTime(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '-';

  try {
    // MySQL DATETIME은 UTC로 저장되므로 명시적으로 UTC로 파싱
    // 타임존 정보가 없으면 'Z'를 붙여서 UTC로 해석하도록 함
    let utcDateStr = dateStr;
    if (!dateStr.includes('Z') && !dateStr.includes('+')) {
      // DATETIME 형식 (YYYY-MM-DD HH:mm:ss)을 ISO 8601 UTC 형식으로 변환
      utcDateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    const date = new Date(utcDateStr);

    // 유효하지 않은 날짜 체크
    if (isNaN(date.getTime())) {
      console.warn('[formatKoreanDateTime] 유효하지 않은 날짜:', dateStr);
      return dateStr;
    }

    // 기본 옵션: 년월일 시분 표시
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
      ...options
    };

    return date.toLocaleString('ko-KR', defaultOptions);
  } catch (error) {
    console.error('[formatKoreanDateTime] 날짜 변환 오류:', error, dateStr);
    return dateStr;
  }
}

/**
 * 짧은 형식 (날짜만)
 */
export function formatKoreanDate(dateStr: string | null | undefined): string {
  return formatKoreanDateTime(dateStr, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 짧은 형식 (시간만)
 */
export function formatKoreanTime(dateStr: string | null | undefined): string {
  return formatKoreanDateTime(dateStr, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  });
}

/**
 * 간단한 형식 (MM. DD. HH:mm)
 */
export function formatKoreanDateTimeShort(dateStr: string | null | undefined): string {
  return formatKoreanDateTime(dateStr, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  });
}
