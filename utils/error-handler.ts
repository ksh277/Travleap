/**
 * 통합 에러 핸들링 시스템
 * Phase 5-1: Error Handling Improvements
 *
 * 기능:
 * - 표준화된 에러 응답 형식
 * - 에러 분류 및 로깅
 * - 사용자 친화적 에러 메시지
 * - 개발/프로덕션 환경 분리
 */

export enum ErrorCode {
  // 일반 에러 (1000번대)
  UNKNOWN_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,
  ALREADY_EXISTS = 1003,
  UNAUTHORIZED = 1004,
  FORBIDDEN = 1005,

  // 데이터베이스 에러 (2000번대)
  DATABASE_ERROR = 2000,
  DATABASE_CONNECTION_ERROR = 2001,
  DATABASE_QUERY_ERROR = 2002,
  DUPLICATE_ENTRY = 2003,
  FOREIGN_KEY_CONSTRAINT = 2004,

  // 렌트카 비즈니스 로직 에러 (3000번대)
  VEHICLE_NOT_AVAILABLE = 3000,
  INVALID_DATE_RANGE = 3001,
  BOOKING_CONFLICT = 3002,
  VENDOR_INACTIVE = 3003,
  INSUFFICIENT_INVENTORY = 3004,
  INVALID_LOCATION = 3005,
  INVALID_RATE_PLAN = 3006,
  INVALID_FIELD = 3007,

  // 외부 API 에러 (4000번대)
  EXTERNAL_API_ERROR = 4000,
  PAYMENT_GATEWAY_ERROR = 4001,
  SMS_PROVIDER_ERROR = 4002,
  EMAIL_PROVIDER_ERROR = 4003,

  // 파일/이미지 에러 (5000번대)
  FILE_UPLOAD_ERROR = 5000,
  INVALID_FILE_TYPE = 5001,
  FILE_TOO_LARGE = 5002,
  IMAGE_PROCESSING_ERROR = 5003
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string; // 사용자에게 표시할 메시지
  field?: string; // 에러가 발생한 필드 (validation 에러 시)
  details?: any; // 추가 상세 정보
  stack?: string; // 스택 트레이스 (개발 환경에서만)
}

export class AppError extends Error {
  code: ErrorCode;
  userMessage: string;
  field?: string;
  details?: any;
  isOperational: boolean; // true = 예상된 에러, false = 예상치 못한 에러

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    field?: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.field = field;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 데이터베이스 에러를 AppError로 변환
 */
export function handleDatabaseError(error: any): AppError {
  // MySQL 에러 코드 매핑
  if (error.code === 'ER_DUP_ENTRY') {
    return new AppError(
      ErrorCode.DUPLICATE_ENTRY,
      `Duplicate entry: ${error.message}`,
      '이미 존재하는 데이터입니다.',
      undefined,
      { sqlMessage: error.sqlMessage }
    );
  }

  if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_ROW_IS_REFERENCED') {
    return new AppError(
      ErrorCode.FOREIGN_KEY_CONSTRAINT,
      `Foreign key constraint failed: ${error.message}`,
      '연관된 데이터가 존재하여 작업을 수행할 수 없습니다.',
      undefined,
      { sqlMessage: error.sqlMessage }
    );
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new AppError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      `Database connection error: ${error.message}`,
      '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
      undefined,
      { code: error.code },
      false // 시스템 에러
    );
  }

  // 기타 데이터베이스 에러
  return new AppError(
    ErrorCode.DATABASE_ERROR,
    `Database error: ${error.message}`,
    '데이터베이스 작업 중 오류가 발생했습니다.',
    undefined,
    { sqlMessage: error.sqlMessage },
    false
  );
}

/**
 * 에러를 표준화된 응답 형식으로 변환
 */
export function formatErrorResponse(
  error: AppError | Error,
  includeStack: boolean = process.env.NODE_ENV === 'development'
): ErrorDetails {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      field: error.field,
      details: error.details,
      stack: includeStack ? error.stack : undefined
    };
  }

  // 일반 Error 객체
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: error.message || 'Unknown error occurred',
    userMessage: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    stack: includeStack ? error.stack : undefined
  };
}

/**
 * 에러 로깅 (향후 logging 시스템과 통합)
 */
export function logError(error: AppError | Error, context?: any): void {
  const timestamp = new Date().toISOString();
  const isOperational = error instanceof AppError ? error.isOperational : false;

  console.error('═'.repeat(80));
  console.error(`[ERROR] ${timestamp}`);
  console.error(`Operational: ${isOperational}`);

  if (error instanceof AppError) {
    console.error(`Code: ${error.code} (${ErrorCode[error.code]})`);
    console.error(`Message: ${error.message}`);
    console.error(`User Message: ${error.userMessage}`);
    if (error.field) console.error(`Field: ${error.field}`);
    if (error.details) console.error(`Details:`, error.details);
  } else {
    console.error(`Message: ${error.message}`);
  }

  if (context) {
    console.error('Context:', context);
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', error.stack);
  }

  console.error('═'.repeat(80));
}

/**
 * Async 함수를 래핑하여 에러 핸들링 자동화
 */
export function catchAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        logError(error, { function: fn.name, args });
        throw error;
      }

      // 데이터베이스 에러 처리
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = handleDatabaseError(error);
        logError(dbError, { function: fn.name, args });
        throw dbError;
      }

      // 일반 에러
      const appError = new AppError(
        ErrorCode.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        '작업 중 오류가 발생했습니다.',
        undefined,
        undefined,
        false
      );
      logError(appError, { function: fn.name, args });
      throw appError;
    }
  };
}

/**
 * 렌트카 전용 에러 생성 헬퍼
 */
export const RentcarErrors = {
  vehicleNotAvailable: (vehicleId: number, dates: string) =>
    new AppError(
      ErrorCode.VEHICLE_NOT_AVAILABLE,
      `Vehicle ${vehicleId} is not available for dates: ${dates}`,
      '선택하신 날짜에 해당 차량을 이용할 수 없습니다.'
    ),

  invalidDateRange: (pickup: string, dropoff: string) =>
    new AppError(
      ErrorCode.INVALID_DATE_RANGE,
      `Invalid date range: pickup=${pickup}, dropoff=${dropoff}`,
      '반납일은 픽업일보다 이후여야 합니다.',
      'dropoff_date'
    ),

  bookingConflict: (vehicleId: number) =>
    new AppError(
      ErrorCode.BOOKING_CONFLICT,
      `Booking conflict for vehicle ${vehicleId}`,
      '이미 예약된 차량입니다. 다른 날짜를 선택해주세요.'
    ),

  vendorInactive: (vendorId: number) =>
    new AppError(
      ErrorCode.VENDOR_INACTIVE,
      `Vendor ${vendorId} is not active`,
      '현재 이용할 수 없는 렌트카 업체입니다.'
    ),

  insufficientInventory: (vehicleId: number, requested: number, available: number) =>
    new AppError(
      ErrorCode.INSUFFICIENT_INVENTORY,
      `Insufficient inventory for vehicle ${vehicleId}: requested=${requested}, available=${available}`,
      `재고가 부족합니다. (요청: ${requested}, 가능: ${available})`
    ),

  invalidLocation: (locationId: number) =>
    new AppError(
      ErrorCode.INVALID_LOCATION,
      `Invalid location: ${locationId}`,
      '유효하지 않은 지점입니다.',
      'location_id'
    ),

  invalidRatePlan: (ratePlanId: number) =>
    new AppError(
      ErrorCode.INVALID_RATE_PLAN,
      `Invalid rate plan: ${ratePlanId}`,
      '유효하지 않은 요금제입니다.',
      'rate_plan_id'
    ),

  notFound: (resource: string, id: number) =>
    new AppError(
      ErrorCode.NOT_FOUND,
      `${resource} not found: ${id}`,
      `${resource}을(를) 찾을 수 없습니다.`
    ),

  INVALID_FIELD: {
    code: ErrorCode.INVALID_FIELD,
    message: 'Invalid field for update operation',
    userMessage: '수정할 수 없는 필드입니다.'
  }
};

export default {
  AppError,
  ErrorCode,
  handleDatabaseError,
  formatErrorResponse,
  logError,
  catchAsync,
  RentcarErrors
};
