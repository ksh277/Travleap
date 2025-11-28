/**
 * 쿠폰 정보 조회 API (로그인 불필요)
 * GET /api/coupon/info?code=SHINAN2025
 *
 * 쿠폰 발급 전 미리보기용 정보 제공
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 요청만 허용됩니다'
    });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_CODE',
      message: '쿠폰 코드가 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 쿠폰 정보 조회
    const result = await connection.execute(`
      SELECT
        code,
        name,
        description,
        discount_type,
        discount_value,
        max_discount,
        valid_from,
        valid_until,
        is_active,
        usage_limit,
        used_count
      FROM coupons
      WHERE code = ?
      LIMIT 1
    `, [code.toUpperCase()]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '존재하지 않는 쿠폰입니다'
      });
    }

    const coupon = result.rows[0];

    // 활성 상태 확인
    if (!coupon.is_active) {
      return res.status(400).json({
        success: false,
        error: 'COUPON_INACTIVE',
        message: '현재 사용할 수 없는 쿠폰입니다'
      });
    }

    // 유효기간 확인
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({
        success: false,
        error: 'NOT_STARTED',
        message: '아직 시작되지 않은 쿠폰입니다'
      });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({
        success: false,
        error: 'EXPIRED',
        message: '만료된 쿠폰입니다'
      });
    }

    // 발급 한도 확인
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        error: 'LIMIT_REACHED',
        message: '쿠폰 발급이 마감되었습니다'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount: coupon.max_discount,
        valid_until: coupon.valid_until
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Info] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 정보 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(handler);
