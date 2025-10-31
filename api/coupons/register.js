const { connect } = require('@planetscale/database');

/**
 * 쿠폰 등록 API
 * POST /api/coupons/register
 * 사용자가 쿠폰 코드를 입력하여 자신의 보유 쿠폰에 추가
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

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
    const connection = connect({ url: process.env.DATABASE_URL });
    const { code, userId } = req.body;

    console.log('🎟️ [Coupon Register] 쿠폰 등록 요청:', { code, userId });

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: '쿠폰 코드와 사용자 ID가 필요합니다'
      });
    }

    // ✅ coupons 테이블 생성 (없으면)
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255),
          description TEXT,
          discount_type ENUM('percentage', 'fixed') NOT NULL,
          discount_value INT NOT NULL,
          min_amount INT DEFAULT 0,
          max_discount_amount INT NULL,
          target_category VARCHAR(50),
          valid_from TIMESTAMP NULL,
          valid_until TIMESTAMP NULL,
          is_active BOOLEAN DEFAULT TRUE,
          usage_limit INT NULL,
          current_usage INT DEFAULT 0,
          usage_per_user INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (code),
          INDEX idx_is_active (is_active),
          INDEX idx_valid_until (valid_until)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (tableError) {
      console.warn('⚠️ [Coupon Register] coupons 테이블 생성 오류 (무시):', tableError.message);
    }

    // ✅ user_coupons 테이블 생성 (없으면)
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
      console.log('✅ [Coupon Register] user_coupons 테이블 확인 완료');
    } catch (tableError) {
      console.error('⚠️ [Coupon Register] 테이블 생성 오류 (무시):', tableError.message);
      // 테이블이 이미 존재하면 에러 무시
    }

    // 1. 쿠폰 코드 유효성 확인
    const couponResult = await connection.execute(`
      SELECT * FROM coupons
      WHERE code = ? AND is_active = 1
      LIMIT 1
    `, [code.toUpperCase()]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'INVALID_CODE',
        message: '유효하지 않은 쿠폰 코드입니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 유효 기간 체크
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({
        success: false,
        error: 'NOT_YET_VALID',
        message: `이 쿠폰은 ${new Date(coupon.valid_from).toLocaleDateString('ko-KR')}부터 사용 가능합니다`
      });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({
        success: false,
        error: 'EXPIRED',
        message: '만료된 쿠폰입니다'
      });
    }

    // 3. 이미 등록했는지 확인
    const alreadyRegistered = await connection.execute(`
      SELECT id FROM user_coupons
      WHERE user_id = ? AND coupon_id = ?
      LIMIT 1
    `, [userId, coupon.id]);

    if (alreadyRegistered.rows && alreadyRegistered.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_REGISTERED',
        message: '이미 보유한 쿠폰입니다'
      });
    }

    // 4. 쿠폰 등록
    await connection.execute(`
      INSERT INTO user_coupons (user_id, coupon_id, registered_at)
      VALUES (?, ?, NOW())
    `, [userId, coupon.id]);

    console.log(`✅ [Coupon Register] 쿠폰 등록 성공: user_id=${userId}, coupon_id=${coupon.id}`);

    return res.status(200).json({
      success: true,
      message: '쿠폰이 등록되었습니다',
      data: {
        code: coupon.code,
        title: coupon.title || coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_amount: coupon.min_amount
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Register] API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 등록 중 오류가 발생했습니다'
    });
  }
};
