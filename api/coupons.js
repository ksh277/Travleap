const { connect } = require('@planetscale/database');

/**
 * 쿠폰 API
 * - GET /api/coupons?userId=xxx: 사용 가능한 쿠폰 목록 조회
 * - POST /api/coupons/validate: 쿠폰 코드 검증 → pages/api/coupons/validate.js
 * - POST /api/coupons/use: 쿠폰 사용 처리 → pages/api/coupons/use.js
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 사용자 보유 쿠폰 목록 조회
    if (req.method === 'GET') {
      const userId = req.query.userId ? parseInt(req.query.userId) : null;

      console.log('🎟️ [Coupons] Fetching user coupons, userId:', userId);

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_USER_ID',
          message: '사용자 ID가 필요합니다'
        });
      }

      // user_coupons 테이블이 없으면 생성
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS user_coupons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            coupon_id INT NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_used BOOLEAN DEFAULT FALSE,
            used_at TIMESTAMP NULL,
            order_number VARCHAR(100) NULL,
            UNIQUE KEY unique_user_coupon (user_id, coupon_id),
            INDEX idx_user_id (user_id),
            INDEX idx_coupon_id (coupon_id),
            INDEX idx_is_used (is_used)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      } catch (tableError) {
        console.warn('⚠️ [Coupons] 테이블 생성 오류 (무시):', tableError.message);
      }

      // 사용자가 등록한 쿠폰 조회 (미사용 쿠폰만)
      const result = await connection.execute(`
        SELECT
          c.id,
          c.code,
          c.title,
          c.description,
          c.discount_type,
          c.discount_value,
          c.min_amount,
          c.valid_from,
          c.valid_until,
          uc.registered_at,
          uc.is_used
        FROM user_coupons uc
        JOIN coupons c ON uc.coupon_id = c.id
        WHERE uc.user_id = ?
          AND uc.is_used = FALSE
          AND c.is_active = 1
        ORDER BY uc.registered_at DESC
      `, [userId]);

      const coupons = (result.rows || []).map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.title || coupon.description || coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_amount: coupon.min_amount || 0,
        valid_from: coupon.valid_from,
        valid_until: coupon.valid_until,
        registered_at: coupon.registered_at,
        // PaymentPage 호환성
        type: coupon.discount_type,
        discount: coupon.discount_value,
        minAmount: coupon.min_amount || 0
      }));

      console.log(`✅ [Coupons] Found ${coupons.length} user coupons`);

      return res.status(200).json({
        success: true,
        data: coupons
      });
    }

    // ✅ POST 요청은 별도 파일에서 처리
    // - /api/coupons/validate → pages/api/coupons/validate.js
    // - /api/coupons/use → pages/api/coupons/use.js

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Coupons] API error:', error);
    console.error('❌ [Coupons] Error stack:', error.stack);
    console.error('❌ [Coupons] Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 처리 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
