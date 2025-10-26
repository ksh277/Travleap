const { connect } = require('@planetscale/database');

/**
 * 쿠폰 API
 * - GET /api/coupons?userId=xxx: 사용 가능한 쿠폰 목록 조회
 * - POST /api/coupons/validate: 쿠폰 코드 검증
 * - POST /api/coupons/use: 쿠폰 사용 처리
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

    // GET: 사용 가능한 쿠폰 목록 조회
    if (req.method === 'GET') {
      const { userId } = req.query;

      console.log('🎟️ [Coupons] Fetching available coupons, userId:', userId);

      // 현재 유효한 쿠폰 조회
      const coupons = await connection.execute(`
        SELECT
          id,
          code,
          discount_type,
          discount_value,
          min_amount,
          max_discount,
          description,
          expires_at,
          usage_limit,
          used_count,
          is_active,
          category_restriction,
          user_restriction
        FROM coupons
        WHERE is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY discount_value DESC, expires_at ASC
      `);

      const couponList = (coupons.rows || []).map(coupon => ({
        code: coupon.code,
        discount: coupon.discount_value,
        minAmount: coupon.min_amount || 0,
        maxDiscount: coupon.max_discount || null,
        description: coupon.description || '',
        type: coupon.discount_type === 'percentage' ? 'percentage' : 'fixed',
        expiresAt: coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : null,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count || 0,
        categoryRestriction: coupon.category_restriction,
        userRestriction: coupon.user_restriction
      }));

      console.log(`✅ [Coupons] Found ${couponList.length} active coupons`);

      return res.status(200).json({
        success: true,
        data: couponList
      });
    }

    // POST: 쿠폰 코드 검증
    if (req.method === 'POST' && req.url.includes('/validate')) {
      const { code, userId, orderAmount, category } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_CODE',
          message: '쿠폰 코드를 입력해주세요'
        });
      }

      console.log(`🔍 [Coupons] Validating coupon: ${code}, orderAmount: ${orderAmount}`);

      // 쿠폰 조회
      const result = await connection.execute(`
        SELECT * FROM coupons
        WHERE code = ? AND is_active = TRUE
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

      // 만료 확인
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'EXPIRED',
          message: '만료된 쿠폰입니다'
        });
      }

      // 사용 횟수 확인
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return res.status(400).json({
          success: false,
          error: 'LIMIT_EXCEEDED',
          message: '쿠폰 사용 한도가 초과되었습니다'
        });
      }

      // 최소 주문 금액 확인
      if (orderAmount < coupon.min_amount) {
        return res.status(400).json({
          success: false,
          error: 'MIN_AMOUNT_NOT_MET',
          message: `최소 주문 금액 ${coupon.min_amount.toLocaleString()}원 이상이어야 사용 가능합니다`
        });
      }

      // 카테고리 제한 확인
      if (coupon.category_restriction && category) {
        const allowedCategories = JSON.parse(coupon.category_restriction || '[]');
        if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
          return res.status(400).json({
            success: false,
            error: 'CATEGORY_RESTRICTION',
            message: '이 쿠폰은 해당 카테고리에서 사용할 수 없습니다'
          });
        }
      }

      // 사용자 제한 확인
      if (coupon.user_restriction && userId) {
        const allowedUsers = JSON.parse(coupon.user_restriction || '[]');
        if (allowedUsers.length > 0 && !allowedUsers.includes(parseInt(userId))) {
          return res.status(400).json({
            success: false,
            error: 'USER_RESTRICTION',
            message: '이 쿠폰은 사용할 수 없습니다'
          });
        }
      }

      // 할인 금액 계산
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.floor(orderAmount * coupon.discount_value / 100);
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount;
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
    }

    // POST: 쿠폰 사용 처리 (주문 완료 시 호출)
    if (req.method === 'POST' && req.url.includes('/use')) {
      const { code, userId, orderId } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_CODE',
          message: '쿠폰 코드가 필요합니다'
        });
      }

      console.log(`📝 [Coupons] Using coupon: ${code} for order ${orderId}`);

      // 🔒 FOR UPDATE 락으로 동시성 제어 (마지막 1개 쿠폰 경쟁 상태 방지)
      const couponCheck = await connection.execute(`
        SELECT * FROM coupons
        WHERE code = ? AND is_active = TRUE
        FOR UPDATE
      `, [code.toUpperCase()]);

      if (!couponCheck.rows || couponCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'COUPON_NOT_FOUND',
          message: '쿠폰을 찾을 수 없습니다'
        });
      }

      const coupon = couponCheck.rows[0];

      // 사용 한도 재확인 (FOR UPDATE 락 획득 후)
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        console.log(`⚠️ [Coupons] Coupon limit exceeded: ${code}`);
        return res.status(400).json({
          success: false,
          error: 'LIMIT_EXCEEDED',
          message: '쿠폰 사용 한도가 초과되었습니다'
        });
      }

      // 쿠폰 사용 횟수 증가
      await connection.execute(`
        UPDATE coupons
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE code = ?
      `, [code.toUpperCase()]);

      // 쿠폰 사용 기록 저장 (선택사항 - coupon_usage 테이블이 있는 경우)
      try {
        await connection.execute(`
          INSERT INTO coupon_usage (
            coupon_code, user_id, order_id, used_at
          ) VALUES (?, ?, ?, NOW())
        `, [code.toUpperCase(), userId || null, orderId || null]);
      } catch (error) {
        // 테이블이 없으면 무시
        console.log('⚠️ [Coupons] coupon_usage table not found, skipping usage log');
      }

      console.log(`✅ [Coupons] Coupon used successfully`);

      return res.status(200).json({
        success: true,
        message: '쿠폰이 사용되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Coupons] API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 처리 중 오류가 발생했습니다'
    });
  }
};
