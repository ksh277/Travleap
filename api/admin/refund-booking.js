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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { bookingId, cancelReason } = req.body;

    if (!bookingId || !cancelReason) {
      return res.status(400).json({
        success: false,
        message: 'bookingId와 cancelReason은 필수입니다.'
      });
    }

    console.log(`💼 [Admin Refund] 환불 요청: booking_id=${bookingId}, reason=${cancelReason}`);

    // 1. PlanetScale 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 2. booking_id로 payment, booking, delivery 정보 조회
    const result = await connection.execute(`
      SELECT
        p.payment_key,
        p.amount,
        p.payment_status,
        p.notes,
        b.delivery_status,
        b.category
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.booking_id = ?
        AND (p.payment_status = 'paid' OR p.payment_status = 'completed')
      LIMIT 1
    `, [bookingId]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '결제 정보를 찾을 수 없습니다. 이미 환불되었거나 결제되지 않은 주문입니다.'
      });
    }

    const { payment_key: paymentKey, amount, notes, delivery_status, category } = result.rows[0];

    console.log(`✅ [Admin Refund] payment_key 조회 완료: ${paymentKey}, amount: ${amount}원, delivery_status: ${delivery_status}`);

    // 3. 배송비 추출 및 환불 금액 계산
    let deliveryFee = 0;
    let refundAmount = amount; // 기본은 전액 환불

    if (notes) {
      try {
        const notesData = typeof notes === 'string' ? JSON.parse(notes) : notes;
        deliveryFee = notesData.deliveryFee || 0;
      } catch (e) {
        console.error('notes 파싱 실패:', e);
      }
    }

    // 팝업 카테고리만 배송 상태 체크
    if (category === '팝업' && delivery_status) {
      const RETURN_FEE = 3000; // 반품비 3,000원

      // 상품 하자/오배송은 전액 환불
      const isDefectOrWrongItem = cancelReason.includes('하자') || cancelReason.includes('오배송');

      if (isDefectOrWrongItem) {
        // 판매자 귀책 → 전액 환불
        refundAmount = amount;
        console.log(`💰 [Admin Refund] 상품 하자/오배송 → 전액 환불: ${refundAmount}원`);
      } else if (delivery_status === 'shipped' || delivery_status === 'delivered') {
        // 배송 중 or 배송 완료 → 배송비 + 반품비 차감
        const deduction = deliveryFee + RETURN_FEE;
        refundAmount = Math.max(0, amount - deduction);
        console.log(`💰 [Admin Refund] 배송 중/완료 → 배송비(${deliveryFee}원) + 반품비(${RETURN_FEE}원) 차감 = ${refundAmount}원 환불`);
      } else {
        // 배송 전 (pending or null) → 전액 환불
        refundAmount = amount;
        console.log(`💰 [Admin Refund] 배송 전 → 전액 환불: ${refundAmount}원`);
      }
    } else {
      // 팝업이 아닌 경우 전액 환불
      console.log(`💰 [Admin Refund] 비팝업 카테고리 → 전액 환불: ${refundAmount}원`);
    }

    // 4. Toss Payments 환불 API 호출
    const refundResult = await refundPayment({
      paymentKey,
      cancelReason,
      cancelAmount: refundAmount, // 계산된 환불 금액
      skipPolicy: true // 관리자는 정책 무시
    });

    if (refundResult.success) {
      console.log(`✅ [Admin Refund] 환불 완료: ${refundResult.refundAmount || amount}원`);

      return res.status(200).json({
        success: true,
        message: '환불이 완료되었습니다.',
        refundAmount: refundResult.refundAmount || amount,
        paymentKey
      });
    } else {
      console.error(`❌ [Admin Refund] 환불 실패:`, refundResult.message);

      return res.status(400).json({
        success: false,
        message: refundResult.message || '환불 처리에 실패했습니다.'
      });
    }

  } catch (error) {
    console.error('❌ [Admin Refund] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '환불 처리 중 오류가 발생했습니다.'
    });
  }
};
