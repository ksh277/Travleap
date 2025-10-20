/**
 * 반납 검수 API
 *
 * 기능:
 * - 차량 상태 검수
 * - 패널티 계산
 * - 보증금 정산 (partial capture 또는 void)
 *
 * 프로세스:
 * 1. 예약 조회 (deposit_auth_id 확인)
 * 2. 검수 결과 기록
 * 3. 패널티 금액 계산
 * 4. penalty > 0 → captureDepositPartial
 *    penalty = 0 → voidDeposit
 */

import { db } from '../../utils/database';
import { tossPaymentsServer } from '../../utils/toss-payments-server';

>;
  additional_fees?: Array<{
    type;
    description;
    amount;
  }>;
  notes?;
}

;
  error?;
}

/**
 * 패널티 계산
 */
function calculatePenalty(inspection: ReturnInspection): {
  total;
  breakdown: Array<{ type; amount; description: string }>;
} {
  const penalties: Array<{ type; amount; description: string }> = [];

  // 1. 손상 비용
  if (inspection.damages && inspection.damages.length > 0) {
    for (const damage of inspection.damages) {
      penalties.push({
        type: 'DAMAGE',
        amount: damage.estimatedCost,
        description: `${damage.type} (${damage.severity}): ${damage.description}`
      });
    }
  }

  // 2. 연료 부족 페널티 (50% 미만 시)
  if (inspection.fuel_level < 50) {
    const fuelPenalty = Math.round((50 - inspection.fuel_level) * 1000); // 1% = 1000원
    penalties.push({
      type: 'FUEL',
      amount: fuelPenalty,
      description: `연료 부족 (${inspection.fuel_level}%)`
    });
  }

  // 3. 추가 비용
  if (inspection.additional_fees && inspection.additional_fees.length > 0) {
    for (const fee of inspection.additional_fees) {
      penalties.push({
        type: 'ADDITIONAL_FEE',
        amount: fee.amount,
        description: `${fee.type}: ${fee.description}`
      });
    }
  }

  const total = penalties.reduce((sum, p) => sum + p.amount, 0);

  return { total, breakdown: penalties };
}

/**
 * 반납 검수 실행
 */
export async function handleReturnInspection(inspection) {
  const { booking_id } = inspection;

  console.log(`🔍 [Return Inspect] Starting inspection for booking ${booking_id}`);

  try {
    // 1. 예약 조회
    const bookings = await db.query(`
      SELECT
        id,
        booking_number,
        status,
        deposit_auth_id,
        user_id,
        listing_id,
        total_amount
      FROM bookings
      WHERE id = ?
        AND status = 'confirmed'
    `, [booking_id]);

    if (bookings.length === 0) {
      return {
        success: false,
        message: '예약을 찾을 수 없거나 이미 반납 처리되었습니다.',
        error: 'BOOKING_NOT_FOUND'
      };
    }

    const booking = bookings[0];

    if (!booking.deposit_auth_id) {
      return {
        success: false,
        message: '보증금 사전승인 정보가 없습니다.',
        error: 'NO_DEPOSIT_AUTH'
      };
    }

    // 2. 패널티 계산
    const penalty = calculatePenalty(inspection);
    console.log(`💰 [Return Inspect] Penalty: ${penalty.total.toLocaleString()}원`);

    // 3. 검수 결과 DB 저장
    const inspectionResult = await db.execute(`
      INSERT INTO return_inspections (
        booking_id,
        inspector_id,
        vehicle_condition,
        fuel_level,
        mileage,
        damages_json,
        additional_fees_json,
        penalty_total,
        penalty_breakdown,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      booking_id,
      inspection.inspector_id || null,
      inspection.vehicle_condition,
      inspection.fuel_level,
      inspection.mileage,
      JSON.stringify(inspection.damages || []),
      JSON.stringify(inspection.additional_fees || []),
      penalty.total,
      JSON.stringify(penalty.breakdown),
      inspection.notes || null
    ]);

    const inspectionId = inspectionResult.insertId;
    console.log(`✅ [Return Inspect] Inspection ID ${inspectionId} created`);

    // 4. 보증금 정산
    let paymentResult;

    if (penalty.total > 0) {
      // 패널티가 있으면 부분 결제
      console.log(`💳 [Return Inspect] Capturing deposit: ${penalty.total}원`);

      paymentResult = await tossPaymentsServer.captureDepositPartial({
        bookingId: booking_id,
        billingKey: booking.deposit_auth_id,
        amount: penalty.total,
        reason: penalty.breakdown.map(p => p.description).join(', ')
      });

      if (!paymentResult.success) {
        console.error(`❌ [Return Inspect] Deposit capture failed:`, paymentResult.error);
        // 실패해도 검수는 완료, 로그만 기록
      }
    } else {
      // 패널티가 없으면 보증금 해제
      console.log(`🔓 [Return Inspect] Voiding deposit auth`);

      paymentResult = await tossPaymentsServer.voidDeposit({
        bookingId: booking_id,
        billingKey: booking.deposit_auth_id,
        customerKey: `customer-${booking.user_id}`
      });

      if (!paymentResult.success) {
        console.error(`❌ [Return Inspect] Deposit void failed:`, paymentResult.error);
      }
    }

    // 5. 예약 상태 업데이트 (완료)
    await db.execute(`
      UPDATE bookings
      SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [booking_id]);

    // 6. 로그 기록
    await db.execute(`
      INSERT INTO booking_logs (booking_id, action, details, created_at)
      VALUES (?, 'RETURN_INSPECTED', ?, NOW())
    `, [
      booking_id,
      JSON.stringify({
        inspection_id: inspectionId,
        penalty_total: penalty.total,
        payment_result: paymentResult?.success ? 'success' : 'failed'
      })
    ]);

    console.log(`🎉 [Return Inspect] Completed for booking ${booking_id}`);

    // 7. 보증금 계산 (환불액)
    const depositAmount = 50000; // TODO: vendor_settings에서 조회
    const refundAmount = depositAmount - penalty.total;

    return {
      success: true,
      message: '반납 검수가 완료되었습니다.',
      data: {
        booking_id,
        inspection_id: inspectionId,
        penalty_total: penalty.total,
        refund_amount: Math.max(refundAmount, 0),
        payment_result: paymentResult
      }
    };

  } catch (error) {
    console.error(`❌ [Return Inspect] Error:`, error);

    return {
      success: false,
      message: '반납 검수 처리 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 검수 이력 조회
 */
export async function getInspectionHistory(bookingId: number) {
  try {
    const inspections = await db.query(`
      SELECT *
      FROM return_inspections
      WHERE booking_id = ?
      ORDER BY created_at DESC
    `, [bookingId]);

    return { success: true, inspections };
  } catch (error) {
    console.error('❌ Failed to get inspection history:', error);
    return { success: false, error: 'Failed to fetch inspection history' };
  }
}

// Default export for compatibility
export default {
  handleReturnInspection,
  getInspectionHistory
};
