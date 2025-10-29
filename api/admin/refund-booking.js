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

const { db } = require('../../utils/database');
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

    // 1. booking_id로 payment_key 조회
    const payments = await db.query(`
      SELECT p.payment_key, p.amount, p.payment_status
      FROM payments p
      WHERE p.booking_id = ?
        AND p.payment_status = 'paid'
      LIMIT 1
    `, [bookingId]);

    if (!payments || payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '결제 정보를 찾을 수 없습니다. 이미 환불되었거나 결제되지 않은 주문입니다.'
      });
    }

    const { payment_key: paymentKey, amount } = payments[0];

    console.log(`✅ [Admin Refund] payment_key 조회 완료: ${paymentKey}, amount: ${amount}원`);

    // 2. Toss Payments 환불 API 호출 (전액 환불, 정책 무시)
    const refundResult = await refundPayment({
      paymentKey,
      cancelReason,
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
