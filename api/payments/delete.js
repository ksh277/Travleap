/**
 * 결제 내역 삭제 API (사용자 화면에서만 숨김)
 * POST /api/payments/delete
 *
 * 실제 DB에서 삭제하지 않고 hidden_from_user 플래그만 설정
 * 관리자는 계속 볼 수 있음
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { paymentId } = req.body;
    const userId = req.headers['x-user-id'];

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required (x-user-id header)'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 결제 정보 조회 (본인 확인)
    const paymentResult = await connection.execute(
      `SELECT id, user_id, payment_status FROM payments WHERE id = ?`,
      [parseInt(paymentId)]
    );

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '결제 내역을 찾을 수 없습니다.'
      });
    }

    const payment = paymentResult.rows[0];

    // 2. 본인 확인
    if (payment.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: '본인의 결제 내역만 삭제할 수 있습니다.'
      });
    }

    // 3. 결제 완료 또는 환불 완료된 내역은 삭제 불가
    if (payment.payment_status === 'paid' || payment.payment_status === 'completed' || payment.payment_status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: '결제 완료 또는 환불 완료된 내역은 삭제할 수 없습니다.'
      });
    }

    // 4. hidden_from_user 플래그 설정
    await connection.execute(
      `UPDATE payments SET hidden_from_user = 1 WHERE id = ?`,
      [parseInt(paymentId)]
    );

    console.log(`✅ [결제 삭제] Payment ID ${paymentId} hidden from user ${userId}`);

    return res.status(200).json({
      success: true,
      message: '결제 내역이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ [결제 삭제] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '결제 내역 삭제에 실패했습니다.'
    });
  }
};
