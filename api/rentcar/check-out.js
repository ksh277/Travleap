/**
 * 렌트카 차량 반납 체크아웃 API
 *
 * 기능:
 * - 차량 반납 기록
 * - 차량 상태 비교 (인수 시 vs 반납 시)
 * - 연체료 자동 계산 (유예 시간 30분 + 시간당 과금)
 * - 추가 요금 계산 (손상, 주행거리 초과, 연료 부족)
 * - 상태 전이 검증 및 로깅 (in_progress → completed)
 * - status: picked_up → returned
 *
 * 라우트: POST /api/rentcar/bookings/:id/check-out
 * 권한: 벤더, 관리자
 */

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');

module.exports = async function handler(req, res) {
  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. JWT 인증 확인
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = JWTUtils.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // 3. 권한 확인
    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin or vendor role required'
      });
    }

    // 4. 예약 ID 또는 booking_number 추출
    const bookingId = req.query.id || req.params.id;
    const { booking_number } = req.body;

    if (!bookingId && !booking_number) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID or booking_number is required'
      });
    }

    // 5. 요청 데이터 파싱
    const {
      vehicle_condition,
      checked_out_by,
      additional_charges,
      notes,
      fuel_level,
      mileage,
      damage_notes
    } = req.body;

    // Support both old format (vehicle_condition object) and new format (direct fields)
    const finalMileage = mileage || (vehicle_condition && vehicle_condition.mileage);
    const finalFuelLevel = fuel_level || (vehicle_condition && vehicle_condition.fuel_level);
    const finalCondition = vehicle_condition?.condition || vehicle_condition || 'good';

    if (finalMileage === undefined || finalFuelLevel === undefined) {
      return res.status(400).json({
        success: false,
        error: 'mileage and fuel_level are required'
      });
    }

    console.log(`📤 [Check-Out] Processing for booking ${bookingId || booking_number}`);

    // 6. 예약 정보 조회 (ID 또는 booking_number로)
    let query = `
      SELECT
        id,
        booking_number,
        vendor_id,
        status,
        pickup_checked_in_at,
        pickup_vehicle_condition,
        return_checked_out_at,
        return_at_utc,
        hourly_rate_krw
      FROM rentcar_bookings
      WHERE ${bookingId ? 'id = ?' : 'booking_number = ?'}
      LIMIT 1
    `;
    const bookings = await db.query(query, [bookingId || booking_number]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // 7. 벤더 권한 확인
    if (decoded.role === 'vendor' && decoded.vendorId !== booking.vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - This booking belongs to another vendor'
      });
    }

    // 8. 상태 전이 검증 (picked_up만 returned로 전이 가능)
    const ALLOWED_TRANSITIONS = {
      'pending': [],
      'confirmed': [],
      'picked_up': ['returned', 'completed'],
      'returned': ['completed'],
      'completed': [],
      'canceled': []
    };

    const currentStatus = booking.status;
    const targetStatus = 'returned'; // 반납 완료 상태 (보증금 정산 전)

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: ${currentStatus} → ${targetStatus}`,
        current_status: booking.status,
        allowed_transitions: allowedNext,
        message: 'Only IN_PROGRESS (picked_up) rentals can be checked out'
      });
    }

    console.log(`   ✅ State transition validated: ${currentStatus} → ${targetStatus}`);

    // 9. 예약 상태 확인
    if (!booking.pickup_checked_in_at) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle has not been picked up yet',
        message: 'Check-in must be completed before check-out'
      });
    }

    if (booking.status === 'returned' || booking.return_checked_out_at) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle already returned',
        checked_out_at: booking.return_checked_out_at
      });
    }

    // 9. 차량 상태 비교 (인수 vs 반납)
    let pickupCondition = {};
    try {
      if (booking.pickup_vehicle_condition) {
        pickupCondition = JSON.parse(booking.pickup_vehicle_condition);
      }
    } catch (parseError) {
      console.warn('⚠️  Failed to parse pickup condition:', parseError);
    }

    const comparison = {
      mileage_driven: mileage - (pickupCondition.mileage || 0),
      fuel_difference: fuel_level - (pickupCondition.fuel_level || 0),
      new_damages: vehicle_condition.damages || []
    };

    // 10. 연체료 계산 (Late Fee Calculation)
    const actualReturnTime = new Date();
    const plannedReturnTime = booking.return_at_utc ? new Date(booking.return_at_utc) : null;
    const graceMinutes = 30; // 유예 시간 30분
    const hourlyRate = booking.hourly_rate_krw || 0;

    let lateReturnHours = 0;
    let lateReturnFee = 0;

    if (plannedReturnTime) {
      const gracePeriodMs = graceMinutes * 60 * 1000;
      const timeAfterGrace = actualReturnTime.getTime() - plannedReturnTime.getTime() - gracePeriodMs;

      if (timeAfterGrace > 0) {
        // 1시간 단위 올림
        lateReturnHours = Math.ceil(timeAfterGrace / (60 * 60 * 1000));
        lateReturnFee = lateReturnHours * hourlyRate;

        console.log(`   ⚠️  Late return detected:`);
        console.log(`      Planned: ${plannedReturnTime.toISOString()}`);
        console.log(`      Actual: ${actualReturnTime.toISOString()}`);
        console.log(`      Late hours: ${lateReturnHours}h`);
        console.log(`      Late fee: ${lateReturnFee.toLocaleString()}원`);
      } else {
        console.log(`   ✅ On-time return (within ${graceMinutes}min grace period)`);
      }
    }

    // 11. 추가 요금 계산 (손상, 연료 부족 등)
    const charges = additional_charges || [];
    let otherCharges = 0;

    charges.forEach((charge) => {
      otherCharges += charge.amount || 0;
    });

    // 총 추가 요금 = 연체료 + 기타 요금
    const totalAdditionalFee = lateReturnFee + otherCharges;

    // 12. 차량 반납 상태 데이터 구성
    const returnConditionData = {
      mileage: finalMileage,
      fuel_level: finalFuelLevel,
      condition: finalCondition,
      damages: (vehicle_condition && vehicle_condition.damages) || [],
      damage_notes: damage_notes || notes || '',
      photos: (vehicle_condition && vehicle_condition.photos) || [],
      notes: notes || (vehicle_condition && vehicle_condition.notes) || '',
      late_return: {
        hours: lateReturnHours,
        fee: lateReturnFee,
        grace_minutes: graceMinutes
      },
      additional_charges: charges,
      other_charges: otherCharges,
      total_additional_fee: totalAdditionalFee,
      comparison,
      recorded_at: actualReturnTime.toISOString(),
      recorded_by: checked_out_by || decoded.email
    };

    // 13. DB 업데이트 (체크아웃 처리)
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'returned',
        return_checked_out_at = NOW(),
        return_checked_out_by = ?,
        return_vehicle_condition = ?,
        actual_return_at_utc = ?,
        late_return_hours = ?,
        late_return_fee_krw = ?,
        total_additional_fee_krw = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      checked_out_by || decoded.email,
      JSON.stringify(returnConditionData),
      actualReturnTime,
      lateReturnHours,
      lateReturnFee,
      totalAdditionalFee,
      booking.id
    ]);

    console.log(`✅ [Check-Out] Completed: ${booking.booking_number}`);

    // 14. 보증금 정산 (추가 비용이 있을 경우)
    let depositSettlement = null;

    if (totalAdditionalFee > 0) {
      console.log(`💰 [Check-Out] 보증금 정산 시작...`);

      try {
        // 보증금 정보 조회
        const [deposits] = await db.query(`
          SELECT id, payment_key, deposit_amount_krw, status
          FROM rentcar_rental_deposits
          WHERE rental_id = ? AND status = 'preauthorized'
          LIMIT 1
        `, [booking.id]);

        if (deposits.length > 0) {
          const deposit = deposits[0];
          const depositAmount = deposit.deposit_amount_krw || 0;

          console.log(`   💵 보증금: ${depositAmount.toLocaleString()}원`);
          console.log(`   🚨 총 추가 비용: ${totalAdditionalFee.toLocaleString()}원`);

          // Toss Payments API 호출을 위한 설정
          const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
          const authHeader = `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`;

          if (totalAdditionalFee <= depositAmount) {
            // 보증금 >= 추가 비용 → 부분 환불
            const refundAmount = depositAmount - totalAdditionalFee;

            console.log(`   ✅ 보증금에서 차감 (${totalAdditionalFee.toLocaleString()}원) + 환불 (${refundAmount.toLocaleString()}원)`);

            const fetch = (await import('node-fetch')).default;
            const cancelResponse = await fetch(`https://api.tosspayments.com/v1/payments/${deposit.payment_key}/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                cancelReason: `추가 비용 차감 (연체료: ${lateReturnFee}원) - 남은 금액 환불`,
                cancelAmount: refundAmount
              })
            });

            const cancelResult = await cancelResponse.json();

            if (cancelResponse.ok) {
              depositSettlement = {
                deposit_captured: totalAdditionalFee,
                deposit_refunded: refundAmount,
                additional_payment_required: 0,
                status: 'partial_refunded'
              };

              await db.execute(`
                UPDATE rentcar_rental_deposits
                SET status = 'partial_captured', captured_amount_krw = ?, refund_amount_krw = ?, updated_at = NOW()
                WHERE id = ?
              `, [totalAdditionalFee, refundAmount, deposit.id]);

              console.log(`   ✅ 보증금 정산 완료`);
            } else {
              console.error(`   ❌ 보증금 환불 실패:`, cancelResult);
            }

          } else {
            // 보증금 < 추가 비용 → 보증금 전액 차감 + 추가 결제 필요
            const additionalPaymentNeeded = totalAdditionalFee - depositAmount;

            console.log(`   🚨 보증금 부족 → 전액 차감 + 추가 결제 필요 (${additionalPaymentNeeded.toLocaleString()}원)`);

            depositSettlement = {
              deposit_captured: depositAmount,
              deposit_refunded: 0,
              additional_payment_required: additionalPaymentNeeded,
              status: 'additional_payment_required'
            };

            await db.execute(`
              UPDATE rentcar_rental_deposits
              SET status = 'fully_captured', captured_amount_krw = ?, updated_at = NOW()
              WHERE id = ?
            `, [depositAmount, deposit.id]);

            console.log(`   ⚠️  추가 결제 필요 알림 전송`);
          }

          // 보증금 정산 이벤트 로그
          await db.execute(`
            INSERT INTO rentcar_rental_events
            (rental_id, event_type, event_data, created_at)
            VALUES (?, 'deposit_settled', ?, NOW())
          `, [
            booking.id,
            JSON.stringify({
              ...depositSettlement,
              late_return_fee: lateReturnFee,
              other_fees: otherCharges,
              total_additional_fee: totalAdditionalFee,
              settled_at: new Date().toISOString()
            })
          ]);
        }
      } catch (depositError) {
        console.error('❌ [Check-Out] 보증금 정산 실패:', depositError);
        // 체크아웃은 성공했지만 보증금 정산은 실패 (나중에 수동 처리 가능)
      }
    } else {
      // 추가 비용 없음 → 보증금 전액 환불
      console.log(`💰 [Check-Out] 추가 비용 없음, 보증금 전액 환불 처리...`);

      try {
        const [deposits] = await db.query(`
          SELECT id, payment_key, deposit_amount_krw, status
          FROM rentcar_rental_deposits
          WHERE rental_id = ? AND status = 'preauthorized'
          LIMIT 1
        `, [booking.id]);

        if (deposits.length > 0) {
          const deposit = deposits[0];
          const depositAmount = deposit.deposit_amount_krw || 0;

          const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
          const authHeader = `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`;

          const fetch = (await import('node-fetch')).default;
          const cancelResponse = await fetch(`https://api.tosspayments.com/v1/payments/${deposit.payment_key}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              cancelReason: '정상 반납 - 보증금 전액 환불',
              cancelAmount: depositAmount
            })
          });

          if (cancelResponse.ok) {
            depositSettlement = {
              deposit_captured: 0,
              deposit_refunded: depositAmount,
              additional_payment_required: 0,
              status: 'refunded'
            };

            await db.execute(`
              UPDATE rentcar_rental_deposits
              SET status = 'refunded', refund_amount_krw = ?, refunded_at = NOW(), updated_at = NOW()
              WHERE id = ?
            `, [depositAmount, deposit.id]);

            console.log(`   ✅ 보증금 전액 환불 완료`);
          }
        }
      } catch (depositError) {
        console.error('❌ [Check-Out] 보증금 환불 실패:', depositError);
      }
    }

    // 15. 상태 전이 로그 기록
    try {
      await db.execute(`
        INSERT INTO rentcar_state_transitions (
          rental_id,
          from_status,
          to_status,
          transition_reason,
          transitioned_by,
          transitioned_at
        ) VALUES (?, ?, 'returned', 'Vehicle returned', ?, NOW())
      `, [
        bookingId,
        currentStatus,
        checked_out_by || decoded.email
      ]);
    } catch (logError) {
      console.warn('⚠️  [Check-Out] State transition log failed (non-critical):', logError.message);
    }

    // 15. 추가 요금 알림 메시지 생성
    let message = 'Vehicle check-out completed successfully';
    if (totalAdditionalFee > 0) {
      message += `. Additional charges: ${totalAdditionalFee.toLocaleString()}원`;
      if (lateReturnFee > 0) {
        message += ` (Late fee: ${lateReturnFee.toLocaleString()}원 for ${lateReturnHours}h)`;
      }
      if (otherCharges > 0) {
        message += ` (Other: ${otherCharges.toLocaleString()}원)`;
      }
    }

    // 16. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        status: 'returned',
        checked_out_at: actualReturnTime.toISOString(),
        checked_out_by: checked_out_by || decoded.email,
        vehicle_condition: returnConditionData,
        comparison,
        late_return: {
          hours: lateReturnHours,
          fee: lateReturnFee,
          grace_minutes: graceMinutes
        },
        late_return_fee_krw: lateReturnFee,
        additional_charges: charges,
        other_charges: otherCharges,
        total_additional_fee: totalAdditionalFee,
        deposit_settlement: depositSettlement // 보증금 정산 결과 추가
      },
      message
    });

  } catch (error) {
    console.error('❌ [Check-Out] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
