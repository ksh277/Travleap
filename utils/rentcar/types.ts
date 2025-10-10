/**
 * 렌트카 검색·예약 시스템 타입 정의
 */

// 렌트카 공급업체 타입
export type CarSupplier = 'rentalcars' | 'sabre' | 'cartrawler' | 'custom';

// ACRISS 코드 (Association of Car Rental Industry Systems Standards)
export interface AcrissCode {
  code: string; // 예: "ECMR"
  category: string; // E = Economy
  type: string; // C = Compact
  transmission: string; // M = Manual, A = Automatic
  fuel: string; // R = Gasoline, D = Diesel, H = Hybrid, E = Electric
}

// 차량 정보
export interface Vehicle {
  acriss: string; // ACRISS 코드
  make?: string; // 제조사: Hyundai, Kia, etc
  model: string; // 모델명: "Avante or similar"
  transmission: 'Manual' | 'Automatic';
  fuel: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';
  seats: number; // 탑승 인원
  doors: number; // 문 개수
  luggage?: {
    large?: number; // 대형 캐리어
    small?: number; // 소형 가방
  };
  airConditioning: boolean;
  images: string[]; // 차량 이미지 URL 목록
  features?: string[]; // 기타 옵션: ["Bluetooth", "USB", "Navigation"]
}

// 픽업/반납 장소 정보
export interface LocationInfo {
  code: string; // 공항 코드(IATA) 또는 장소 ID
  type: 'AIRPORT' | 'DOWNTOWN' | 'HOTEL' | 'RAILWAY';
  name?: string; // 예: "제주국제공항"
  address?: string;
  lat?: number;
  lng?: number;
  openHours?: string; // 예: "08:00"
  closeHours?: string; // 예: "22:00"
  afterHoursFee?: number; // 영업시간 외 수수료
}

// 가격 정보
export interface PriceBreakdown {
  base: number; // 기본 요금 (렌트 요금)
  taxes: number; // 세금
  fees: Array<{
    type: 'airport' | 'young_driver' | 'one_way' | 'after_hours' | 'other';
    name: string;
    amount: number;
  }>;
  total: number; // 총 요금
  currency: string; // KRW, USD, etc
  paymentType: 'PREPAID' | 'PAY_AT_PICKUP'; // 선불/현장결제
  depositRequired?: number; // 보증금
}

// 보험 정보
export interface InsuranceInfo {
  cdw: boolean; // Collision Damage Waiver (차량손해면책)
  scdw: boolean; // Super CDW
  tp: boolean; // Theft Protection (도난보험)
  pai: boolean; // Personal Accident Insurance (탑승자보험)
  excess: number; // 면책금 (사고 시 고객 부담금)
  deposit: number; // 보증금
  additionalInsurance?: Array<{
    code: string;
    name: string;
    price: number;
    per: 'DAY' | 'RENTAL';
  }>;
}

// 정책 정보
export interface RentalPolicies {
  mileage: 'UNLIMITED' | 'LIMITED'; // 주행거리 제한
  mileageLimit?: number; // 제한이 있을 경우 km
  fuel: 'FULL_TO_FULL' | 'FULL_TO_EMPTY' | 'SAME_TO_SAME'; // 유류 정책
  insurance: InsuranceInfo;
  cancellation: {
    free: boolean; // 무료 취소 가능 여부
    freeUntil?: string; // ISO 8601 datetime
    fee?: number; // 취소 수수료
    feePercent?: number; // 취소 수수료 (%)
  };
  amendment: {
    allowed: boolean; // 변경 가능 여부
    fee?: number;
  };
  minDriverAge: number; // 최소 운전자 나이
  youngDriverFee?: number; // 25세 미만 추가 요금
  additionalDriverFee?: number; // 추가 운전자 요금
  crossBorder?: {
    allowed: boolean; // 국경 통과 가능 여부
    fee?: number;
  };
}

// 추가 옵션 (Extras)
export interface Extra {
  code: string; // GPS, CHILD_SEAT, WIFI, etc
  name: string;
  description?: string;
  price: number;
  per: 'DAY' | 'RENTAL'; // 일당 또는 전체 렌트 기간
  quantity?: number; // 수량 (예: 차일드 시트 2개)
  mandatory?: boolean; // 필수 옵션 여부
}

// 렌트카 검색 요청
export interface CarSearchRequest {
  pickupPlaceId: string; // 픽업 장소 코드
  dropoffPlaceId: string; // 반납 장소 코드
  pickupAt: string; // ISO 8601: "2025-11-01T10:00:00+09:00"
  dropoffAt: string; // ISO 8601: "2025-11-03T10:00:00+09:00"
  driverAge: number; // 운전자 나이
  residentCountry: string; // 거주 국가 (ISO 2자리: KR, US)
  currency?: string; // 선호 통화
  filters?: {
    transmission?: 'Manual' | 'Automatic';
    fuel?: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';
    airConditioning?: boolean;
    minSeats?: number;
    suppliers?: CarSupplier[];
    maxPrice?: number;
  };
}

// 렌트카 검색 결과 (단일 차량)
export interface CarSearchResult {
  supplierId: CarSupplier;
  supplierName: string;
  vehicle: Vehicle;
  price: PriceBreakdown;
  location: {
    pickup: LocationInfo;
    dropoff: LocationInfo;
  };
  policies: RentalPolicies;
  extras: Extra[];
  rateKey: string; // 요금 키 (암호화된 토큰, TTL 15분)
  expiresAt: string; // rateKey 만료 시간 (ISO 8601)
}

// Quote 요청
export interface QuoteRequest {
  rateKey: string;
}

// Quote 응답 (가격·가용성 재검증)
export interface QuoteResponse {
  success: boolean;
  rateKey?: string; // 새로운 rateKey (변경 시)
  expiresAt?: string;
  vehicle?: Vehicle;
  price?: PriceBreakdown;
  priceChanged?: boolean; // 가격 변경 여부
  available?: boolean; // 가용성
  message?: string; // 변경 사유
}

// 예약 요청
export interface BookingRequest {
  rateKey: string;
  driverInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string; // YYYY-MM-DD
    licenseNumber: string;
    licenseIssueDate: string; // YYYY-MM-DD
    licenseCountry: string; // ISO 2자리
  };
  paymentInfo: {
    method: 'card' | 'bank_transfer';
    cardToken?: string; // 결제 토큰
    amount: number;
    currency: string;
  };
  extras?: Array<{
    code: string;
    quantity: number;
  }>;
  specialRequests?: string;
  flightNumber?: string; // 항공편 번호 (공항 픽업 시)
}

// 예약 응답
export interface BookingResponse {
  success: boolean;
  bookingId?: string; // 우리 시스템 예약 ID
  confirmationCode?: string; // 공급자 확인 번호
  supplierBookingRef?: string; // 공급자 예약 참조 번호
  voucherUrl?: string; // 바우처 URL
  pickupInstructions?: string; // 픽업 안내
  emergencyContact?: string; // 긴급 연락처
  error?: string;
  errorCode?: string;
}

// Redis 캐시 키
export const CacheKeys = {
  search: (pickupPlaceId: string, pickupAt: string) =>
    `car:search:${pickupPlaceId}:${pickupAt}`,
  rateKey: (rateKey: string) => `car:rate:${rateKey}`,
  placeInfo: (placeId: string) => `car:place:${placeId}`,
};

// 캐시 TTL
export const CacheTTL = {
  search: 300, // 5분
  rateKey: 900, // 15분
  placeInfo: 86400, // 24시간
};

// 장소 검색 (자동완성)
export interface PlaceSearchRequest {
  query: string; // 검색어: "제주", "CJU", "Jeju Airport"
  language?: string; // ko, en
  country?: string; // KR, US
}

export interface PlaceSearchResult {
  placeId: string;
  type: 'AIRPORT' | 'CITY' | 'HOTEL' | 'RAILWAY';
  name: string; // 예: "제주국제공항"
  nameEn?: string;
  iataCode?: string; // 공항 코드
  city: string;
  country: string;
  lat: number;
  lng: number;
}
