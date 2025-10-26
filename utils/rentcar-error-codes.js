/**
 * 렌트카 에러 코드 표준화
 *
 * 목적:
 * - 일관된 에러 코드 및 메시지 제공
 * - 사용자 친화적인 한국어 메시지
 * - 개발자를 위한 상세 설명
 *
 * 사용법:
 * const { RENTCAR_ERRORS } = require('./utils/rentcar-error-codes');
 * return res.status(409).json(RENTCAR_ERRORS.CONCURRENT_MODIFICATION);
 */

const RENTCAR_ERRORS = {
  // ========== 동시성 제어 에러 (Concurrency Errors) ==========
  CONCURRENT_MODIFICATION: {
    success: false,
    error_code: 'CONCURRENT_MODIFICATION',
    error: 'Booking was modified by another process',
    message: '예약 정보가 다른 프로세스에 의해 수정되었습니다. 페이지를 새로고침하고 다시 시도해주세요.',
    message_en: 'This booking was just modified by another process. Please refresh and try again.',
    http_status: 409,
    retry_possible: true
  },

  // ========== 차량 가용성 에러 (Vehicle Availability Errors) ==========
  VEHICLE_NOT_AVAILABLE: {
    success: false,
    error_code: 'VEHICLE_NOT_AVAILABLE',
    error: 'Vehicle is not available',
    message: '선택하신 차량은 현재 예약할 수 없습니다. 다른 차량을 선택해주세요.',
    message_en: 'The selected vehicle is not available for booking. Please choose another vehicle.',
    http_status: 409,
    retry_possible: false
  },

  OVERLAP_CONFLICT: {
    success: false,
    error_code: 'OVERLAP_CONFLICT',
    error: 'Vehicle has overlapping bookings',
    message: '선택하신 기간에 다른 예약이 있습니다. 다른 차량을 선택하거나 날짜를 변경해주세요.',
    message_en: 'Another booking exists during this period. Please select another vehicle or change dates.',
    http_status: 409,
    retry_possible: false
  },

  VEHICLE_BLOCKED: {
    success: false,
    error_code: 'VEHICLE_BLOCKED',
    error: 'Vehicle is blocked',
    message: '선택하신 차량은 현재 이용이 불가능합니다 (점검 또는 외부 예약). 다른 차량을 선택해주세요.',
    message_en: 'This vehicle is currently unavailable (maintenance or external booking). Please select another vehicle.',
    http_status: 409,
    retry_possible: false
  },

  DISABLED_VEHICLE: {
    success: false,
    error_code: 'DISABLED_VEHICLE',
    error: 'Vehicle is disabled',
    message: '선택하신 차량은 예약이 중단되었습니다. 다른 차량을 선택해주세요.',
    message_en: 'This vehicle is no longer available for booking. Please select another vehicle.',
    http_status: 409,
    retry_possible: false
  },

  // ========== 결제 에러 (Payment Errors) ==========
  PAYMENT_FAILED: {
    success: false,
    error_code: 'PAYMENT_FAILED',
    error: 'Payment processing failed',
    message: '결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    message_en: 'Payment processing failed. Please try again later.',
    http_status: 400,
    retry_possible: true
  },

  AMOUNT_MISMATCH: {
    success: false,
    error_code: 'AMOUNT_MISMATCH',
    error: 'Payment amount does not match',
    message: '결제 금액이 일치하지 않습니다. 페이지를 새로고침하고 다시 시도해주세요.',
    message_en: 'Payment amount mismatch. Please refresh the page and try again.',
    http_status: 400,
    retry_possible: true
  },

  PAYMENT_ALREADY_PROCESSED: {
    success: false,
    error_code: 'PAYMENT_ALREADY_PROCESSED',
    error: 'Payment already processed',
    message: '이미 처리된 결제입니다.',
    message_en: 'This payment has already been processed.',
    http_status: 200,
    retry_possible: false,
    is_idempotent: true
  },

  // ========== 예약 상태 에러 (Booking Status Errors) ==========
  INVALID_BOOKING_STATUS: {
    success: false,
    error_code: 'INVALID_BOOKING_STATUS',
    error: 'Invalid booking status for this operation',
    message: '현재 예약 상태에서는 이 작업을 수행할 수 없습니다.',
    message_en: 'This operation is not allowed for the current booking status.',
    http_status: 400,
    retry_possible: false
  },

  BOOKING_HOLD_EXPIRED: {
    success: false,
    error_code: 'BOOKING_HOLD_EXPIRED',
    error: 'Booking hold has expired',
    message: '예약 대기 시간이 만료되었습니다. 새로운 예약을 생성해주세요.',
    message_en: 'Booking hold has expired. Please create a new booking.',
    http_status: 400,
    retry_possible: false
  },

  CANNOT_CANCEL_AFTER_PICKUP: {
    success: false,
    error_code: 'CANNOT_CANCEL_AFTER_PICKUP',
    error: 'Cannot cancel after pickup',
    message: '픽업 이후에는 예약을 취소할 수 없습니다. 고객센터로 문의해주세요.',
    message_en: 'Rentals cannot be canceled after pickup. Please contact support for refund requests.',
    http_status: 400,
    retry_possible: false
  },

  // ========== 차단 관련 에러 (Block Errors) ==========
  DUPLICATE_BLOCK: {
    success: false,
    error_code: 'DUPLICATE_BLOCK',
    error: 'Vehicle already has an active block during this period',
    message: '해당 기간에 이미 활성 차단이 있습니다. 기존 차단을 해제하거나 수정해주세요.',
    message_en: 'An active block already exists during this period. Resolve or modify the existing block.',
    http_status: 409,
    retry_possible: false
  },

  PAST_BLOCK_NOT_ALLOWED: {
    success: false,
    error_code: 'PAST_BLOCK_NOT_ALLOWED',
    error: 'Cannot create block in the past',
    message: '과거 시간에는 차단을 생성할 수 없습니다. 미래 시간을 선택해주세요.',
    message_en: 'Block start time must be in the future.',
    http_status: 400,
    retry_possible: false
  },

  BLOCK_DURATION_EXCEEDED: {
    success: false,
    error_code: 'BLOCK_DURATION_EXCEEDED',
    error: 'Block duration too long',
    message: '차단 기간이 너무 깁니다. 최대 365일까지 가능합니다.',
    message_en: 'Block duration cannot exceed 365 days.',
    http_status: 400,
    retry_possible: false
  },

  BOOKING_CONFLICT: {
    success: false,
    error_code: 'BOOKING_CONFLICT',
    error: 'Vehicle has overlapping bookings during this period',
    message: '해당 기간에 기존 예약이 있습니다. 예약을 취소하거나 일정을 조정한 후 차단을 생성해주세요.',
    message_en: 'Existing bookings found during this period. Cancel or reschedule the booking before creating a block.',
    http_status: 409,
    retry_possible: false
  },

  // ========== 인증/권한 에러 (Auth/Permission Errors) ==========
  UNAUTHORIZED: {
    success: false,
    error_code: 'UNAUTHORIZED',
    error: 'Authentication required',
    message: '로그인이 필요합니다.',
    message_en: 'Authentication required.',
    http_status: 401,
    retry_possible: false
  },

  FORBIDDEN: {
    success: false,
    error_code: 'FORBIDDEN',
    error: 'Access denied',
    message: '접근 권한이 없습니다.',
    message_en: 'Access denied.',
    http_status: 403,
    retry_possible: false
  },

  VENDOR_OWNERSHIP_VIOLATION: {
    success: false,
    error_code: 'VENDOR_OWNERSHIP_VIOLATION',
    error: 'This resource belongs to another vendor',
    message: '다른 업체의 리소스입니다. 자신의 업체 리소스만 수정할 수 있습니다.',
    message_en: 'This resource belongs to another vendor. You can only modify your own resources.',
    http_status: 403,
    retry_possible: false
  },

  // ========== 검증 에러 (Validation Errors) ==========
  INVALID_INPUT: {
    success: false,
    error_code: 'INVALID_INPUT',
    error: 'Invalid input data',
    message: '입력 데이터가 유효하지 않습니다.',
    message_en: 'Invalid input data.',
    http_status: 400,
    retry_possible: false
  },

  MISSING_REQUIRED_FIELDS: {
    success: false,
    error_code: 'MISSING_REQUIRED_FIELDS',
    error: 'Required fields missing',
    message: '필수 입력 항목이 누락되었습니다.',
    message_en: 'Required fields are missing.',
    http_status: 400,
    retry_possible: false
  },

  INVALID_TIME_RANGE: {
    success: false,
    error_code: 'INVALID_TIME_RANGE',
    error: 'Invalid time range',
    message: '종료 시간은 시작 시간보다 뒤여야 합니다.',
    message_en: 'End time must be after start time.',
    http_status: 400,
    retry_possible: false
  },

  INVALID_BLOCK_REASON: {
    success: false,
    error_code: 'INVALID_BLOCK_REASON',
    error: 'Invalid block_reason',
    message: '유효하지 않은 차단 사유입니다. external_booking, maintenance, repair, inspection 중 하나를 선택해주세요.',
    message_en: 'Invalid block_reason. Must be one of: external_booking, maintenance, repair, inspection.',
    http_status: 400,
    retry_possible: false
  },

  // ========== 리소스 에러 (Resource Errors) ==========
  BOOKING_NOT_FOUND: {
    success: false,
    error_code: 'BOOKING_NOT_FOUND',
    error: 'Booking not found',
    message: '예약을 찾을 수 없습니다.',
    message_en: 'Booking not found.',
    http_status: 404,
    retry_possible: false
  },

  VEHICLE_NOT_FOUND: {
    success: false,
    error_code: 'VEHICLE_NOT_FOUND',
    error: 'Vehicle not found',
    message: '차량을 찾을 수 없습니다.',
    message_en: 'Vehicle not found.',
    http_status: 404,
    retry_possible: false
  },

  // ========== 서버 에러 (Server Errors) ==========
  INTERNAL_SERVER_ERROR: {
    success: false,
    error_code: 'INTERNAL_SERVER_ERROR',
    error: 'Internal server error',
    message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    message_en: 'Internal server error. Please try again later.',
    http_status: 500,
    retry_possible: true
  },

  DATABASE_ERROR: {
    success: false,
    error_code: 'DATABASE_ERROR',
    error: 'Database operation failed',
    message: '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    message_en: 'Database operation failed. Please try again later.',
    http_status: 500,
    retry_possible: true
  }
};

/**
 * 에러 응답 생성 헬퍼
 *
 * @param {string} errorCode - RENTCAR_ERRORS의 키
 * @param {object} additionalData - 추가 데이터 (선택적)
 * @returns {object} 표준화된 에러 응답 객체
 */
function createErrorResponse(errorCode, additionalData = {}) {
  const baseError = RENTCAR_ERRORS[errorCode];

  if (!baseError) {
    console.error(`❌ Unknown error code: ${errorCode}`);
    return {
      ...RENTCAR_ERRORS.INTERNAL_SERVER_ERROR,
      ...additionalData
    };
  }

  return {
    ...baseError,
    ...additionalData,
    timestamp: new Date().toISOString()
  };
}

/**
 * Express 응답 헬퍼
 *
 * @param {Response} res - Express response 객체
 * @param {string} errorCode - RENTCAR_ERRORS의 키
 * @param {object} additionalData - 추가 데이터 (선택적)
 */
function sendError(res, errorCode, additionalData = {}) {
  const errorResponse = createErrorResponse(errorCode, additionalData);
  const httpStatus = errorResponse.http_status || 500;

  return res.status(httpStatus).json(errorResponse);
}

module.exports = {
  RENTCAR_ERRORS,
  createErrorResponse,
  sendError
};
