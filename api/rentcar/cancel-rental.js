/**
 * 렌트카 취소/환불 API
 *
 * 기능:
 * - 취소 정책 자동 계산 (시간 기준 환불율)
 * - Toss Payments 취소 API 호출
 * - status: pending/confirmed → canceled
 * - payment_status: captured → refunded/partially_refunded
 * - 픽업 후 취소 금지
 *
 * 라우트: POST /api/rentals/:booking_number/cancel
 * 권한: 예약 소유자, 벤더, 관리자
 */

const { db } = require('../../utils/database');
const { JWTUtils } = require('../../utils/jwt');

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_CANCEL_URL = 'https://api.tosspayments.com/v1/payments';

module.exports = async function handler(req, res) {
  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. JWT 인증
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let decoded = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      decoded = JWTUtils.verifyToken(token);
    }

    // 3. 요청 데이터 파싱
    const bookingNumber = req.query.booking_number || req.params.booking_number;
    const { cancel_reason } = req.body;

    if (!bookingNumber) {
      return res.status(400).json({
        success: false,
        error: 'booking_number is required'
      });
    }

    console.log(`🚫 [Cancel-Rental] Processing cancellation for ${bookingNumber}`);

    // 4. 예약 조회
    const rentals = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.vendor_id,
        rb.user_id,
        rb.status,
        rb.payment_status,
        rb.payment_key,
        rb.total_price_krw,
        rb.pickup_at_utc,
        rb.approved_at,
        rb.cancel_policy_code,
        v.age_requirement
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles v ON rb.vehicle_id = v.id
      WHERE rb.booking_number = ?
      LIMIT 1
    `, [bookingNumber]);

    if (rentals.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const rental = rentals[0];

    // 5. 권한 확인
    if (decoded) {
      const isOwner = decoded.userId === rental.user_id;
      const isAdmin = decoded.role === 'admin';
      const isVendor = decoded.role === 'vendor' && decoded.vendorId === rental.vendor_id;

      if (!isOwner && !isAdmin && !isVendor) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to cancel this booking'
        });
      }
    }

    // 6. 상태 검증
    if (rental.status === 'canceled') {
      return res.status(400).json({
        success: false,
        error: 'Booking already canceled',
        canceled_at: rental.cancelled_at
      });
    }

    // 픽업 후 취소 금지
    if (rental.status === 'picked_up' || rental.status === 'returned' || rental.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel after pickup',
        current_status: rental.status,
        message: 'Rentals in progress or completed cannot be canceled. Please contact support for refund requests.'
      });
    }

    // 7. 취소 정책 조회
    let policyCode = rental.cancel_policy_code || 'moderate';

    const policies = await db.query(`
      SELECT rules_json, no_show_penalty_rate
      FROM cancellation_policies
      WHERE category = ?
      LIMIT 1
    `, [policyCode]);

    let policyRules = [];
    let noShowPenaltyRate = 100;

    if (policies.length > 0) {
      try {
        policyRules = JSON.parse(policies[0].rules_json);
        noShowPenaltyRate = policies[0].no_show_penalty_rate;
      } catch (parseError) {
        console.warn('⚠️  Failed to parse policy rules, using default');
      }
    }

    // 8. 환불율 계산
    const now = new Date();
    const pickupAt = new Date(rental.pickup_at_utc);
    const hoursUntilPickup = (pickupAt - now) / 3600000;

    let refundRate = 0;

    // 정책 규칙 순회
    for (const rule of policyRules) {
      if (hoursUntilPickup >= rule.hours_before_pickup) {
        refundRate = rule.refund_rate;
        break;
      }
    }

    console.log(`   📜 Policy: ${policyCode}, Hours until pickup: ${hoursUntilPickup.toFixed(1)}h, Refund rate: ${refundRate}%`);

    // 환불 금액
    const refundAmount = Math.floor(rental.total_price_krw * (refundRate / 100));
    const cancellationFee = rental.total_price_krw - refundAmount;

    console.log(`   💰 Total: ${rental.total_price_krw}, Refund: ${refundAmount}, Fee: ${cancellationFee}`);

    // 9. Toss Payments 취소 API 호출 (결제된 경우만)
    let tossResponse = null;

    if (rental.payment_status === 'captured' && rental.payment_key) {
      console.log(`   🔐 Calling Toss Payments cancel API...`);

      const cancelUrl = `${TOSS_CANCEL_URL}/${rental.payment_key}/cancel`;

      try {
        const response = await fetch(cancelUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cancelReason: cancel_reason || '고객 요청',
            cancelAmount: refundAmount,
            refundReceiveAccount: null // 부분 취소 시 계좌 정보 필요할 수 있음
          })
        });

        tossResponse = await response.json();

        if (!response.ok) {
          console.error(`❌ Toss cancel failed:`, tossResponse);

          return res.status(400).json({
            success: false,
            error: 'Payment cancellation failed',
            toss_error: tossResponse,
            message: 'Failed to process refund through payment gateway'
          });
        }

        console.log(`   ✅ Toss cancel successful: refund ${refundAmount}`);

      } catch (tossError) {
        console.error('❌ Toss API call failed:', tossError);

        return res.status(500).json({
          success: false,
          error: 'Payment gateway error',
          message: 'Failed to connect to payment gateway'
        });
      }
    }

    // 10. 트랜잭션 - DB 업데이트
    try {
      // 10-1. rentcar_bookings 상태 업데이트
      await db.execute(`
        UPDATE rentcar_bookings
        SET
          status = 'canceled',
          payment_status = ?,
          cancelled_at = NOW(),
          cancellation_reason = ?,
          refund_amount_krw = ?,
          refund_rate_pct = ?,
          cancellation_fee_krw = ?,
          refunded_at = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        refundAmount === rental.total_price_krw ? 'refunded' : (refundAmount > 0 ? 'partially_refunded' : 'captured'),
        cancel_reason || '고객 취소',
        refundAmount,
        refundRate,
        cancellationFee,
        refundAmount > 0 ? new Date() : null,
        rental.id
      ]);

      // 10-2. rental_payments에 환불 기록
      if (refundAmount > 0 && rental.payment_key) {
        await db.execute(`
          INSERT INTO rentcar_rental_payments (
            rental_id,
            payment_type,
            payment_key,
            method,
            amount_krw,
            status,
            approved_at,
            cancel_reason,
            provider_response,
            created_at
          ) VALUES (?, 'refund', ?, ?, ?, 'approved', NOW(), ?, ?, NOW())
        `, [
          rental.id,
          rental.payment_key,
          'refund',
          -refundAmount, // 음수로 기록
          cancel_reason || '고객 취소',
          JSON.stringify(tossResponse)
        ]);
      }

      // 10-3. 상태 전이 로그
      await db.execute(`
        INSERT INTO rentcar_state_transitions (
          rental_id, from_status, to_status, transition_reason, transitioned_by
        ) VALUES (?, ?, 'canceled', ?, ?)
      `, [
        rental.id,
        rental.status,
        cancel_reason || '고객 취소',
        decoded?.email || 'customer'
      ]);

      // 10-4. 이벤트 로그
      try {
        await db.execute(`
          INSERT INTO rentcar_rental_events (
            event_id,
            rental_id,
            event_type,
            payment_key,
            payload,
            processed_at
          ) VALUES (?, ?, 'rental.canceled', ?, ?, NOW())
        `, [
          `cancel_${rental.id}_${Date.now()}`,
          rental.id,
          rental.payment_key,
          JSON.stringify({
            refund_rate: refundRate,
            refund_amount: refundAmount,
            cancellation_fee: cancellationFee,
            cancel_reason: cancel_reason
          })
        ]);
      } catch (eventError) {
        console.warn('⚠️  Event log failed (non-critical)');
      }

    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);

      return res.status(500).json({
        success: false,
        error: 'Cancellation processed but database update failed',
        message: 'Please contact support'
      });
    }

    console.log(`✅ [Cancel-Rental] Rental ${bookingNumber} canceled successfully`);

    // 11. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        rental_id: rental.id,
        booking_number: rental.booking_number,
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancellation: {
          policy_code: policyCode,
          refund_rate_pct: refundRate,
          hours_before_pickup: hoursUntilPickup.toFixed(1),
          total_amount: rental.total_price_krw,
          refund_amount: refundAmount,
          cancellation_fee: cancellationFee,
          refund_status: refundAmount === rental.total_price_krw ? 'full_refund' :
                         (refundAmount > 0 ? 'partial_refund' : 'no_refund')
        }
      },
      message: `Booking canceled. Refund amount: ${refundAmount.toLocaleString()}원 (${refundRate}%)`
    });

  } catch (error) {
    console.error('❌ [Cancel-Rental] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
