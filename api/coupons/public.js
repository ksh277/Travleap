const { connect } = require('@planetscale/database');

/**
 * 공개 쿠폰 목록 조회 API
 * GET /api/coupons/public
 * 모든 사용자가 다운로드할 수 있는 활성 쿠폰 목록
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 요청만 허용됩니다'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 현재 활성화되어 있고 유효기간 내의 쿠폰 조회
    const result = await connection.execute(`
      SELECT
        id,
        code,
        title,
        description,
        discount_type,
        discount_value,
        min_amount,
        max_discount_amount,
        target_category,
        valid_from,
        valid_until,
        usage_limit,
        current_usage,
        usage_per_user
      FROM coupons
      WHERE is_active = 1
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (usage_limit IS NULL OR current_usage < usage_limit)
      ORDER BY created_at DESC
    `);

    const coupons = (result.rows || []).map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      title: coupon.title || coupon.description || coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_amount: coupon.min_amount || 0,
      max_discount_amount: coupon.max_discount_amount,
      target_category: coupon.target_category,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      usage_limit: coupon.usage_limit,
      current_usage: coupon.current_usage,
      usage_per_user: coupon.usage_per_user,
      // 잔여 수량 계산
      remaining: coupon.usage_limit ? coupon.usage_limit - coupon.current_usage : null
    }));

    console.log(`✅ [Public Coupons] Found ${coupons.length} available coupons`);

    return res.status(200).json({
      success: true,
      data: coupons
    });

  } catch (error) {
    console.error('❌ [Public Coupons] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '공개 쿠폰 목록 조회 중 오류가 발생했습니다'
    });
  }
};
