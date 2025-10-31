const { connect } = require('@planetscale/database');

/**
 * 쿠폰 사용 처리 API (주문 완료 시 호출)
 * POST /api/coupons/use
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
      error: 'METHOD_NOT_ALLOWED',
      message: 'POST 요청만 허용됩니다'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const { code, userId, orderId, paymentId, discountAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CODE',
        message: '쿠폰 코드가 필요합니다'
      });
    }

    console.log(`📝 [Coupons] Using coupon: ${code} for order ${orderId}, discount: ${discountAmount}`);

    // 쿠폰 존재 확인
    const couponCheck = await connection.execute(`
      SELECT id, code FROM coupons
      WHERE code = ? AND is_active = 1
      LIMIT 1
    `, [code.toUpperCase()]);

    if (!couponCheck.rows || couponCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: '쿠폰을 찾을 수 없습니다'
      });
    }

    const coupon = couponCheck.rows[0];

    // ✅ user_coupons 테이블에서 사용 처리
    if (userId) {
      try {
        await connection.execute(`
          UPDATE user_coupons
          SET is_used = TRUE, used_at = NOW(), order_number = ?
          WHERE user_id = ? AND coupon_id = ?
        `, [orderId || paymentId, userId, coupon.id]);

        console.log(`✅ [Coupons] user_coupons 업데이트 완료`);
      } catch (error) {
        console.error('⚠️ [Coupons] Error updating user_coupons:', error);
      }
    }

    // 쿠폰 사용 기록 저장 (coupon_usage 테이블)
    try {
      await connection.execute(`
        INSERT INTO coupon_usage (
          coupon_id, user_id, order_id, payment_id, discount_amount
        ) VALUES (?, ?, ?, ?, ?)
      `, [coupon.id, userId || null, orderId || null, paymentId || null, discountAmount || 0]);

      console.log(`✅ [Coupons] Usage recorded in coupon_usage table`);
    } catch (error) {
      console.error('⚠️ [Coupons] Error recording usage:', error);
      // 에러가 나도 계속 진행
    }

    // 쿠폰 current_usage 증가
    try {
      await connection.execute(`
        UPDATE coupons
        SET current_usage = current_usage + 1
        WHERE id = ?
      `, [coupon.id]);

      console.log(`✅ [Coupons] current_usage incremented`);
    } catch (error) {
      console.error('⚠️ [Coupons] Error incrementing current_usage:', error);
    }

    console.log(`✅ [Coupons] Coupon used successfully`);

    return res.status(200).json({
      success: true,
      message: '쿠폰이 사용되었습니다'
    });

  } catch (error) {
    console.error('❌ [Coupons] Use error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 사용 처리 중 오류가 발생했습니다'
    });
  }
};
