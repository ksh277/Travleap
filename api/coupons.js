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
      const userId = req.query.userId ? parseInt(req.query.userId) : null;

      console.log('🎟️ [Coupons] Fetching available coupons, userId:', userId);
      console.log('🎟️ [Coupons] DATABASE_URL exists:', !!process.env.DATABASE_URL);

      // 임시로 쿠폰 목록 비활성화 (나중에 활성화 예정)
      // TODO: 쿠폰 배포 시 아래 주석을 제거하고 return [] 부분 삭제
      /*
      // 현재 유효한 쿠폰 조회 (기본 컬럼만)
      const result = await connection.execute(`
        SELECT
          id,
          code,
          discount_type,
          discount_value,
          min_amount,
          description
        FROM coupons
        WHERE is_active = 1
        ORDER BY discount_value DESC
      `);

      const coupons = result.rows || [];
      const couponList = coupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.description || coupon.code,
        description: coupon.description || '',
        // MyPage 형식
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_amount: coupon.min_amount || 0,
        // CartPage 형식 (호환성)
        type: coupon.discount_type,
        discount: coupon.discount_value,
        minAmount: coupon.min_amount || 0
      }));

      console.log(`✅ [Coupons] Found ${couponList.length} active coupons`);
      */

      // 임시: 빈 쿠폰 목록 반환
      console.log(`⚠️  [Coupons] 쿠폰 목록 임시 비활성화됨`);

      return res.status(200).json({
        success: true,
        data: []
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

      // 최대 사용 횟수 체크 (전체) - usage_limit 사용
      if (coupon.usage_limit !== null && coupon.current_usage >= coupon.usage_limit) {
        return res.status(400).json({
          success: false,
          error: 'MAX_USAGE_EXCEEDED',
          message: '쿠폰 사용 가능 횟수가 초과되었습니다'
        });
      }

      // 사용자당 사용 횟수 체크
      if (userId && coupon.usage_per_user !== null) {
        try {
          const usageCount = await connection.execute(`
            SELECT COUNT(*) as count
            FROM coupon_usage
            WHERE coupon_id = ? AND user_id = ?
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
          console.error('⚠️ [Coupons] Error checking user usage:', error);
          // 에러가 나도 계속 진행 (테이블이 없을 수 있음)
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

      // 쿠폰 사용 기록 저장
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
    }

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
