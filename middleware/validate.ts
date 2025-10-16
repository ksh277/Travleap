/**
 * Input Validation Middleware
 *
 * Zod를 사용하여 API 요청 데이터를 검증합니다.
 *
 * 사용법:
 * import { validate, schemas } from './middleware/validate.js';
 * app.post('/api/login', validate(schemas.login), (req, res) => { ... })
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Zod 스키마를 사용하여 요청 데이터를 검증하는 미들웨어 생성
 *
 * @param schema - Zod 스키마 객체
 * @param source - 검증할 데이터 소스 ('body', 'query', 'params')
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 지정된 소스에서 데이터 추출
      const data = req[source];

      // Zod로 검증
      const result = schema.safeParse(data);

      if (!result.success) {
        // 검증 실패 시 에러 메시지 포맷팅
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          message: '입력 데이터가 유효하지 않습니다.',
          errors
        });
        return;
      }

      // 검증된 데이터로 덮어쓰기 (타입 안정성)
      req[source] = result.data as any;

      next();

    } catch (error) {
      console.error('❌ 입력 검증 오류:', error);
      res.status(500).json({
        success: false,
        message: '입력 검증 중 오류가 발생했습니다.'
      });
    }
  };
}

/**
 * 공통 Zod 스키마 정의
 */
export const schemas = {
  // 로그인
  login: z.object({
    email: z.string().email('유효한 이메일 주소를 입력하세요'),
    password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다')
  }),

  // 회원가입
  signup: z.object({
    email: z.string().email('유효한 이메일 주소를 입력하세요'),
    password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
    role: z.enum(['user', 'vendor', 'partner']).optional()
  }),

  // 숙박 예약 생성
  createBooking: z.object({
    listingId: z.number().int().positive(),
    roomId: z.number().int().positive().optional(),
    checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다'),
    checkoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다'),
    guests: z.number().int().positive().max(20, '최대 20명까지 예약 가능합니다'),
    guestName: z.string().min(2, '투숙객 이름은 최소 2자 이상이어야 합니다'),
    guestEmail: z.string().email('유효한 이메일 주소를 입력하세요'),
    guestPhone: z.string().regex(/^01[0-9]-?\d{3,4}-?\d{4}$/, '유효한 전화번호를 입력하세요'),
    specialRequests: z.string().optional()
  }),

  // 결제 확인
  confirmPayment: z.object({
    bookingId: z.number().int().positive(),
    paymentKey: z.string().min(1, '결제 키가 필요합니다'),
    amount: z.number().positive('금액은 0보다 커야 합니다')
  }),

  // 렌트카 예약
  createRentcarBooking: z.object({
    vehicleId: z.number().int().positive(),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다'),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다'),
    pickupLocation: z.string().min(1, '픽업 장소를 입력하세요'),
    returnLocation: z.string().min(1, '반납 장소를 입력하세요'),
    driverName: z.string().min(2, '운전자 이름은 최소 2자 이상이어야 합니다'),
    driverLicense: z.string().min(5, '유효한 운전면허번호를 입력하세요'),
    contactPhone: z.string().regex(/^01[0-9]-?\d{3,4}-?\d{4}$/, '유효한 전화번호를 입력하세요'),
    insurance: z.enum(['basic', 'standard', 'premium']).optional()
  }),

  // 상품 생성/수정 (관리자)
  createListing: z.object({
    title: z.string().min(5, '제목은 최소 5자 이상이어야 합니다').max(200, '제목은 최대 200자까지 가능합니다'),
    description: z.string().min(20, '설명은 최소 20자 이상이어야 합니다'),
    category: z.enum(['accommodation', 'activity', 'rentcar', 'restaurant', 'tour']),
    price: z.number().positive('가격은 0보다 커야 합니다'),
    location: z.string().min(2, '위치를 입력하세요'),
    images: z.array(z.string().url('유효한 이미지 URL이어야 합니다')).min(1, '최소 1개의 이미지가 필요합니다'),
    amenities: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive', 'draft']).optional()
  }),

  // 리뷰 작성
  createReview: z.object({
    listingId: z.number().int().positive(),
    rating: z.number().int().min(1, '평점은 1~5 사이여야 합니다').max(5, '평점은 1~5 사이여야 합니다'),
    comment: z.string().min(10, '리뷰는 최소 10자 이상 작성해주세요').max(1000, '리뷰는 최대 1000자까지 가능합니다'),
    bookingId: z.number().int().positive().optional()
  }),

  // 카트에 아이템 추가
  addToCart: z.object({
    listingId: z.number().int().positive(),
    quantity: z.number().int().positive().max(10, '최대 10개까지 추가 가능합니다').default(1),
    checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다').optional(),
    checkoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다').optional(),
    options: z.record(z.any()).optional()
  }),

  // ID 파라미터 검증
  idParam: z.object({
    id: z.string().regex(/^\d+$/, 'ID는 숫자여야 합니다').transform(Number)
  }),

  // 페이지네이션 쿼리 검증
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    sort: z.enum(['asc', 'desc']).optional(),
    sortBy: z.string().optional()
  }),

  // 날짜 범위 쿼리
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD이어야 합니다')
  }).refine(
    data => new Date(data.startDate) <= new Date(data.endDate),
    '시작일은 종료일보다 이전이어야 합니다'
  ),

  // PMS 설정
  pmsConfig: z.object({
    provider: z.enum(['cloudbeds', 'booking', 'manual']),
    apiKey: z.string().min(10, 'API 키는 최소 10자 이상이어야 합니다').optional(),
    propertyId: z.string().optional(),
    webhookUrl: z.string().url('유효한 웹훅 URL이어야 합니다').optional(),
    syncInterval: z.number().int().min(60, '동기화 간격은 최소 60초 이상이어야 합니다').optional()
  }),

  // 벤더 등록
  vendorRegistration: z.object({
    companyName: z.string().min(2, '회사명은 최소 2자 이상이어야 합니다'),
    businessNumber: z.string().regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다 (예: 123-45-67890)'),
    ownerName: z.string().min(2, '대표자명은 최소 2자 이상이어야 합니다'),
    email: z.string().email('유효한 이메일 주소를 입력하세요'),
    phone: z.string().regex(/^01[0-9]-?\d{3,4}-?\d{4}$/, '유효한 전화번호를 입력하세요'),
    category: z.enum(['rentcar', 'accommodation', 'restaurant', 'tour', 'activity']),
    description: z.string().min(20, '사업 설명은 최소 20자 이상이어야 합니다')
  })
};

/**
 * 커스텀 검증 규칙 예제
 */

// 한국 전화번호 검증
export const koreanPhoneSchema = z.string().regex(
  /^01[0-9]-?\d{3,4}-?\d{4}$/,
  '유효한 한국 전화번호를 입력하세요 (예: 010-1234-5678)'
);

// 사업자등록번호 검증
export const businessNumberSchema = z.string().regex(
  /^\d{3}-\d{2}-\d{5}$/,
  '유효한 사업자등록번호를 입력하세요 (예: 123-45-67890)'
);

// 날짜 형식 검증
export const dateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  '날짜 형식은 YYYY-MM-DD이어야 합니다'
);

// 금액 검증 (0 이상)
export const amountSchema = z.number().nonnegative('금액은 0 이상이어야 합니다');

// 양의 정수 검증
export const positiveIntSchema = z.number().int().positive('양의 정수여야 합니다');
