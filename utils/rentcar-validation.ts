/**
 * 렌트카 입력 검증 스키마
 * Phase 5-2: Input Validation using Zod
 *
 * 모든 사용자 입력에 대한 타입 안전한 검증
 */

import { z } from 'zod';

// ============================================
// 공통 검증 규칙
// ============================================

const koreanPhoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const businessNumberRegex = /^\d{3}-?\d{2}-?\d{5}$/;

// ============================================
// Vendor 검증
// ============================================

export const VendorSchema = z.object({
  vendor_code: z.string()
    .min(3, '벤더 코드는 최소 3자 이상이어야 합니다')
    .max(50, '벤더 코드는 최대 50자까지 가능합니다')
    .regex(/^[A-Z0-9_-]+$/, '벤더 코드는 대문자, 숫자, -, _만 사용 가능합니다'),

  business_name: z.string()
    .min(2, '사업자명은 최소 2자 이상이어야 합니다')
    .max(200, '사업자명은 최대 200자까지 가능합니다'),

  brand_name: z.string()
    .max(100, '브랜드명은 최대 100자까지 가능합니다')
    .optional(),

  business_number: z.string()
    .regex(businessNumberRegex, '올바른 사업자등록번호 형식이 아닙니다 (예: 123-45-67890)')
    .optional(),

  contact_name: z.string()
    .min(2, '담당자명은 최소 2자 이상이어야 합니다')
    .max(100, '담당자명은 최대 100자까지 가능합니다'),

  contact_email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .max(255, '이메일은 최대 255자까지 가능합니다'),

  contact_phone: z.string()
    .regex(koreanPhoneRegex, '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)'),

  description: z.string()
    .max(2000, '설명은 최대 2000자까지 가능합니다')
    .optional(),

  logo_url: z.string()
    .url('올바른 URL 형식이 아닙니다')
    .optional(),

  commission_rate: z.number()
    .min(0, '수수료율은 0 이상이어야 합니다')
    .max(100, '수수료율은 100 이하여야 합니다')
    .optional()
    .default(15.0)
});

export type VendorInput = z.infer<typeof VendorSchema>;

// ============================================
// Location 검증
// ============================================

export const LocationSchema = z.object({
  location_code: z.string()
    .min(3, '지점 코드는 최소 3자 이상이어야 합니다')
    .max(50, '지점 코드는 최대 50자까지 가능합니다')
    .regex(/^[A-Z0-9_-]+$/, '지점 코드는 대문자, 숫자, -, _만 사용 가능합니다'),

  name: z.string()
    .min(2, '지점명은 최소 2자 이상이어야 합니다')
    .max(200, '지점명은 최대 200자까지 가능합니다'),

  location_type: z.enum(['airport', 'station', 'downtown', 'hotel'], {
    errorMap: () => ({ message: '지점 유형은 airport, station, downtown, hotel 중 하나여야 합니다' })
  }),

  address: z.string()
    .min(5, '주소는 최소 5자 이상이어야 합니다')
    .max(500, '주소는 최대 500자까지 가능합니다'),

  city: z.string()
    .max(100, '도시명은 최대 100자까지 가능합니다')
    .optional(),

  postal_code: z.string()
    .max(20, '우편번호는 최대 20자까지 가능합니다')
    .optional(),

  lat: z.number()
    .min(-90, '위도는 -90 이상이어야 합니다')
    .max(90, '위도는 90 이하여야 합니다')
    .optional(),

  lng: z.number()
    .min(-180, '경도는 -180 이상이어야 합니다')
    .max(180, '경도는 180 이하여야 합니다')
    .optional(),

  phone: z.string()
    .regex(koreanPhoneRegex, '올바른 전화번호 형식이 아닙니다')
    .optional(),

  pickup_fee_krw: z.number()
    .min(0, '픽업 요금은 0 이상이어야 합니다')
    .optional()
    .default(0),

  dropoff_fee_krw: z.number()
    .min(0, '반납 요금은 0 이상이어야 합니다')
    .optional()
    .default(0)
});

export type LocationInput = z.infer<typeof LocationSchema>;

// ============================================
// Vehicle 검증
// ============================================

export const VehicleSchema = z.object({
  vehicle_code: z.string()
    .min(3, '차량 코드는 최소 3자 이상이어야 합니다')
    .max(50, '차량 코드는 최대 50자까지 가능합니다')
    .regex(/^[A-Z0-9_-]+$/, '차량 코드는 대문자, 숫자, -, _만 사용 가능합니다'),

  brand: z.string()
    .min(2, '브랜드는 최소 2자 이상이어야 합니다')
    .max(100, '브랜드는 최대 100자까지 가능합니다'),

  model: z.string()
    .min(1, '모델명은 최소 1자 이상이어야 합니다')
    .max(100, '모델명은 최대 100자까지 가능합니다'),

  year: z.number()
    .int('연식은 정수여야 합니다')
    .min(2000, '연식은 2000년 이상이어야 합니다')
    .max(new Date().getFullYear() + 1, `연식은 ${new Date().getFullYear() + 1}년 이하여야 합니다`),

  display_name: z.string()
    .min(2, '표시명은 최소 2자 이상이어야 합니다')
    .max(200, '표시명은 최대 200자까지 가능합니다'),

  vehicle_class: z.enum(['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van'], {
    errorMap: () => ({ message: '차량 등급이 올바르지 않습니다' })
  }),

  vehicle_type: z.string()
    .max(50, '차량 유형은 최대 50자까지 가능합니다')
    .optional(),

  fuel_type: z.enum(['gasoline', 'diesel', 'hybrid', 'electric', 'lpg'], {
    errorMap: () => ({ message: '연료 유형이 올바르지 않습니다' })
  }),

  transmission: z.enum(['manual', 'automatic'], {
    errorMap: () => ({ message: '변속기 유형은 manual 또는 automatic이어야 합니다' })
  }),

  seating_capacity: z.number()
    .int('승차 인원은 정수여야 합니다')
    .min(2, '승차 인원은 최소 2명 이상이어야 합니다')
    .max(15, '승차 인원은 최대 15명까지 가능합니다'),

  door_count: z.number()
    .int('문 개수는 정수여야 합니다')
    .min(2, '문 개수는 최소 2개 이상이어야 합니다')
    .max(5, '문 개수는 최대 5개까지 가능합니다')
    .optional()
    .default(4),

  large_bags: z.number()
    .int('큰 가방 수는 정수여야 합니다')
    .min(0, '큰 가방 수는 0 이상이어야 합니다')
    .max(10, '큰 가방 수는 최대 10개까지 가능합니다')
    .optional()
    .default(2),

  small_bags: z.number()
    .int('작은 가방 수는 정수여야 합니다')
    .min(0, '작은 가방 수는 0 이상이어야 합니다')
    .max(10, '작은 가방 수는 최대 10개까지 가능합니다')
    .optional()
    .default(2),

  thumbnail_url: z.string()
    .url('올바른 URL 형식이 아닙니다')
    .optional(),

  images: z.array(z.string().url('올바른 URL 형식이 아닙니다'))
    .optional()
    .default([]),

  features: z.array(z.string())
    .optional()
    .default([]),

  age_requirement: z.number()
    .int('연령 제한은 정수여야 합니다')
    .min(18, '연령 제한은 최소 18세 이상이어야 합니다')
    .max(100, '연령 제한은 최대 100세까지 가능합니다')
    .optional()
    .default(21),

  license_requirement: z.string()
    .max(200, '면허 요구사항은 최대 200자까지 가능합니다')
    .optional(),

  mileage_limit_per_day: z.number()
    .int('주행거리 제한은 정수여야 합니다')
    .min(0, '주행거리 제한은 0 이상이어야 합니다')
    .max(1000, '주행거리 제한은 최대 1000km까지 가능합니다')
    .optional()
    .default(200),

  unlimited_mileage: z.boolean()
    .optional()
    .default(false),

  deposit_amount_krw: z.number()
    .int('보증금은 정수여야 합니다')
    .min(0, '보증금은 0 이상이어야 합니다')
    .optional()
    .default(0),

  smoking_allowed: z.boolean()
    .optional()
    .default(false),

  daily_rate_krw: z.number()
    .int('일일 요금은 정수여야 합니다')
    .min(10000, '일일 요금은 최소 10,000원 이상이어야 합니다')
    .max(10000000, '일일 요금은 최대 10,000,000원까지 가능합니다')
});

export type VehicleInput = z.infer<typeof VehicleSchema>;

// ============================================
// Booking 검증
// ============================================

export const BookingSchema = z.object({
  vehicle_id: z.number()
    .int('차량 ID는 정수여야 합니다')
    .positive('차량 ID는 양수여야 합니다'),

  customer_name: z.string()
    .min(2, '고객명은 최소 2자 이상이어야 합니다')
    .max(100, '고객명은 최대 100자까지 가능합니다'),

  customer_email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .max(255, '이메일은 최대 255자까지 가능합니다'),

  customer_phone: z.string()
    .regex(koreanPhoneRegex, '올바른 전화번호 형식이 아닙니다'),

  pickup_location_id: z.number()
    .int('픽업 지점 ID는 정수여야 합니다')
    .positive('픽업 지점 ID는 양수여야 합니다'),

  dropoff_location_id: z.number()
    .int('반납 지점 ID는 정수여야 합니다')
    .positive('반납 지점 ID는 양수여야 합니다'),

  pickup_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '픽업 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)')
    .refine((date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: '픽업 날짜는 오늘 이후여야 합니다'
    }),

  pickup_time: z.string()
    .regex(/^\d{2}:\d{2}$/, '픽업 시간 형식이 올바르지 않습니다 (HH:MM)'),

  dropoff_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '반납 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),

  dropoff_time: z.string()
    .regex(/^\d{2}:\d{2}$/, '반납 시간 형식이 올바르지 않습니다 (HH:MM)'),

  special_requests: z.string()
    .max(1000, '특별 요청사항은 최대 1000자까지 가능합니다')
    .optional()
}).refine((data) => {
  const pickup = new Date(`${data.pickup_date} ${data.pickup_time}`);
  const dropoff = new Date(`${data.dropoff_date} ${data.dropoff_time}`);
  return dropoff > pickup;
}, {
  message: '반납 일시는 픽업 일시보다 이후여야 합니다',
  path: ['dropoff_date']
});

export type BookingInput = z.infer<typeof BookingSchema>;

// ============================================
// Rate Plan 검증
// ============================================

export const RatePlanSchema = z.object({
  vehicle_id: z.number()
    .int('차량 ID는 정수여야 합니다')
    .positive('차량 ID는 양수여야 합니다')
    .optional(),

  vehicle_class: z.string()
    .max(50, '차량 등급은 최대 50자까지 가능합니다')
    .optional(),

  plan_name: z.string()
    .min(2, '요금제명은 최소 2자 이상이어야 합니다')
    .max(200, '요금제명은 최대 200자까지 가능합니다'),

  plan_code: z.string()
    .min(3, '요금제 코드는 최소 3자 이상이어야 합니다')
    .max(50, '요금제 코드는 최대 50자까지 가능합니다')
    .regex(/^[A-Z0-9_-]+$/, '요금제 코드는 대문자, 숫자, -, _만 사용 가능합니다'),

  description: z.string()
    .max(1000, '설명은 최대 1000자까지 가능합니다')
    .optional(),

  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '시작 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),

  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '종료 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),

  daily_rate_krw: z.number()
    .int('일일 요금은 정수여야 합니다')
    .min(10000, '일일 요금은 최소 10,000원 이상이어야 합니다')
    .max(10000000, '일일 요금은 최대 10,000,000원까지 가능합니다'),

  weekly_rate_krw: z.number()
    .int('주간 요금은 정수여야 합니다')
    .min(50000, '주간 요금은 최소 50,000원 이상이어야 합니다')
    .optional(),

  monthly_rate_krw: z.number()
    .int('월간 요금은 정수여야 합니다')
    .min(200000, '월간 요금은 최소 200,000원 이상이어야 합니다')
    .optional(),

  min_rental_days: z.number()
    .int('최소 대여 일수는 정수여야 합니다')
    .min(1, '최소 대여 일수는 1일 이상이어야 합니다')
    .optional()
    .default(1),

  max_rental_days: z.number()
    .int('최대 대여 일수는 정수여야 합니다')
    .min(1, '최대 대여 일수는 1일 이상이어야 합니다')
    .optional(),

  weekend_surcharge_percent: z.number()
    .min(0, '주말 할증은 0 이상이어야 합니다')
    .max(100, '주말 할증은 100 이하여야 합니다')
    .optional()
    .default(0),

  weekday_discount_percent: z.number()
    .min(0, '평일 할인은 0 이상이어야 합니다')
    .max(100, '평일 할인은 100 이하여야 합니다')
    .optional()
    .default(0),

  early_bird_days: z.number()
    .int('조기 예약 일수는 정수여야 합니다')
    .min(1, '조기 예약 일수는 1일 이상이어야 합니다')
    .optional(),

  early_bird_discount_percent: z.number()
    .min(0, '조기 예약 할인은 0 이상이어야 합니다')
    .max(100, '조기 예약 할인은 100 이하여야 합니다')
    .optional()
    .default(0),

  long_term_days: z.number()
    .int('장기 대여 일수는 정수여야 합니다')
    .min(7, '장기 대여 일수는 7일 이상이어야 합니다')
    .optional(),

  long_term_discount_percent: z.number()
    .min(0, '장기 대여 할인은 0 이상이어야 합니다')
    .max(100, '장기 대여 할인은 100 이하여야 합니다')
    .optional()
    .default(0),

  priority: z.number()
    .int('우선순위는 정수여야 합니다')
    .min(0, '우선순위는 0 이상이어야 합니다')
    .optional()
    .default(0)
}).refine((data) => {
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: '종료 날짜는 시작 날짜보다 이후여야 합니다',
  path: ['end_date']
});

export type RatePlanInput = z.infer<typeof RatePlanSchema>;

// ============================================
// 검증 헬퍼 함수
// ============================================

/**
 * Zod 스키마로 데이터 검증
 * @throws AppError with VALIDATION_ERROR code
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));

    const firstError = errors[0];

    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Validation failed: ${JSON.stringify(errors)}`,
      firstError.message,
      firstError.field,
      { errors }
    );
  }

  return result.data;
}

/**
 * Partial 검증 (일부 필드만 검증)
 */
export function validatePartial<T>(schema: z.ZodSchema<T>, data: unknown): Partial<T> {
  const partialSchema = schema.partial();
  return validate(partialSchema, data);
}

// ErrorCode import for validate function
import { ErrorCode, AppError } from './error-handler';

export default {
  VendorSchema,
  LocationSchema,
  VehicleSchema,
  BookingSchema,
  RatePlanSchema,
  validate,
  validatePartial
};
