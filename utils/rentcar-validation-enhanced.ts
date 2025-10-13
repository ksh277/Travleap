/**
 * 렌트카 시스템 고급 유효성 검사
 * 상용 서비스 수준의 검증 로직
 */

import { z } from 'zod';

// ========================================
// 1. 업체 관리 검증
// ========================================

/**
 * 사업자등록번호 검증 (XXX-XX-XXXXX 형식)
 */
export function validateBusinessNumber(businessNumber: string): boolean {
  // 하이픈 제거
  const cleaned = businessNumber.replace(/-/g, '');

  // 10자리 숫자인지 확인
  if (!/^\d{10}$/.test(cleaned)) {
    return false;
  }

  // 검증 알고리즘 (국세청 기준)
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }

  sum += Math.floor((parseInt(cleaned[8]) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === parseInt(cleaned[9]);
}

/**
 * 업체 등록 스키마
 */
export const vendorRegistrationSchema = z.object({
  name: z.string()
    .min(2, '상호명은 최소 2자 이상이어야 합니다')
    .max(100, '상호명은 100자를 초과할 수 없습니다')
    .regex(/^[가-힣a-zA-Z0-9\s\-\(\)]+$/, '상호명에 특수문자를 사용할 수 없습니다'),

  business_number: z.string()
    .refine(validateBusinessNumber, '올바른 사업자등록번호 형식이 아닙니다'),

  contact_email: z.string()
    .email('올바른 이메일 형식을 입력해주세요')
    .min(5, '이메일은 최소 5자 이상이어야 합니다'),

  contact_person: z.string()
    .min(2, '담당자명은 최소 2자 이상이어야 합니다')
    .max(50, '담당자명은 50자를 초과할 수 없습니다'),

  contact_phone: z.string()
    .regex(/^01[0-9]-\d{4}-\d{4}$/, '전화번호는 010-1234-5678 형식이어야 합니다'),

  address: z.string().optional(),

  settlement_profile_id: z.number().int().positive().optional(),

  is_active: z.boolean().default(false),

  is_verified: z.boolean().default(false)
});

// ========================================
// 2. 차량 등록 검증
// ========================================

/**
 * 차량 등록 스키마
 */
export const vehicleRegistrationSchema = z.object({
  vendor_id: z.number().int().positive('업체 ID가 필요합니다'),

  brand: z.string()
    .min(1, '브랜드를 입력해주세요')
    .max(50, '브랜드명은 50자를 초과할 수 없습니다'),

  model: z.string()
    .min(1, '모델명을 입력해주세요')
    .max(50, '모델명은 50자를 초과할 수 없습니다'),

  year: z.number()
    .int('연식은 정수여야 합니다')
    .min(2000, '연식은 2000년 이상이어야 합니다')
    .max(new Date().getFullYear() + 1, '미래 연식은 등록할 수 없습니다'),

  display_name: z.string()
    .min(3, '표시명은 최소 3자 이상이어야 합니다')
    .max(100, '표시명은 100자를 초과할 수 없습니다'),

  vehicle_class: z.enum([
    '경형', '소형', '중형', '대형', 'SUV', '승합', '럭셔리', '전기차'
  ], { errorMap: () => ({ message: '올바른 차량 등급을 선택해주세요' }) }),

  fuel_type: z.enum([
    '휘발유', '경유', '하이브리드', '전기', 'LPG'
  ], { errorMap: () => ({ message: '올바른 연료 타입을 선택해주세요' }) }),

  transmission: z.enum(['자동', '수동'], {
    errorMap: () => ({ message: '자동 또는 수동을 선택해주세요' })
  }),

  seating_capacity: z.number()
    .int('탑승인원은 정수여야 합니다')
    .min(1, '최소 1명 이상이어야 합니다')
    .max(15, '최대 15명까지 가능합니다'),

  door_count: z.number()
    .int()
    .min(2)
    .max(5)
    .default(4),

  large_bags: z.number().int().min(0).max(10).default(2),
  small_bags: z.number().int().min(0).max(10).default(2),

  thumbnail_url: z.string().url('올바른 이미지 URL을 입력해주세요').optional(),

  images: z.array(z.string().url()).max(10, '이미지는 최대 10개까지 업로드 가능합니다').default([]),

  age_requirement: z.number()
    .int()
    .min(19, '최소 연령은 19세 이상이어야 합니다')
    .max(80, '최대 연령은 80세를 초과할 수 없습니다')
    .default(21),

  license_requirement: z.string()
    .max(100)
    .default('1종 보통 이상'),

  license_years_required: z.number()
    .int()
    .min(0, '면허 보유 기간은 0년 이상이어야 합니다')
    .max(50)
    .default(1),

  mileage_limit_per_day: z.number()
    .int()
    .min(0)
    .max(1000, '일일 주행거리는 1000km를 초과할 수 없습니다')
    .default(200),

  unlimited_mileage: z.boolean().default(false),

  deposit_amount_krw: z.number()
    .int()
    .min(0)
    .max(10000000, '보증금은 1000만원을 초과할 수 없습니다')
    .default(0),

  smoking_allowed: z.boolean().default(false),

  daily_rate_krw: z.number()
    .int()
    .min(10000, '일일 요금은 최소 10,000원 이상이어야 합니다')
    .max(1000000, '일일 요금은 100만원을 초과할 수 없습니다'),

  peak_season_rate_krw: z.number().int().min(0).optional(),

  one_way_fee_krw: z.number().int().min(0).max(500000).default(0),

  is_active: z.boolean().default(true)
});

// ========================================
// 3. 대여소 등록 검증
// ========================================

/**
 * 대여소 등록 스키마
 */
export const locationRegistrationSchema = z.object({
  vendor_id: z.number().int().positive(),

  name: z.string()
    .min(2, '대여소명은 최소 2자 이상이어야 합니다')
    .max(100, '대여소명은 100자를 초과할 수 없습니다'),

  address: z.string()
    .min(5, '주소는 최소 5자 이상이어야 합니다')
    .max(200, '주소는 200자를 초과할 수 없습니다'),

  latitude: z.number()
    .min(33, '위도는 33 이상이어야 합니다 (대한민국 범위)')
    .max(39, '위도는 39 이하여야 합니다 (대한민국 범위)'),

  longitude: z.number()
    .min(124, '경도는 124 이상이어야 합니다 (대한민국 범위)')
    .max(132, '경도는 132 이하여야 합니다 (대한민국 범위)'),

  phone: z.string()
    .regex(/^01[0-9]-\d{4}-\d{4}$|^\d{2,3}-\d{3,4}-\d{4}$/, '올바른 전화번호 형식을 입력해주세요'),

  opening_hours: z.string()
    .max(100, '영업시간은 100자를 초과할 수 없습니다')
    .default('09:00-18:00'),

  is_airport: z.boolean().default(false),

  is_major_hub: z.boolean().default(false),

  supports_pickup: z.boolean().default(true),

  supports_dropoff: z.boolean().default(true),

  support_timezone: z.string().default('Asia/Seoul'),

  after_hours_available: z.boolean().default(false),

  after_hours_fee_krw: z.number().int().min(0).default(0)
});

// ========================================
// 4. 예약 상태 검증
// ========================================

/**
 * 예약 상태 전이 검증
 */
export function validateBookingStatusTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['picked_up', 'cancelled', 'no_show'],
    'picked_up': ['returned', 'cancelled'],
    'returned': ['completed'],
    'cancelled': [], // 취소된 예약은 다른 상태로 전환 불가
    'no_show': [], // 노쇼는 최종 상태
    'completed': [] // 완료는 최종 상태
  };

  if (!validTransitions[currentStatus]) {
    return { valid: false, error: `알 수 없는 현재 상태: ${currentStatus}` };
  }

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return {
      valid: false,
      error: `${currentStatus}에서 ${newStatus}로 전환할 수 없습니다`
    };
  }

  return { valid: true };
}

// ========================================
// 5. 환불 계산 검증
// ========================================

/**
 * 환불 정책에 따른 환불액 계산
 */
export function calculateRefundAmount(params: {
  totalAmount: number;
  pickupDate: Date;
  cancellationDate: Date;
  refundPolicy: 'free' | 'partial' | 'no_refund';
}): { refundAmount: number; fee: number; refundRate: number } {
  const { totalAmount, pickupDate, cancellationDate, refundPolicy } = params;

  // 픽업까지 남은 시간 (시간 단위)
  const hoursUntilPickup = (pickupDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);

  if (refundPolicy === 'no_refund') {
    return { refundAmount: 0, fee: totalAmount, refundRate: 0 };
  }

  let refundRate = 0;

  if (refundPolicy === 'free') {
    // 무료 취소: 픽업 24시간 전까지 100% 환불
    if (hoursUntilPickup >= 24) {
      refundRate = 1.0;
    } else if (hoursUntilPickup >= 12) {
      refundRate = 0.5;
    } else if (hoursUntilPickup >= 0) {
      refundRate = 0;
    }
  } else if (refundPolicy === 'partial') {
    // 부분 환불
    if (hoursUntilPickup >= 72) {
      refundRate = 0.9; // 3일 전: 90% 환불
    } else if (hoursUntilPickup >= 48) {
      refundRate = 0.7; // 2일 전: 70% 환불
    } else if (hoursUntilPickup >= 24) {
      refundRate = 0.5; // 1일 전: 50% 환불
    } else {
      refundRate = 0; // 당일: 환불 불가
    }
  }

  const refundAmount = Math.floor(totalAmount * refundRate);
  const fee = totalAmount - refundAmount;

  return { refundAmount, fee, refundRate };
}

// ========================================
// 6. CSV 업로드 검증
// ========================================

/**
 * CSV 행 검증
 */
export function validateCSVRow(
  row: Record<string, string>,
  lineNumber: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 필수 필드 확인
  const requiredFields = ['brand', 'model', 'year', 'display_name', 'vehicle_class', 'fuel_type', 'transmission', 'seating_capacity', 'daily_rate_krw'];

  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`[행 ${lineNumber}] ${field} 필드가 비어있습니다`);
    }
  }

  // 연식 검증
  if (row.year) {
    const year = parseInt(row.year);
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      errors.push(`[행 ${lineNumber}] 올바른 연식이 아닙니다: ${row.year}`);
    }
  }

  // 탑승인원 검증
  if (row.seating_capacity) {
    const capacity = parseInt(row.seating_capacity);
    if (isNaN(capacity) || capacity < 1 || capacity > 15) {
      errors.push(`[행 ${lineNumber}] 탑승인원은 1-15명 사이여야 합니다: ${row.seating_capacity}`);
    }
  }

  // 가격 검증
  if (row.daily_rate_krw) {
    const price = parseInt(row.daily_rate_krw);
    if (isNaN(price) || price < 10000 || price > 1000000) {
      errors.push(`[행 ${lineNumber}] 일일 요금은 10,000-1,000,000원 사이여야 합니다: ${row.daily_rate_krw}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// 7. 이미지 업로드 검증
// ========================================

/**
 * 이미지 파일 검증
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 파일 타입 검증
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'JPG, PNG, WEBP 형식만 업로드 가능합니다' };
  }

  // 파일 크기 검증 (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: '이미지 크기는 5MB를 초과할 수 없습니다' };
  }

  return { valid: true };
}

/**
 * 이미지 품질 검사 (비동기)
 */
export async function validateImageQuality(file: File): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 최소 해상도 검증 (800x600)
      if (img.width < 800 || img.height < 600) {
        resolve({ valid: false, error: '이미지 해상도는 최소 800x600 이상이어야 합니다' });
        return;
      }

      // 최대 해상도 검증 (4000x3000)
      if (img.width > 4000 || img.height > 3000) {
        resolve({ valid: false, error: '이미지 해상도는 4000x3000을 초과할 수 없습니다' });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: '이미지를 읽을 수 없습니다' });
    };

    img.src = url;
  });
}

export default {
  validateBusinessNumber,
  vendorRegistrationSchema,
  vehicleRegistrationSchema,
  locationRegistrationSchema,
  validateBookingStatusTransition,
  calculateRefundAmount,
  validateCSVRow,
  validateImageFile,
  validateImageQuality
};
