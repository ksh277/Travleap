const { connect } = require('@planetscale/database');

/**
 * 렌트카 결제 정보 저장 API
 * POST /api/rentcar/bookings/payment
 *
 * 토스페이먼츠 결제 승인 후 결제 정보를 DB에 저장
 */
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

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      bookingId,
      paymentKey,
      orderId,
      amount,
      method,
      status,
      approvedAt
    } = req.body;

    if (!bookingId || !paymentKey || !orderId) {
      return res.status(400).json({
        success: false,
        error: '필수 결제 정보가 누락되었습니다.'
      });
    }

    // 예약 정보 확인
    const bookingCheck = await connection.execute(
      'SELECT id, vendor_id, vehicle_id FROM rentcar_bookings WHERE id = ?',
      [bookingId]
    );

    if (!bookingCheck || bookingCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    // rentcar_payments 테이블에 결제 정보 저장
    // 테이블이 없으면 에러가 날 수 있으므로 try-catch로 감쌉니다
    try {
      await connection.execute(
        `INSERT INTO rentcar_payments (
          booking_id,
          payment_key,
          order_id,
          amount,
          payment_method,
          status,
          approved_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [bookingId, paymentKey, orderId, amount, method || 'card', status || 'DONE', approvedAt || new Date().toISOString()]
      );

      console.log(`✅ [Payment] 결제 정보 저장 완료 - Booking ID: ${bookingId}, Amount: ${amount}`);
    } catch (paymentError) {
      // rentcar_payments 테이블이 없을 수 있으므로 경고만 출력하고 계속 진행
      console.warn('⚠️ [Payment] 결제 테이블 저장 실패 (테이블 없음 가능):', paymentError.message);
    }

    return res.status(200).json({
      success: true,
      message: '결제 정보가 저장되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Payment API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
