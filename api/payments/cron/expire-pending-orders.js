/**
 * 결제 대기 주문 만료 처리 크론잡
 *
 * 실행 주기: 매 5분
 *
 * 기능:
 * - payments 테이블에서 payment_status='pending'이고 created_at이 10분 이상 경과한 주문을 자동 만료
 * - 재고 복구 (옵션 및 상품)
 * - 포인트 환불
 * - 예약 취소
 * - 주문 상태를 failed로 변경
 *
 * 사용 시나리오:
 * - 사용자가 장바구니에서 결제하기 클릭 후 Toss 결제 페이지로 가지 않고 탭을 닫음
 * - 결제 페이지에서 10분 이상 방치
 */

const { db } = require('../../../utils/database');

/**
 * 만료 시간 (밀리초)
 * 10분 = 600,000ms
 */
const EXPIRY_TIME_MS = 10 * 60 * 1000;

async function expirePendingOrders() {
  console.log('🕐 [Expire Orders] Starting expire-pending-orders job...');
  console.log(`⏰ [Expire Orders] Current time: ${new Date().toISOString()}`);

  try {
    // 1. 10분 이상 pending 상태인 주문 조회
    const expiredOrders = await db.query(`
      SELECT
        id,
        user_id,
        gateway_transaction_id,
        amount,
        notes,
        created_at
      FROM payments
      WHERE payment_status = 'pending'
        AND gateway_transaction_id LIKE 'ORDER_%'
        AND created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      ORDER BY created_at ASC
    `);

    if (expiredOrders.length === 0) {
      console.log('✅ [Expire Orders] No expired pending orders to process.');
      return { success: true, expired: 0 };
    }

    console.log(`📋 [Expire Orders] Found ${expiredOrders.length} expired pending order(s).`);

    // 2. 각 주문 만료 처리
    let expiredCount = 0;
    const errors = [];

    for (const payment of expiredOrders) {
      const orderId = payment.gateway_transaction_id;

      try {
        console.log(`🔄 [Expire Orders] Processing order: ${orderId}`);

        // 2-1. 해당 주문의 모든 bookings 조회 (재고 복구용)
        const bookings = await db.query(`
          SELECT id, listing_id, guests, selected_option_id, product_name, option_name
          FROM bookings
          WHERE order_number = ? AND status != 'cancelled'
        `, [orderId]);

        console.log(`   📦 Found ${bookings.length} booking(s) for order ${orderId}`);

        // 2-2. 각 booking에 대해 재고 복구
        for (const booking of bookings) {
          try {
            const quantity = booking.guests || 1;

            // 옵션 재고 복구
            if (booking.selected_option_id) {
              const optionResult = await db.execute(`
                UPDATE product_options
                SET stock = stock + ?
                WHERE id = ? AND stock IS NOT NULL
              `, [quantity, booking.selected_option_id]);

              if (optionResult.affectedRows > 0) {
                console.log(`   ✅ [Stock Restore] Option stock restored: option_id=${booking.selected_option_id}, +${quantity}`);
              }
            }

            // 상품 재고 복구
            if (booking.listing_id) {
              const listingResult = await db.execute(`
                UPDATE listings
                SET stock = stock + ?
                WHERE id = ? AND stock IS NOT NULL
              `, [quantity, booking.listing_id]);

              if (listingResult.affectedRows > 0) {
                console.log(`   ✅ [Stock Restore] Listing stock restored: listing_id=${booking.listing_id}, +${quantity}`);
              }
            }
          } catch (stockError) {
            console.error(`   ❌ [Stock Restore] Failed for booking_id=${booking.id}:`, stockError.message);
            // 재고 복구 실패해도 계속 진행
          }
        }

        // 2-3. bookings 상태 변경 (cancelled)
        await db.execute(`
          UPDATE bookings
          SET status = 'cancelled',
              payment_status = 'failed',
              cancellation_reason = 'SYSTEM: 결제 시간 만료 (10분)',
              updated_at = NOW()
          WHERE order_number = ?
        `, [orderId]);

        console.log(`   ✅ [Bookings] ${bookings.length} booking(s) cancelled`);

        // 2-4. 포인트 환불 (사용된 포인트가 있는 경우)
        try {
          const notes = payment.notes ? JSON.parse(payment.notes) : null;
          const pointsUsed = notes?.pointsUsed || 0;

          if (pointsUsed > 0 && payment.user_id) {
            const { refundPoints } = require('../../../utils/points-system.js');

            const pointsRefundResult = await refundPoints(
              payment.user_id,
              pointsUsed,
              `결제 시간 만료로 인한 포인트 환불 (주문번호: ${orderId})`,
              orderId
            );

            if (pointsRefundResult.success) {
              console.log(`   ✅ [Points] ${pointsUsed}P refunded to user_id=${payment.user_id}`);
            } else {
              console.error(`   ❌ [Points] Refund failed:`, pointsRefundResult.message);
            }
          }
        } catch (pointsError) {
          console.error(`   ❌ [Points] Error during refund:`, pointsError.message);
          // 포인트 환불 실패해도 계속 진행
        }

        // 2-5. 주문 상태를 failed로 변경
        await db.execute(`
          UPDATE payments
          SET payment_status = 'failed',
              updated_at = NOW()
          WHERE id = ?
        `, [payment.id]);

        console.log(`   ✅ [Payment] Order marked as failed: ${orderId}`);

        expiredCount++;

        // 경과 시간 계산
        const elapsedMinutes = Math.floor((Date.now() - new Date(payment.created_at).getTime()) / 60000);
        console.log(`✅ [Expire Orders] Successfully expired order ${orderId} (${elapsedMinutes} minutes old)`);

      } catch (error) {
        console.error(`❌ [Expire Orders] Failed to expire order ${orderId}:`, error.message);
        errors.push({
          order_id: orderId,
          error: error.message
        });
      }
    }

    // 3. 결과 로그
    console.log(`
╔═══════════════════════════════════════════╗
║   Expire Pending Orders Job Complete      ║
╠═══════════════════════════════════════════╣
║  Total Expired: ${expiredOrders.length.toString().padEnd(27)}║
║  Processed:     ${expiredCount.toString().padEnd(27)}║
║  Failed:        ${errors.length.toString().padEnd(27)}║
╚═══════════════════════════════════════════╝
    `);

    if (errors.length > 0) {
      console.error('❌ [Expire Orders] Errors:', errors);
    }

    return {
      success: true,
      expired: expiredCount,
      failed: errors.length,
      errors
    };

  } catch (error) {
    console.error('❌ [Expire Orders] Critical error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI에서 직접 실행 시
if (require.main === module) {
  (async () => {
    console.log('🚀 [Expire Orders] Starting standalone execution...');
    const result = await expirePendingOrders();
    console.log('🏁 [Expire Orders] Job finished:', result);
    process.exit(result.success ? 0 : 1);
  })();
}

module.exports = { expirePendingOrders };
