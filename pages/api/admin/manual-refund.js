/**
 * 수동 환불 처리 API
 * POST /api/admin/manual-refund
 *
 * 토스 페이먼츠에서 직접 환불한 주문을 시스템에 반영
 *
 * ⚠️ 중요: 이 API는 토스에서 이미 환불한 주문의 상태를 시스템에 동기화합니다.
 * 포인트 회수/환불 및 재고 복구도 자동으로 처리됩니다.
 */

const { connect } = require('@planetscale/database');

/**
 * 재고 복구 처리 (refund.js에서 복사)
 */
async function restoreStock(connection, bookingId) {
  try {
    console.log(`📦 [재고 복구] booking_id=${bookingId} 재고 복구 시작`);

    const bookingResult = await connection.execute(`
      SELECT listing_id, selected_option_id, guests
      FROM bookings
      WHERE id = ?
    `, [bookingId]);

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      console.warn(`⚠️ [재고 복구] booking을 찾을 수 없음: ${bookingId}`);
      return;
    }

    const booking = bookingResult.rows[0];
    const quantity = booking.guests || 1;

    // 옵션 재고 복구
    if (booking.selected_option_id) {
      const optionResult = await connection.execute(`
        UPDATE product_options
        SET stock = stock + ?
        WHERE id = ? AND stock IS NOT NULL
      `, [quantity, booking.selected_option_id]);

      if (optionResult.rowsAffected > 0) {
        console.log(`✅ [재고 복구] 옵션 재고 복구 완료: option_id=${booking.selected_option_id}, +${quantity}개`);
      }
    }

    // 상품 재고 복구
    if (booking.listing_id) {
      const listingResult = await connection.execute(`
        UPDATE listings
        SET stock = stock + ?
        WHERE id = ? AND stock IS NOT NULL AND stock_enabled = 1
      `, [quantity, booking.listing_id]);

      if (listingResult.rowsAffected > 0) {
        console.log(`✅ [재고 복구] 상품 재고 복구 완료: listing_id=${booking.listing_id}, +${quantity}개`);
      }
    }
  } catch (error) {
    console.error(`❌ [재고 복구] 실패 (booking_id=${bookingId}):`, error);
  }
}

/**
 * 적립 포인트 회수 처리 (Dual DB)
 */
async function deductEarnedPoints(connection, userId, orderNumber) {
  try {
    console.log(`💰 [포인트 회수] user_id=${userId}, order_number=${orderNumber}`);

    const earnedPointsResult = await connection.execute(`
      SELECT points, id, related_order_id
      FROM user_points
      WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
      ORDER BY created_at DESC
    `, [userId, orderNumber]);

    if (!earnedPointsResult.rows || earnedPointsResult.rows.length === 0) {
      console.log(`ℹ️ [포인트 회수] 적립된 포인트가 없음`);
      return 0;
    }

    const pointsToDeduct = earnedPointsResult.rows.reduce((sum, row) => sum + (row.points || 0), 0);
    console.log(`💰 [포인트 회수] 총 ${pointsToDeduct}P 회수 예정`);

    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
      await poolNeon.query('BEGIN');

      const userResult = await poolNeon.query(`
        SELECT total_points FROM users WHERE id = $1 FOR UPDATE
      `, [userId]);

      if (!userResult.rows || userResult.rows.length === 0) {
        console.error(`❌ [포인트 회수] 사용자를 찾을 수 없음`);
        return 0;
      }

      const currentPoints = userResult.rows[0].total_points || 0;
      const newBalance = currentPoints - pointsToDeduct;  // 🔧 FIX: Math.max 제거 - 음수 허용

      // 🔒 음수 잔액 경고 (데이터 무결성 유지)
      if (newBalance < 0) {
        console.warn(`⚠️ [포인트 회수] 음수 잔액 발생: ${currentPoints}P → ${newBalance}P`);
        console.warn(`   회수 대상: ${pointsToDeduct}P, 부족: ${Math.abs(newBalance)}P`);
        console.warn(`   사용자는 ${Math.abs(newBalance)}P 빚 상태 (다음 적립 시 자동 상쇄)`);
      }

      await poolNeon.query(`UPDATE users SET total_points = $1 WHERE id = $2`, [newBalance, userId]);

      await connection.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
        VALUES (?, ?, 'refund', ?, ?, ?, NOW())
      `, [userId, -pointsToDeduct, `환불로 인한 포인트 회수 (${orderNumber})`, orderNumber, newBalance]);

      await poolNeon.query('COMMIT');

      if (newBalance < 0) {
        console.log(`✅ [포인트 회수] ${pointsToDeduct}P 회수 완료 (음수 잔액: ${newBalance}P - 정상 처리됨)`);
      } else {
        console.log(`✅ [포인트 회수] ${pointsToDeduct}P 회수 완료 (잔액: ${newBalance}P)`);
      }
      return pointsToDeduct;

    } catch (error) {
      await poolNeon.query('ROLLBACK');
      throw error;
    } finally {
      await poolNeon.end();
    }
  } catch (error) {
    console.error(`❌ [포인트 회수] 실패:`, error);
    return 0;
  }
}

/**
 * 사용된 포인트 환불 처리 (Dual DB)
 */
async function refundUsedPoints(connection, userId, pointsUsed, orderNumber) {
  try {
    if (pointsUsed <= 0) return false;

    console.log(`💰 [포인트 환불] user_id=${userId}, points=${pointsUsed}P`);

    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
      await poolNeon.query('BEGIN');

      const userResult = await poolNeon.query(`
        SELECT total_points FROM users WHERE id = $1 FOR UPDATE
      `, [userId]);

      if (!userResult.rows || userResult.rows.length === 0) {
        console.error(`❌ [포인트 환불] 사용자를 찾을 수 없음`);
        return false;
      }

      const currentPoints = userResult.rows[0].total_points || 0;
      const newBalance = currentPoints + pointsUsed;

      await poolNeon.query(`UPDATE users SET total_points = $1 WHERE id = $2`, [newBalance, userId]);

      await connection.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
        VALUES (?, ?, 'refund', ?, ?, ?, NOW())
      `, [userId, pointsUsed, `주문 취소로 인한 포인트 환불 (${orderNumber})`, orderNumber, newBalance]);

      await poolNeon.query('COMMIT');

      console.log(`✅ [포인트 환불] ${pointsUsed}P 환불 완료`);
      return true;

    } catch (error) {
      await poolNeon.query('ROLLBACK');
      throw error;
    } finally {
      await poolNeon.end();
    }
  } catch (error) {
    console.error(`❌ [포인트 환불] 실패:`, error);
    return false;
  }
}

const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: '주문번호가 필요합니다.'
      });
    }

    console.log(`🔍 [Manual Refund] 주문 조회: ${orderNumber}`);

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 주문 정보 조회
    const paymentResult = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.booking_id,
        p.order_id,
        p.amount,
        p.payment_status,
        p.payment_key,
        p.gateway_transaction_id
      FROM payments p
      WHERE p.gateway_transaction_id = ?
      LIMIT 1
    `, [orderNumber]);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      console.error(`❌ 주문을 찾을 수 없습니다: ${orderNumber}`);
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    const payment = paymentResult.rows[0];

    console.log(`💳 [Payment] ID: ${payment.id}, Status: ${payment.payment_status}, Amount: ${payment.amount}`);

    // 이미 환불된 경우
    if (payment.payment_status === 'refunded') {
      console.log('⚠️  이미 환불된 주문입니다.');
      return res.status(400).json({
        success: false,
        message: '이미 환불된 주문입니다.'
      });
    }

    // 2. payments 테이블 업데이트
    console.log('💳 [Payments] 환불 상태로 업데이트 중...');
    await connection.execute(`
      UPDATE payments
      SET payment_status = 'refunded',
          refund_amount = ?,
          refund_reason = '토스 페이먼츠 직접 환불',
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [payment.amount, payment.id]);

    console.log('✅ payments 테이블 업데이트 완료');

    // 3. bookings 테이블 업데이트 및 재고 복구
    let affectedBookings = 0;
    let bookingsToRefund = [];

    if (!payment.booking_id && orderNumber.startsWith('ORDER_')) {
      // 장바구니 주문
      console.log('📦 [Bookings] 장바구니 주문 업데이트 중...');

      // 먼저 bookings 조회
      const bookingsResult = await connection.execute(`
        SELECT id FROM bookings WHERE order_number = ? AND status != 'cancelled'
      `, [orderNumber]);

      bookingsToRefund = bookingsResult.rows || [];

      const updateResult = await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = '토스 페이먼츠 직접 환불',
            updated_at = NOW()
        WHERE order_number = ?
      `, [orderNumber]);

      affectedBookings = updateResult.rowsAffected || 0;
      console.log(`✅ bookings 업데이트 완료 (${affectedBookings}개)`);

    } else if (payment.booking_id) {
      // 단일 예약
      console.log('📦 [Bookings] 단일 예약 업데이트 중...');

      bookingsToRefund = [{ id: payment.booking_id }];

      await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = '토스 페이먼츠 직접 환불',
            updated_at = NOW()
        WHERE id = ?
      `, [payment.booking_id]);

      affectedBookings = 1;
      console.log('✅ bookings 업데이트 완료');
    }

    // 4. ✅ 재고 복구 처리
    console.log('📦 [재고] 재고 복구 시작...');
    for (const booking of bookingsToRefund) {
      await restoreStock(connection, booking.id);
    }
    console.log(`✅ [재고] ${bookingsToRefund.length}개 예약 재고 복구 완료`);

    // 5. ✅ 포인트 처리 (적립 포인트 회수 + 사용 포인트 환불)
    if (payment.user_id) {
      console.log('💰 [포인트] 포인트 처리 시작...');

      // 5-1. 적립 포인트 회수
      const deductedPoints = await deductEarnedPoints(connection, payment.user_id, orderNumber);

      // 5-2. 사용 포인트 환불 (notes에서 추출)
      const paymentWithNotes = await connection.execute(`
        SELECT notes FROM payments WHERE id = ?
      `, [payment.id]);

      if (paymentWithNotes.rows && paymentWithNotes.rows.length > 0 && paymentWithNotes.rows[0].notes) {
        try {
          const notes = typeof paymentWithNotes.rows[0].notes === 'string'
            ? JSON.parse(paymentWithNotes.rows[0].notes)
            : paymentWithNotes.rows[0].notes;

          const pointsUsed = notes.pointsUsed || 0;

          if (pointsUsed > 0) {
            await refundUsedPoints(connection, payment.user_id, pointsUsed, orderNumber);
            console.log(`✅ [포인트] 사용 포인트 ${pointsUsed}P 환불 완료`);
          }
        } catch (notesError) {
          console.error('⚠️ [포인트] notes 파싱 실패:', notesError);
        }
      }

      console.log(`✅ [포인트] 포인트 처리 완료 (회수: ${deductedPoints}P)`);
    }

    console.log(`✨ [완료] 환불 상태 반영 완료: ${orderNumber}, ${payment.amount}원`);

    return res.status(200).json({
      success: true,
      message: '환불 상태가 반영되었습니다.',
      data: {
        orderNumber,
        paymentId: payment.id,
        refundAmount: payment.amount,
        affectedBookings
      }
    });

  } catch (error) {
    console.error('❌ [Manual Refund] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '환불 처리 중 오류가 발생했습니다.'
    });
  }
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);
