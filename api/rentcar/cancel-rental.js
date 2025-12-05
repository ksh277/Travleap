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

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');

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
        rb.vehicle_id,
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

    // 7. 벤더별 취소 정책 조회 (우선 적용)
    const now = new Date();
    const pickupAt = new Date(rental.pickup_at_utc);
    const hoursUntilPickup = (pickupAt - now) / 3600000;

    let refundRate = 0;
    let policySource = 'global'; // 'vendor' or 'global'

    // 7-1. 먼저 벤더의 cancellation_rules 확인
    const vendorPolicies = await db.query(`
      SELECT cancellation_rules
      FROM rentcar_vendors
      WHERE id = ?
      LIMIT 1
    `, [rental.vendor_id]);

    if (vendorPolicies.length > 0 && vendorPolicies[0].cancellation_rules) {
      try {
        const rules = typeof vendorPolicies[0].cancellation_rules === 'string'
          ? JSON.parse(vendorPolicies[0].cancellation_rules)
          : vendorPolicies[0].cancellation_rules;

        // 시간 기준으로 환불율 결정
        if (hoursUntilPickup >= 72) { // 3일 = 72시간 이상
          refundRate = rules['3_days_before'] || 100;
        } else if (hoursUntilPickup >= 48) { // 2-3일 (48-72시간)
          refundRate = rules['2_days_before'] || 80;
        } else if (hoursUntilPickup >= 24) { // 1-2일 (24-48시간)
          refundRate = rules['1_day_before'] || 50;
        } else { // 24시간 이내
          refundRate = rules['same_day'] || 0;
        }

        policySource = 'vendor';
        console.log(`   📋 Using vendor-specific cancellation policy`);
      } catch (parseError) {
        console.warn('⚠️  Failed to parse vendor cancellation_rules, falling back to global policy');
      }
    }

    // 7-2. 벤더 정책이 없으면 전역 정책 사용
    if (policySource === 'global') {
      let policyCode = rental.cancel_policy_code || 'moderate';

      const policies = await db.query(`
        SELECT rules_json, no_show_penalty_rate
        FROM cancellation_policies
        WHERE category = ?
        LIMIT 1
      `, [policyCode]);

      let policyRules = [];

      if (policies.length > 0) {
        try {
          policyRules = JSON.parse(policies[0].rules_json);
        } catch (parseError) {
          console.warn('⚠️  Failed to parse policy rules, using default');
        }
      }

      // 정책 규칙 순회
      for (const rule of policyRules) {
        if (hoursUntilPickup >= rule.hours_before_pickup) {
          refundRate = rule.refund_rate;
          break;
        }
      }

      console.log(`   📋 Using global cancellation policy: ${policyCode}`);
    }

    console.log(`   📜 Hours until pickup: ${hoursUntilPickup.toFixed(1)}h, Refund rate: ${refundRate}%, Source: ${policySource}`);

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

      // 10-4. 🔒 CRITICAL: 렌트카 환불 시 포인트 회수 (Neon PostgreSQL 단일화)
      if (rental.user_id && refundAmount < rental.total_price_krw) {
        // 전액 환불이 아닐 때만 포인트 회수 (부분 환불/취소 수수료 발생 시)
        // 전액 환불이면 아래 10-5에서 적립 포인트 회수
        try {
          const { Pool } = require('@neondatabase/serverless');
          const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

          try {
            console.log(`💰 [포인트 회수] 렌트카 부분 환불 포인트 처리 시작 (rental_id: ${rental.id}, user_id: ${rental.user_id})`);

            await poolNeon.query('BEGIN');

            // 적립된 포인트 찾기 (rental.id로) - Neon PostgreSQL
            const earnedPointsResult = await poolNeon.query(`
              SELECT points, id, related_order_id
              FROM user_points
              WHERE user_id = $1 AND related_order_id = $2 AND point_type = 'earn' AND points > 0
              ORDER BY created_at DESC
            `, [rental.user_id, String(rental.id)]);

            if (earnedPointsResult.rows && earnedPointsResult.rows.length > 0) {
              const earnedPoints = earnedPointsResult.rows[0].points;

              // 환불율에 따라 포인트 회수 (부분 회수)
              const pointsToDeduct = Math.floor(earnedPoints * (cancellationFee / rental.total_price_krw));

              if (pointsToDeduct > 0) {
                // Neon에서 현재 포인트 조회
                const userResult = await poolNeon.query(
                  'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
                  [rental.user_id]
                );

                const currentPoints = userResult.rows?.[0]?.total_points || 0;
                const newBalance = Math.max(0, currentPoints - pointsToDeduct);

                // 포인트 회수 기록 (Neon PostgreSQL)
                await poolNeon.query(`
                  INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
                  VALUES ($1, $2, 'refund', $3, $4, $5, NOW())
                `, [
                  rental.user_id,
                  -pointsToDeduct,
                  `렌트카 환불로 인한 포인트 회수 (booking: ${rental.booking_number}, 환불율: ${refundRate}%)`,
                  String(rental.id),
                  newBalance
                ]);

                // users 테이블 업데이트
                await poolNeon.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, rental.user_id]);

                console.log(`✅ [포인트 회수] ${pointsToDeduct}P 회수 완료 (잔액: ${newBalance}P)`);
              }
            }

            await poolNeon.query('COMMIT');
          } catch (pointsError) {
            console.error('❌ [포인트 회수] 실패 (계속 진행):', pointsError);
            try { await poolNeon.query('ROLLBACK'); } catch (e) {}
          } finally {
            await poolNeon.end();
          }
        } catch (outerError) {
          console.error('❌ [포인트 회수] 외부 오류 (계속 진행):', outerError);
        }
      }

      // 10-5. 🔒 CRITICAL: 전액 환불 시 적립 포인트 전액 회수 (Neon PostgreSQL 단일화)
      if (rental.user_id && refundAmount === rental.total_price_krw) {
        try {
          const { Pool } = require('@neondatabase/serverless');
          const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

          try {
            console.log(`💰 [포인트 전액 회수] 렌트카 전액 환불 포인트 회수 시작 (rental_id: ${rental.id})`);

            await poolNeon.query('BEGIN');

            // 적립된 포인트 찾기 - Neon PostgreSQL
            const earnedPointsResult = await poolNeon.query(`
              SELECT points, id
              FROM user_points
              WHERE user_id = $1 AND related_order_id = $2 AND point_type = 'earn' AND points > 0
              ORDER BY created_at DESC
            `, [rental.user_id, String(rental.id)]);

            if (earnedPointsResult.rows && earnedPointsResult.rows.length > 0) {
              const earnedPoints = earnedPointsResult.rows[0].points;

              // Neon에서 현재 포인트 조회
              const userResult = await poolNeon.query(
                'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
                [rental.user_id]
              );

              const currentPoints = userResult.rows?.[0]?.total_points || 0;
              const newBalance = Math.max(0, currentPoints - earnedPoints);

              // 전액 회수 (Neon PostgreSQL)
              await poolNeon.query(`
                INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
                VALUES ($1, $2, 'refund', $3, $4, $5, NOW())
              `, [
                rental.user_id,
                -earnedPoints,
                `렌트카 전액 환불로 인한 포인트 회수 (booking: ${rental.booking_number})`,
                String(rental.id),
                newBalance
              ]);

              await poolNeon.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, rental.user_id]);

              console.log(`✅ [포인트 전액 회수] ${earnedPoints}P 회수 완료 (잔액: ${newBalance}P)`);
            } else {
              console.log(`ℹ️  [포인트 전액 회수] 적립 내역 없음`);
            }

            await poolNeon.query('COMMIT');
          } catch (pointsError) {
            console.error('❌ [포인트 전액 회수] 실패 (계속 진행):', pointsError);
            try { await poolNeon.query('ROLLBACK'); } catch (e) {}
          } finally {
            await poolNeon.end();
          }
        } catch (outerError) {
          console.error('❌ [포인트 전액 회수] 외부 오류 (계속 진행):', outerError);
        }
      }

      // 10-6. 이벤트 로그
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

    // 11. extras 정보 조회 (환불 내역에 포함)
    let extrasInfo = [];
    let extrasTotal = 0;

    try {
      const extrasResult = await db.query(`
        SELECT
          rbe.extra_id,
          rbe.quantity,
          rbe.unit_price_krw,
          rbe.total_price_krw,
          re.name as extra_name,
          re.category,
          re.price_type
        FROM rentcar_booking_extras rbe
        LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
        WHERE rbe.booking_id = ?
      `, [rental.id]);

      if (extrasResult && extrasResult.length > 0) {
        extrasInfo = extrasResult.map(e => ({
          name: e.extra_name || '(삭제된 옵션)',
          category: e.category,
          price_type: e.price_type,
          quantity: e.quantity,
          unit_price: Number(e.unit_price_krw || 0),
          total_price: Number(e.total_price_krw || 0)
        }));

        extrasTotal = extrasInfo.reduce((sum, e) => sum + e.total_price, 0);
        console.log(`📦 [Cancel-Rental] ${extrasInfo.length}개 extras 조회 완료 (총액: ${extrasTotal}원)`);
      }
    } catch (extrasError) {
      console.warn('⚠️  [Cancel-Rental] extras 조회 실패 (계속 진행):', extrasError.message);
    }

    console.log(`✅ [Cancel-Rental] Rental ${bookingNumber} canceled successfully`);

    // 12. 재고 복귀 (취소 시 차량 재고 1 증가)
    if (rental.vehicle_id) {
      try {
        console.log(`📦 [재고] 차량 재고 복귀 시작 (vehicle_id: ${rental.vehicle_id})`);

        const { connect } = require('@planetscale/database');
        const connection = connect({ url: process.env.DATABASE_URL });

        await connection.execute(
          'UPDATE rentcar_vehicles SET stock = stock + 1, updated_at = NOW() WHERE id = ?',
          [rental.vehicle_id]
        );

        console.log(`✅ [재고] 차량 재고 복귀 완료 (vehicle_id: ${rental.vehicle_id}, +1)`);
      } catch (stockError) {
        console.error('❌ [재고] 재고 복귀 실패:', stockError);
        // 재고 복귀 실패해도 취소는 이미 완료됨
      }
    }

    // 13. 성공 응답
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
                         (refundAmount > 0 ? 'partial_refund' : 'no_refund'),
          extras: extrasInfo,
          extras_count: extrasInfo.length,
          extras_total: extrasTotal
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
