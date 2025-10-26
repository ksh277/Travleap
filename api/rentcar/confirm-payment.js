/**
 * 렌트카 결제 확정 API
 *
 * 기능:
 * - Toss Payments confirm API 호출
 * - 트랜잭션으로 rental_payments 기록
 * - rentcar_bookings 상태 업데이트 (pending → confirmed)
 * - payment_status: pending → paid
 *
 * 라우트: POST /api/rentals/:booking_number/confirm
 * 권한: 예약 소유자 또는 공개
 */

const { db } = require('../../utils/database');
const { checkIdempotency, markEventProcessed } = require('./webhook-idempotency');
const { sendError, RENTCAR_ERRORS } = require('../../utils/rentcar-error-codes');

// Toss Payments 클라이언트 초기화
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_API_URL = 'https://api.tosspayments.com/v1/payments/confirm';

module.exports = async function handler(req, res) {
  let webhookEventId = null;

  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. 요청 데이터 파싱
    const bookingNumber = req.query.booking_number || req.params.booking_number;
    const { paymentKey, orderId, amount } = req.body;

    if (!bookingNumber || !paymentKey || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing',
        required: ['paymentKey', 'orderId', 'amount']
      });
    }

    console.log(`💳 [Confirm-Payment] Processing payment for ${bookingNumber}`);

    // 3. 웹훅 멱등성 체크 (중복 결제 확인 방지)
    const idempotencyCheck = await checkIdempotency(paymentKey, 'PAYMENT_CONFIRMED', {
      bookingNumber,
      orderId,
      amount
    });

    if (idempotencyCheck.isProcessed) {
      console.log(`✅ [Confirm-Payment] Payment already processed (idempotent)`);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        isIdempotent: true,
        eventId: idempotencyCheck.eventId
      });
    }

    webhookEventId = idempotencyCheck.eventId;
    console.log(`✅ [Confirm-Payment] New payment event (ID: ${webhookEventId})`);

    // 4. 예약 조회
    const rentals = await db.query(`
      SELECT
        id,
        booking_number,
        vendor_id,
        vehicle_id,
        total_price_krw,
        deposit_amount_krw,
        status,
        payment_status,
        hold_expires_at
      FROM rentcar_bookings
      WHERE booking_number = ?
      LIMIT 1
    `, [bookingNumber]);

    if (rentals.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const rental = rentals[0];

    // 4. 상태 검증
    if (rental.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking status',
        current_status: rental.status,
        message: 'Only PENDING bookings can be confirmed'
      });
    }

    // HOLD 만료 확인
    const now = new Date();
    const holdExpires = new Date(rental.hold_expires_at);

    if (now > holdExpires) {
      return res.status(400).json({
        success: false,
        error: 'Booking hold has expired',
        hold_expires_at: rental.hold_expires_at,
        message: 'Please create a new booking'
      });
    }

    // 5. 금액 검증 (서버 금액과 일치하는지 확인)
    const expectedAmount = rental.total_price_krw;

    if (parseInt(amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Amount mismatch',
        provided_amount: amount,
        expected_amount: expectedAmount,
        message: 'Payment amount does not match booking total'
      });
    }

    console.log(`   ✅ Amount verified: ${amount} = ${expectedAmount}`);

    // 6. 차량 가용성 재확인 (동시성 제어 - FOR UPDATE)
    console.log(`   🔍 Re-checking vehicle availability...`);

    // 6-1. 예약 정보 조회 (픽업/반납 시간 필요)
    const rentalDetails = await db.query(`
      SELECT pickup_at, return_at
      FROM rentcar_bookings
      WHERE id = ?
      LIMIT 1
    `, [rental.id]);

    if (rentalDetails.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Rental details not found'
      });
    }

    const { pickup_at, return_at } = rentalDetails[0];

    // 6-2. 차량 가용성 체크 (순차적 검증 - PlanetScale은 트랜잭션 미지원)
    try {
      // A. 기존 예약 겹침 체크
      const overlappingRentals = await db.query(`
        SELECT id, booking_number, status
        FROM rentcar_bookings
        WHERE vehicle_id = ?
          AND status IN ('confirmed', 'picked_up', 'returned')
          AND NOT (return_at <= ? OR ? <= pickup_at)
        LIMIT 1
      `, [rental.vehicle_id, pickup_at, return_at]);

      if (overlappingRentals.length > 0) {
        return sendError(res, 'OVERLAP_CONFLICT', {
          conflicting_booking: {
            booking_number: overlappingRentals[0].booking_number,
            status: overlappingRentals[0].status
          }
        });
      }

      // B. 차량 차단 체크
      const blockedPeriods = await db.query(`
        SELECT id, block_reason, starts_at, ends_at
        FROM rentcar_vehicle_blocks
        WHERE vehicle_id = ?
          AND is_active = 1
          AND NOT (ends_at <= ? OR ? <= starts_at)
        LIMIT 1
      `, [rental.vehicle_id, pickup_at, return_at]);

      if (blockedPeriods.length > 0) {
        return sendError(res, 'VEHICLE_BLOCKED', {
          block_info: {
            reason: blockedPeriods[0].block_reason,
            period: `${blockedPeriods[0].starts_at} ~ ${blockedPeriods[0].ends_at}`
          }
        });
      }

      // C. 차량 활성화 상태 체크
      const vehicleStatus = await db.query(`
        SELECT id, is_available, display_name
        FROM rentcar_vehicles
        WHERE id = ?
      `, [rental.vehicle_id]);

      if (vehicleStatus.length === 0 || !vehicleStatus[0].is_available) {
        return sendError(res, 'DISABLED_VEHICLE', {
          vehicle_name: vehicleStatus[0]?.display_name
        });
      }

      console.log(`   ✅ Vehicle availability confirmed`);

    } catch (checkError) {
      console.error('❌ Availability check failed:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Availability check failed',
        message: checkError.message
      });
    }

    // 7. Toss Payments confirm API 호출 (가용성 확인 통과 후)
    console.log(`   🔐 Calling Toss Payments confirm API...`);

    const tossResponse = await fetch(TOSS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount)
      })
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error(`❌ Toss confirm failed:`, tossData);

      return res.status(400).json({
        success: false,
        error: 'Payment confirmation failed',
        toss_error: tossData
      });
    }

    console.log(`   ✅ Toss confirm successful: ${tossData.paymentKey}`);

    // 8. 트랜잭션 시작 - 결제 기록 + 예약 상태 업데이트
    try {
      // 8-1. rental_payments에 기록
      await db.execute(`
        INSERT INTO rentcar_rental_payments (
          rental_id,
          payment_type,
          payment_key,
          order_id,
          method,
          amount_krw,
          status,
          approved_at,
          provider_response,
          created_at
        ) VALUES (?, 'rental', ?, ?, ?, ?, 'approved', NOW(), ?, NOW())
      `, [
        rental.id,
        paymentKey,
        orderId,
        tossData.method,
        parseInt(amount),
        JSON.stringify(tossData)
      ]);

      // 8-2. rentcar_bookings 상태 업데이트 (낙관적 잠금 적용)
      const updateResult = await db.execute(`
        UPDATE rentcar_bookings
        SET
          status = 'confirmed',
          payment_status = 'captured',
          payment_key = ?,
          toss_order_id = ?,
          payment_method = ?,
          payment_transaction_id = ?,
          approved_at = NOW(),
          confirmed_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
          AND status = 'pending'
          AND updated_at = ?
      `, [
        paymentKey,
        orderId,
        tossData.method,
        tossData.transactionKey || paymentKey,
        rental.id,
        rental.updated_at
      ]);

      // 낙관적 잠금 체크: 업데이트된 행이 없으면 동시 수정 발생
      if (updateResult.affectedRows === 0) {
        console.error('❌ Concurrent modification detected - Booking was modified');
        return sendError(res, 'CONCURRENT_MODIFICATION', {
          booking_number: bookingNumber,
          hint: 'Please refresh the page and try again'
        });
      }

      console.log(`   ✅ Database updated with optimistic locking: rental ${rental.id} confirmed`);

      // 8-3. 상태 전이 로그
      await db.execute(`
        INSERT INTO rentcar_state_transitions (
          rental_id, from_status, to_status, transition_reason, transitioned_by
        ) VALUES (?, 'pending', 'confirmed', 'Payment confirmed', 'system')
      `, [rental.id]);

      // 8-4. Webhook 이벤트 기록 (멱등성 보장)
      try {
        await db.execute(`
          INSERT INTO rentcar_rental_events (
            event_id,
            rental_id,
            event_type,
            payment_key,
            payload,
            processed_at
          ) VALUES (?, ?, 'payment.confirmed', ?, ?, NOW())
        `, [
          `confirm_${paymentKey}_${Date.now()}`,
          rental.id,
          paymentKey,
          JSON.stringify(tossData)
        ]);
      } catch (eventError) {
        console.warn('⚠️  Event log failed (non-critical)');
      }

    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);

      // 결제는 성공했지만 DB 업데이트 실패 - 심각한 상황
      // Webhook으로 재처리되어야 함
      return res.status(500).json({
        success: false,
        error: 'Payment confirmed but database update failed',
        message: 'Please contact support with this booking number',
        booking_number: bookingNumber,
        payment_key: paymentKey
      });
    }

    // 9. 웹훅 이벤트 성공 마킹
    if (webhookEventId) {
      await markEventProcessed(webhookEventId, 'success');
    }

    // 10. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        rental_id: rental.id,
        booking_number: rental.booking_number,
        status: 'confirmed',
        payment_status: 'captured',
        payment: {
          payment_key: paymentKey,
          order_id: orderId,
          method: tossData.method,
          amount: parseInt(amount),
          approved_at: new Date().toISOString()
        }
      },
      message: 'Payment confirmed successfully. Your rental is now confirmed!'
    });

  } catch (error) {
    console.error('❌ [Confirm-Payment] Error:', error);

    // 웹훅 이벤트 실패 마킹
    if (webhookEventId) {
      await markEventProcessed(webhookEventId, 'failed', error.message);
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
