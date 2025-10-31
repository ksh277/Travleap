/**
 * 스마트택배 API 유틸리티
 *
 * 기능:
 * - 택배사 코드 매핑 (내부 코드 <-> 스마트택배 코드)
 * - 배송 조회 API 호출
 *
 * API 문서: https://tracking.sweettracker.co.kr/docs
 */

// 스마트택배 API 택배사 코드 매핑 (주요 택배사만)
export const COURIER_CODE_MAP: Record<string, string> = {
  // 주요 택배사 (점유율 기준)
  'cj': '04',           // CJ대한통운 (점유율 1위)
  'hanjin': '05',       // 한진택배 (점유율 2위)
  'lotte': '08',        // 롯데택배 (점유율 3위)
  'post': '01',         // 우체국택배
  'coupang': '46',      // 쿠팡 로지스틱스
  'logen': '06',        // 로젠택배

  // 편의점 택배
  'gs25': '24',         // GS25 편의점택배 (GSPostbox)
  'cu': '46',           // CU 편의점택배 (쿠팡 로지스틱스)
  'epost': '01',        // 우체국 편의점택배 (세븐일레븐 등)
};

// 스마트택배 코드 -> 내부 코드 역매핑
export const REVERSE_COURIER_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(COURIER_CODE_MAP).map(([key, value]) => [value, key])
);

/**
 * 내부 택배사 코드를 스마트택배 API 코드로 변환
 */
export function getCourierCode(internalCode: string): string | null {
  return COURIER_CODE_MAP[internalCode] || null;
}

/**
 * 스마트택배 택배사 코드를 내부 코드로 변환
 */
export function getInternalCourierCode(apiCode: string): string | null {
  return REVERSE_COURIER_MAP[apiCode] || null;
}

/**
 * 배송 현황 인터페이스
 */
export interface TrackingLevel {
  level: number;           // 배송 단계 (1: 집화, 2: 간선, 3: 배송, 4: 완료)
  label?: string;          // 단계 라벨
  manName?: string;        // 담당자명
  manPic?: string;         // 담당자 연락처
  telno?: string;          // 연락처
  telno2?: string;         // 연락처2
  time?: string;           // 시간 (Unix timestamp)
  timeString?: string;     // 시간 문자열
  where?: string;          // 위치
  kind?: string;           // 상태 코드
  remark?: string;         // 비고
}

export interface TrackingInfo {
  code: number;                    // 응답 코드 (200: 성공)
  message?: string;                // 메시지
  level: number;                   // 현재 배송 단계
  complete: boolean;               // 배송 완료 여부
  invoiceNo: string;               // 송장번호
  itemName?: string;               // 상품명
  receiverName?: string;           // 수취인명
  receiverAddr?: string;           // 수취인 주소
  senderName?: string;             // 발신인명
  productInfo?: string;            // 상품 정보
  orderNumber?: string;            // 주문번호
  adUrl?: string;                  // 광고 URL
  estimate?: string;               // 배송 예정일
  recipient?: string;              // 수령인
  result?: string;                 // 결과
  trackingDetails?: TrackingLevel[]; // 배송 추적 상세
}

/**
 * 스마트택배 API로 배송 조회
 */
export async function queryTracking(
  courierCode: string,
  invoiceNo: string,
  apiKey: string
): Promise<TrackingInfo> {
  const sweetTrackerCode = getCourierCode(courierCode);

  if (!sweetTrackerCode) {
    throw new Error(`지원하지 않는 택배사입니다: ${courierCode}`);
  }

  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('스마트택배 API 키가 설정되지 않았습니다. .env 파일에서 SWEETTRACKER_API_KEY를 설정해주세요.');
  }

  const url = `http://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${encodeURIComponent(apiKey)}&t_code=${sweetTrackerCode}&t_invoice=${encodeURIComponent(invoiceNo)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // 에러 처리
    if (data.code !== 200) {
      throw new Error(data.message || '배송 조회에 실패했습니다.');
    }

    return data as TrackingInfo;
  } catch (error) {
    console.error('스마트택배 API 호출 실패:', error);
    throw error;
  }
}

/**
 * 택배사 코드 -> 택배사명 매핑
 */
export const COURIER_NAMES: Record<string, string> = {
  'cj': 'CJ대한통운',
  'hanjin': '한진택배',
  'lotte': '롯데택배',
  'post': '우체국택배',
  'coupang': '쿠팡 로지스틱스',
  'logen': '로젠택배',
  'gs25': 'GS25 편의점택배',
  'cu': 'CU 편의점택배',
  'epost': '세븐일레븐 편의점택배',
};

/**
 * 택배사 코드로 택배사명 가져오기
 */
export function getCourierName(code: string): string {
  return COURIER_NAMES[code] || code;
}

/**
 * 배송 단계를 한글로 변환
 */
export function getLevelLabel(level: number): string {
  switch (level) {
    case 1:
      return '집화완료';
    case 2:
      return '배송중(간선)';
    case 3:
      return '배송중(배송)';
    case 4:
      return '배송완료';
    case 5:
      return '배송보류';
    case 6:
      return '배송취소';
    default:
      return '알 수 없음';
  }
}
