const { connect } = require('@planetscale/database');

/**
 * 쿠폰 코드 검증 API
 * POST /api/coupons/validate
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
    const { code, userId, orderAmount, category } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CODE',
        message: '쿠폰 코드를 입력해주세요'
      });
    }

    console.log(`🔍 [Coupons] Validating coupon: ${code}, orderAmount: ${orderAmount}, userId: ${userId}`);

    // 쿠폰 조회
    const result = await connection.execute(`
      SELECT * FROM coupons
      WHERE code = ? AND is_active = 1
      LIMIT 1
    `, [code.toUpperCase()]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'INVALID_CODE',
        message: '유효하지 않은 쿠폰 코드입니다'
      });
    }

    const coupon = result.rows[0];

    // 유효 기간 체크
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({
        success: false,
        error: 'NOT_YET_VALID',
        message: '아직 사용할 수 없는 쿠폰입니다'
      });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({
        success: false,
        error: 'EXPIRED',
        message: '만료된 쿠폰입니다'
      });
    }

    // 최대 사용 횟수 체크 (전체)
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        error: 'MAX_USAGE_EXCEEDED',
        message: '쿠폰 사용 가능 횟수가 초과되었습니다'
      });
    }

    // 사용자당 사용 횟수 체크
    if (userId && coupon.usage_per_user !== null) {
      try {
        // user_coupons 테이블에서 이미 사용한 횟수 확인 (status = 'used')
        const usageCount = await connection.execute(`
          SELECT COUNT(*) as count
          FROM user_coupons
          WHERE coupon_id = ? AND user_id = ? AND status = 'used'
        `, [coupon.id, userId]);

        const currentUserUsage = usageCount.rows[0]?.count || 0;
        console.log(`📊 [Coupons] User ${userId} has used coupon ${coupon.code} ${currentUserUsage} times (limit: ${coupon.usage_per_user})`);

        if (currentUserUsage >= coupon.usage_per_user) {
          return res.status(400).json({
            success: false,
            error: 'USER_LIMIT_EXCEEDED',
            message: `이 쿠폰은 1인당 ${coupon.usage_per_user}회만 사용 가능합니다`
          });
        }
      } catch (error) {
        console.error('⚠️ [Coupons] Error checking user_coupons:', error);
        // ✅ user_coupons 테이블 에러 시 coupon_usage 테이블로 재시도
        try {
          const fallbackCount = await connection.execute(`
            SELECT COUNT(*) as count
            FROM coupon_usage
            WHERE coupon_id = ? AND user_id = ?
          `, [coupon.id, userId]);

          const fallbackUsage = fallbackCount.rows[0]?.count || 0;
          console.log(`📊 [Coupons] Fallback: User ${userId} has used coupon ${coupon.code} ${fallbackUsage} times`);

          if (fallbackUsage >= coupon.usage_per_user) {
            return res.status(400).json({
              success: false,
              error: 'USER_LIMIT_EXCEEDED',
              message: `이 쿠폰은 1인당 ${coupon.usage_per_user}회만 사용 가능합니다`
            });
          }
        } catch (fallbackError) {
          console.warn('⚠️ [Coupons] Fallback check also failed, proceeding anyway:', fallbackError);
          // 두 번 다 실패하면 그냥 진행 (쿠폰 사용 가능하게)
        }
      }
    }

    // 카테고리 체크
    if (coupon.target_category && category && coupon.target_category !== category) {
      return res.status(400).json({
        success: false,
        error: 'CATEGORY_MISMATCH',
        message: `이 쿠폰은 ${coupon.target_category} 카테고리 상품만 사용 가능합니다`
      });
    }

    // 최소 주문 금액 확인
    if (orderAmount && coupon.min_amount && orderAmount < coupon.min_amount) {
      return res.status(400).json({
        success: false,
        error: 'MIN_AMOUNT_NOT_MET',
        message: `최소 주문 금액 ${coupon.min_amount.toLocaleString()}원 이상이어야 사용 가능합니다`
      });
    }

    // 할인 금액 계산
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.floor(orderAmount * coupon.discount_value / 100);
      // 최대 할인 금액 제한 (예: 10% 할인인데 최대 5,000원)
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    console.log(`✅ [Coupons] Coupon valid, discount: ${discountAmount}`);

    return res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        discountAmount,
        discountType: coupon.discount_type,
        description: coupon.description
      }
    });

  } catch (error) {
    console.error('❌ [Coupons] Validate error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 검증 중 오류가 발생했습니다'
    });
  }
};
