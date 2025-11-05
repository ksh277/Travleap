/**
 * 관리자 전용 예약 환불 API
 *
 * POST /api/admin/refund-booking
 *
 * 기능:
 * - booking_id로 payment_key 조회
 * - Toss Payments 환불 API 호출
 * - 관리자는 환불 정책 무시하고 전액 환불 가능
 */

const { connect } = require('@planetscale/database');
const { refundPayment } = require('../payments/refund');
const { withAuth } = require('../../utils/auth-middleware');
const { withSecureCors } = require('../../utils/cors-middleware');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware');

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
    const { bookingId, orderId, cancelReason } = req.body;

    console.log(`📥 [Admin Refund] 요청 받음:`, {
      bookingId,
      orderId,
      cancelReason,
      body: req.body
    });

    if ((!bookingId && !orderId) || !cancelReason) {
      console.error(`❌ [Admin Refund] 필수 파라미터 누락:`, {
        hasBookingId: !!bookingId,
        hasOrderId: !!orderId,
        hasCancelReason: !!cancelReason
      });
      return res.status(400).json({
        success: false,
        message: 'bookingId 또는 orderId와 cancelReason은 필수입니다.'
      });
    }

    console.log(`💼 [Admin Refund] 환불 요청: booking_id=${bookingId}, order_id=${orderId}, reason=${cancelReason}`);

    // 1. PlanetScale 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 2. booking_id 또는 order_id로 payment, booking, delivery 정보 조회
    let result;

    if (bookingId) {
      // 단일 예약 환불 (기존 로직)
      result = await connection.execute(`
        SELECT
          p.id as payment_id,
          p.payment_key,
          p.amount,
          p.payment_status,
          p.notes,
          b.delivery_status,
          b.category,
          b.order_number
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        WHERE p.booking_id = ?
          AND (p.payment_status = 'paid' OR p.payment_status = 'completed')
        LIMIT 1
      `, [bookingId]);
    } else {
      // 장바구니 주문 환불 (payments.id 사용)
      result = await connection.execute(`
        SELECT
          p.id as payment_id,
          p.payment_key,
          p.amount,
          p.payment_status,
          p.notes,
          NULL as delivery_status,
          NULL as category,
          p.gateway_transaction_id as order_number
        FROM payments p
        WHERE p.id = ?
          AND (p.payment_status = 'paid' OR p.payment_status = 'completed')
        LIMIT 1
      `, [orderId]);
    }

    if (!result.rows || result.rows.length === 0) {
      console.error(`❌ [Admin Refund] 결제 정보 없음: booking_id=${bookingId}, order_id=${orderId}`);
      return res.status(404).json({
        success: false,
        message: '결제 정보를 찾을 수 없습니다. 이미 환불되었거나 결제되지 않은 주문입니다.'
      });
    }

    const { payment_key: paymentKey, amount, notes, delivery_status, category } = result.rows[0];

    console.log(`✅ [Admin Refund] payment_key 조회 완료: ${paymentKey}, amount: ${amount}원, delivery_status: ${delivery_status}, category: ${category}`);

    // 3. notes에서 배송비 및 카테고리 정보 추출
    let deliveryFee = 0;
    let refundAmount = amount; // 기본은 전액 환불
    let hasPopupProduct = false;
    let actualDeliveryStatus = delivery_status;

    if (notes) {
      try {
        const notesData = typeof notes === 'string' ? JSON.parse(notes) : notes;
        deliveryFee = notesData.deliveryFee || 0;

        // 장바구니 주문인 경우 items에서 팝업 상품 확인
        if (notesData.items && Array.isArray(notesData.items)) {
          hasPopupProduct = notesData.items.some(item => item.category === '팝업');
          console.log(`📦 [Admin Refund] 장바구니 주문 분석: 팝업 상품 ${hasPopupProduct ? '있음' : '없음'}`);

          // 장바구니 주문이면 bookings 테이블에서 delivery_status 조회
          if (!bookingId && hasPopupProduct) {
            // 🔧 CRITICAL FIX: 팝업 상품만 필터링해서 배송 상태 확인 (혼합 주문 대응)
            const popupItems = notesData.items.filter(item => item.category === '팝업');
            console.log(`📦 [Admin Refund] 팝업 상품 ${popupItems.length}개 발견`);

            // 모든 팝업 상품의 배송 상태를 확인하여 가장 진행된 상태 사용
            let mostAdvancedStatus = null;
            const statusPriority = { 'pending': 0, 'preparing': 1, 'shipped': 2, 'delivered': 3 };

            for (const popupItem of popupItems) {
              if (popupItem.listingId) {
                const bookingResult = await connection.execute(`
                  SELECT delivery_status FROM bookings
                  WHERE listing_id = ? AND user_id = (SELECT user_id FROM payments WHERE id = ?)
                  ORDER BY created_at DESC
                  LIMIT 1
                `, [popupItem.listingId, result.rows[0].payment_id]);

                if (bookingResult.rows && bookingResult.rows.length > 0) {
                  const status = bookingResult.rows[0].delivery_status;
                  console.log(`📦 [Admin Refund] 팝업 상품 ${popupItem.title || popupItem.listingId} 배송 상태: ${status}`);

                  // 가장 진행된 배송 상태 선택 (shipped > preparing > pending)
                  if (!mostAdvancedStatus || (statusPriority[status] || 0) > (statusPriority[mostAdvancedStatus] || 0)) {
                    mostAdvancedStatus = status;
                  }
                }
              }
            }

            if (mostAdvancedStatus) {
              actualDeliveryStatus = mostAdvancedStatus;
              console.log(`📦 [Admin Refund] 최종 배송 상태 (가장 진행된 상태): ${actualDeliveryStatus}`);
            }
          }
        }
      } catch (e) {
        console.error('❌ [Admin Refund] notes 파싱 실패:', e);
      }
    }

    // 팝업 상품이 있고 배송 상태가 있으면 배송 정책 적용
    const shouldApplyShippingPolicy = (category === '팝업' || hasPopupProduct) && actualDeliveryStatus;

    if (shouldApplyShippingPolicy) {
      const RETURN_FEE = 3000; // 반품비 3,000원

      // 상품 하자/오배송은 전액 환불
      const isDefectOrWrongItem = cancelReason.includes('하자') || cancelReason.includes('오배송');

      if (isDefectOrWrongItem) {
        // 판매자 귀책 → 전액 환불
        refundAmount = amount;
        console.log(`💰 [Admin Refund] 상품 하자/오배송 → 전액 환불: ${refundAmount}원`);
      } else if (actualDeliveryStatus === 'shipped' || actualDeliveryStatus === 'delivered') {
        // 배송 중 or 배송 완료 → 배송비 + 반품비 차감
        const deduction = deliveryFee + RETURN_FEE;
        refundAmount = Math.max(0, amount - deduction);
        console.log(`💰 [Admin Refund] 배송 중/완료 → 배송비(${deliveryFee}원) + 반품비(${RETURN_FEE}원) 차감 = ${refundAmount}원 환불`);
      } else {
        // 배송 전 (pending or null) → 전액 환불
        refundAmount = amount;
        console.log(`💰 [Admin Refund] 배송 전(${actualDeliveryStatus || 'null'}) → 전액 환불: ${refundAmount}원`);
      }
    } else {
      // 팝업이 아닌 경우 전액 환불
      console.log(`💰 [Admin Refund] 비팝업 상품 → 전액 환불: ${refundAmount}원 (category: ${category}, hasPopup: ${hasPopupProduct})`);
    }

    // 4. Toss Payments 환불 API 호출
    console.log(`🔄 [Admin Refund] refundPayment 호출:`, {
      paymentKey,
      cancelReason,
      cancelAmount: refundAmount,
      skipPolicy: true
    });

    const refundResult = await refundPayment({
      paymentKey,
      cancelReason,
      cancelAmount: refundAmount, // 계산된 환불 금액
      skipPolicy: true // 관리자는 정책 무시
    });

    console.log(`📊 [Admin Refund] refundPayment 결과:`, refundResult);

    if (refundResult.success) {
      console.log(`✅ [Admin Refund] 환불 완료: ${refundResult.refundAmount || amount}원`);

      const responseData = {
        success: true,
        message: refundResult.message || '환불이 완료되었습니다.',
        refundAmount: refundResult.refundAmount || amount,
        paymentKey
      };

      // ⚠️ Toss API 실패 경고 추가
      if (refundResult.warning) {
        responseData.warning = refundResult.warning;
      }
      if (refundResult.tossError) {
        responseData.tossError = refundResult.tossError;
      }
      if (!refundResult.tossRefundSuccess) {
        responseData.requiresManualTossRefund = true;
      }

      return res.status(200).json(responseData);
    } else {
      console.error(`❌ [Admin Refund] 환불 실패:`, {
        message: refundResult.message,
        code: refundResult.code,
        fullResult: refundResult
      });

      return res.status(400).json({
        success: false,
        message: refundResult.message || '환불 처리에 실패했습니다.',
        code: refundResult.code
      });
    }

  } catch (error) {
    console.error('❌ [Admin Refund] API error:', error);
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
