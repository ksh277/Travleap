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
      const { code, userId, orderId } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_CODE',
          message: '쿠폰 코드가 필요합니다'
        });
      }

      console.log(`📝 [Coupons] Using coupon: ${code} for order ${orderId}`);

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
