/**
 * 예약 상태 머신 (State Machine)
 * Phase 7-3: Booking State Machine
 *
 * 기능:
 * - 예약 상태 전환 관리
 * - 유효한 상태 전환만 허용
 * - 상태 전환 시 부수 효과 (side effects) 처리
 * - 상태 전환 이력 추적
 */

import { AppError, ErrorCode } from './error-handler';
import { businessLogger } from './logger';
import { db } from './database-cloud';

// ============================================
// 예약 상태 정의
// ============================================

export enum BookingStatus {
  // 초기 상태
  PENDING = 'pending',              // 예약 요청 (결제 대기)

  // 확정 상태
  CONFIRMED = 'confirmed',          // 예약 확정 (결제 완료)

  // 진행 상태
  PICKED_UP = 'picked_up',          // 차량 인수 완료
  IN_USE = 'in_use',                // 사용 중
  RETURNED = 'returned',            // 반납 완료

  // 종료 상태
  COMPLETED = 'completed',          // 정산 완료
  CANCELLED = 'cancelled',          // 취소됨
  NO_SHOW = 'no_show',              // 노쇼
  REFUNDED = 'refunded'             // 환불 완료
}

// ============================================
// 상태 전환 규칙
// ============================================

/**
 * 각 상태에서 가능한 다음 상태들
 */
const STATE_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,        // 결제 완료
    BookingStatus.CANCELLED          // 취소
  ],

  [BookingStatus.CONFIRMED]: [
    BookingStatus.PICKED_UP,         // 차량 인수
    BookingStatus.CANCELLED,         // 취소
    BookingStatus.NO_SHOW            // 노쇼
  ],

  [BookingStatus.PICKED_UP]: [
    BookingStatus.IN_USE,            // 사용 시작
    BookingStatus.CANCELLED          // 취소 (특수한 경우)
  ],

  [BookingStatus.IN_USE]: [
    BookingStatus.RETURNED           // 차량 반납
  ],

  [BookingStatus.RETURNED]: [
    BookingStatus.COMPLETED,         // 정산 완료
    BookingStatus.REFUNDED           // 환불 (손상 등)
  ],

  [BookingStatus.COMPLETED]: [
    // 종료 상태 - 전환 불가
  ],

  [BookingStatus.CANCELLED]: [
    BookingStatus.REFUNDED           // 환불 처리
  ],

  [BookingStatus.NO_SHOW]: [
    // 종료 상태 - 전환 불가
  ],

  [BookingStatus.REFUNDED]: [
    // 종료 상태 - 전환 불가
  ]
};

// ============================================
// 상태 전환 인터페이스
// ============================================

export interface StateTransition {
  from: BookingStatus;
  to: BookingStatus;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface BookingStateMachine {
  bookingId: number;
  currentStatus: BookingStatus;
  history: StateTransition[];
}

// ============================================
// 상태 전환 함수
// ============================================

/**
 * 상태 전환이 유효한지 확인
 */
export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  const allowedTransitions = STATE_TRANSITIONS[from] || [];
  return allowedTransitions.includes(to);
}

/**
 * 상태 전환 실행
 */
export async function transitionBookingState(
  bookingId: number,
  toStatus: BookingStatus,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  // 1. 현재 예약 조회
  const bookings = await db.query(`
    SELECT id, status, vendor_id, vehicle_id, user_id
    FROM rentcar_bookings
    WHERE id = ?
  `, [bookingId]);

  if (bookings.length === 0) {
    throw new AppError(
      ErrorCode.NOT_FOUND,
      `Booking not found: ${bookingId}`,
      '예약을 찾을 수 없습니다.'
    );
  }

  const booking = bookings[0];
  const currentStatus = booking.status as BookingStatus;

  // 2. 상태 전환 유효성 검증
  if (!isValidTransition(currentStatus, toStatus)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Invalid state transition: ${currentStatus} -> ${toStatus}`,
      `예약 상태를 ${currentStatus}에서 ${toStatus}로 변경할 수 없습니다.`,
      'status',
      { currentStatus, targetStatus: toStatus }
    );
  }

  // 3. 상태 전환 전 검증
  await validateStateTransition(booking, toStatus);

  // 4. 데이터베이스 업데이트
  await db.execute(`
    UPDATE rentcar_bookings
    SET status = ?, updated_at = NOW()
    WHERE id = ?
  `, [toStatus, bookingId]);

  // 5. 상태 전환 이력 기록
  await recordStateTransition(bookingId, currentStatus, toStatus, reason, metadata);

  // 6. 부수 효과 처리
  await handleStateTransitionSideEffects(booking, currentStatus, toStatus, metadata);

  // 7. 로깅
  businessLogger.bookingCreated(bookingId, booking.vehicle_id, booking.user_id);
  businessLogger.info(`Booking state transition: ${currentStatus} -> ${toStatus}`, {
    bookingId,
    from: currentStatus,
    to: toStatus,
    reason,
    metadata
  });
}

/**
 * 상태 전환 전 추가 검증
 */
async function validateStateTransition(
  booking: any,
  toStatus: BookingStatus
): Promise<void> {
  // CONFIRMED로 전환 시 차량 availability 확인
  if (toStatus === BookingStatus.CONFIRMED) {
    const availability = await checkVehicleAvailability(
      booking.vehicle_id,
      booking.pickup_date,
      booking.dropoff_date,
      booking.id
    );

    if (!availability.available) {
      throw new AppError(
        ErrorCode.BOOKING_CONFLICT,
        'Vehicle not available',
        '선택하신 날짜에 해당 차량을 이용할 수 없습니다.'
      );
    }
  }

  // PICKED_UP로 전환 시 픽업 시간 확인
  if (toStatus === BookingStatus.PICKED_UP) {
    const pickupDate = new Date(booking.pickup_date);
    const now = new Date();

    // 픽업 시간이 아직 안 됨
    if (now < pickupDate) {
      const hoursDiff = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Pickup time not reached',
          '픽업 시간이 아직 도래하지 않았습니다.'
        );
      }
    }
  }

  // RETURNED로 전환 시 반납 시간 확인
  if (toStatus === BookingStatus.RETURNED) {
    // 최소 사용 시간 체크 등
  }
}

/**
 * 차량 가용성 확인
 */
async function checkVehicleAvailability(
  vehicleId: number,
  pickupDate: string,
  dropoffDate: string,
  excludeBookingId?: number
): Promise<{ available: boolean; conflictingBookings?: number[] }> {
  let sql = `
    SELECT id
    FROM rentcar_bookings
    WHERE vehicle_id = ?
      AND status IN ('confirmed', 'picked_up', 'in_use')
      AND (
        (pickup_date <= ? AND dropoff_date >= ?)
        OR (pickup_date <= ? AND dropoff_date >= ?)
        OR (pickup_date >= ? AND dropoff_date <= ?)
      )
  `;

  const params: any[] = [vehicleId, pickupDate, pickupDate, dropoffDate, dropoffDate, pickupDate, dropoffDate];

  if (excludeBookingId) {
    sql += ` AND id != ?`;
    params.push(excludeBookingId);
  }

  const conflicts = await db.query(sql, params);

  return {
    available: conflicts.length === 0,
    conflictingBookings: conflicts.map((c: any) => c.id)
  };
}

/**
 * 상태 전환 이력 기록
 */
async function recordStateTransition(
  bookingId: number,
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await db.execute(`
    INSERT INTO rentcar_booking_history (
      booking_id, from_status, to_status, reason, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, NOW())
  `, [
    bookingId,
    fromStatus,
    toStatus,
    reason || null,
    metadata ? JSON.stringify(metadata) : null
  ]);
}

/**
 * 상태 전환 시 부수 효과 처리
 */
async function handleStateTransitionSideEffects(
  booking: any,
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  metadata?: Record<string, any>
): Promise<void> {
  // CONFIRMED: 재고 차감, 알림 발송
  if (toStatus === BookingStatus.CONFIRMED) {
    // TODO: 알림 발송
    // await sendBookingConfirmationEmail(booking);
    // await sendBookingConfirmationSMS(booking);
  }

  // CANCELLED: 재고 복구, 취소 수수료 계산, 환불 처리
  if (toStatus === BookingStatus.CANCELLED) {
    const cancelFee = calculateCancellationFee(booking, new Date());
    await db.execute(`
      UPDATE rentcar_bookings
      SET cancellation_fee_krw = ?
      WHERE id = ?
    `, [cancelFee, booking.id]);

    // TODO: 환불 처리
  }

  // COMPLETED: 리뷰 요청
  if (toStatus === BookingStatus.COMPLETED) {
    // TODO: 리뷰 요청 이메일/SMS
  }

  // RETURNED: 차량 상태 검사 기록
  if (toStatus === BookingStatus.RETURNED) {
    if (metadata?.vehicleCondition) {
      // 차량 상태 기록
    }
  }
}

/**
 * 취소 수수료 계산
 */
function calculateCancellationFee(booking: any, cancelDate: Date): number {
  const pickupDate = new Date(booking.pickup_date);
  const daysDiff = Math.ceil((pickupDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24));

  const totalAmount = booking.total_krw || 0;

  // 취소 정책
  if (daysDiff >= 7) {
    return 0; // 7일 전: 무료 취소
  } else if (daysDiff >= 3) {
    return totalAmount * 0.1; // 3-7일 전: 10%
  } else if (daysDiff >= 1) {
    return totalAmount * 0.3; // 1-3일 전: 30%
  } else {
    return totalAmount * 0.5; // 당일: 50%
  }
}

/**
 * 예약 상태 이력 조회
 */
export async function getBookingHistory(bookingId: number): Promise<StateTransition[]> {
  const history = await db.query(`
    SELECT
      from_status,
      to_status,
      reason,
      metadata,
      created_at
    FROM rentcar_booking_history
    WHERE booking_id = ?
    ORDER BY created_at ASC
  `, [bookingId]);

  return history.map((h: any) => ({
    from: h.from_status,
    to: h.to_status,
    timestamp: h.created_at,
    reason: h.reason,
    metadata: h.metadata ? JSON.parse(h.metadata) : undefined
  }));
}

/**
 * 현재 상태에서 가능한 액션 조회
 */
export function getAvailableActions(currentStatus: BookingStatus): BookingStatus[] {
  return STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * 상태 머신 다이어그램 생성 (Mermaid 포맷)
 */
export function generateStateDiagram(): string {
  let diagram = `stateDiagram-v2
  [*] --> pending

`;

  for (const [from, toStates] of Object.entries(STATE_TRANSITIONS)) {
    for (const to of toStates) {
      diagram += `  ${from} --> ${to}\n`;
    }

    // 종료 상태
    if (toStates.length === 0) {
      diagram += `  ${from} --> [*]\n`;
    }
  }

  return diagram;
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 예약 취소
 */
export async function cancelBooking(bookingId: number, reason?: string): Promise<void> {
  await transitionBookingState(bookingId, BookingStatus.CANCELLED, reason);
}

/**
 * 예약 확정
 */
export async function confirmBooking(bookingId: number, paymentInfo?: any): Promise<void> {
  await transitionBookingState(bookingId, BookingStatus.CONFIRMED, 'Payment completed', { payment: paymentInfo });
}

/**
 * 차량 인수
 */
export async function pickupVehicle(bookingId: number, metadata?: any): Promise<void> {
  await transitionBookingState(bookingId, BookingStatus.PICKED_UP, 'Vehicle picked up', metadata);
}

/**
 * 차량 반납
 */
export async function returnVehicle(bookingId: number, vehicleCondition?: any): Promise<void> {
  await transitionBookingState(bookingId, BookingStatus.RETURNED, 'Vehicle returned', { vehicleCondition });
}

/**
 * 예약 완료
 */
export async function completeBooking(bookingId: number): Promise<void> {
  await transitionBookingState(bookingId, BookingStatus.COMPLETED, 'Booking completed');
}

export default {
  BookingStatus,
  isValidTransition,
  transitionBookingState,
  getBookingHistory,
  getAvailableActions,
  generateStateDiagram,
  cancelBooking,
  confirmBooking,
  pickupVehicle,
  returnVehicle,
  completeBooking
};
