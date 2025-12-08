/**
 * 쿠폰북 API
 * GET /api/couponbook - 쿠폰북 쿠폰 목록 조회
 * POST /api/couponbook - 쿠폰 다운로드 (발급)
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 쿠폰북에 표시할 쿠폰 목록 조회
    if (req.method === 'GET') {
      const userId = req.query.user_id;

      // 활성화된 쿠폰북 쿠폰 조회
      const result = await connection.execute(`
        SELECT
          c.id,
          c.code,
          c.name,
          c.title,
          c.description,
          c.discount_type,
          c.discount_value,
          c.min_amount,
          c.max_discount,
          c.valid_from,
          c.valid_until,
          c.usage_limit,
          c.issued_count,
          c.max_issues_per_user
        FROM coupons c
        WHERE c.coupon_category = 'couponbook'
          AND c.is_active = TRUE
          AND (c.valid_from IS NULL OR c.valid_from <= NOW())
          AND (c.valid_until IS NULL OR c.valid_until >= NOW())
          AND (c.usage_limit IS NULL OR c.issued_count < c.usage_limit)
        ORDER BY c.created_at DESC
      `);

      const coupons = result.rows || [];

      // 사용자가 로그인한 경우, 이미 발급받은 쿠폰 체크
      let userCouponIds = [];
      if (userId) {
        const userCoupons = await connection.execute(`
          SELECT coupon_id FROM user_coupons WHERE user_id = ?
        `, [userId]);
        userCouponIds = (userCoupons.rows || []).map(uc => uc.coupon_id);
      }

      // 각 쿠폰에 발급 가능 여부 추가
      const couponsWithStatus = coupons.map(coupon => {
        const alreadyIssued = userCouponIds.includes(coupon.id);
        const issuedCount = userCouponIds.filter(id => id === coupon.id).length;
        const maxIssues = coupon.max_issues_per_user || 1;
        const canDownload = !alreadyIssued || issuedCount < maxIssues;

        return {
          ...coupon,
          already_issued: alreadyIssued,
          can_download: canDownload,
          remaining: coupon.usage_limit ? coupon.usage_limit - coupon.issued_count : null
        };
      });

      return res.status(200).json({
        success: true,
        data: couponsWithStatus
      });
    }

    // POST: 쿠폰 다운로드 (발급)
    if (req.method === 'POST') {
      const { user_id, coupon_id } = req.body;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: 'LOGIN_REQUIRED',
          message: '로그인이 필요합니다'
        });
      }

      if (!coupon_id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_COUPON_ID',
          message: '쿠폰 ID가 필요합니다'
        });
      }

      // 쿠폰 정보 조회
      const couponResult = await connection.execute(`
        SELECT *
        FROM coupons
        WHERE id = ?
          AND coupon_category = 'couponbook'
          AND is_active = TRUE
        LIMIT 1
      `, [coupon_id]);

      if (!couponResult.rows || couponResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'COUPON_NOT_FOUND',
          message: '해당 쿠폰을 찾을 수 없습니다'
        });
      }

      const coupon = couponResult.rows[0];

      // 유효기간 확인
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'COUPON_EXPIRED',
          message: '유효기간이 만료된 쿠폰입니다'
        });
      }

      // 총 발급 수량 확인
      if (coupon.usage_limit && coupon.issued_count >= coupon.usage_limit) {
        return res.status(400).json({
          success: false,
          error: 'COUPON_SOLD_OUT',
          message: '쿠폰이 모두 소진되었습니다'
        });
      }

      // 사용자별 발급 수량 확인
      const userCoupons = await connection.execute(`
        SELECT COUNT(*) as count FROM user_coupons
        WHERE user_id = ? AND coupon_id = ?
      `, [user_id, coupon_id]);

      const maxIssues = coupon.max_issues_per_user || 1;
      if (userCoupons.rows[0].count >= maxIssues) {
        return res.status(400).json({
          success: false,
          error: 'ALREADY_ISSUED',
          message: '이미 발급받은 쿠폰입니다'
        });
      }

      // 고유 쿠폰 코드 생성
      let userCouponCode;
      let attempts = 0;
      while (attempts < 10) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'CB-'; // CouponBook
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        userCouponCode = code;

        const codeCheck = await connection.execute(
          'SELECT id FROM user_coupons WHERE coupon_code = ?',
          [userCouponCode]
        );
        if (!codeCheck.rows || codeCheck.rows.length === 0) break;
        attempts++;
      }

      // user_coupons에 발급 (expires_at 포함)
      await connection.execute(`
        INSERT INTO user_coupons (
          user_id, coupon_id, coupon_code, status, issued_at, expires_at
        ) VALUES (?, ?, ?, 'ISSUED', NOW(), ?)
      `, [user_id, coupon_id, userCouponCode, coupon.valid_until]);

      // coupons의 issued_count 증가
      await connection.execute(`
        UPDATE coupons SET issued_count = COALESCE(issued_count, 0) + 1 WHERE id = ?
      `, [coupon_id]);

      console.log(`✅ [CouponBook] 쿠폰 발급: user=${user_id}, code=${userCouponCode}`);

      return res.status(200).json({
        success: true,
        message: '쿠폰이 발급되었습니다',
        data: {
          coupon_code: userCouponCode,
          coupon_name: coupon.name || coupon.title,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          valid_until: coupon.valid_until
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 메서드입니다'
    });

  } catch (error) {
    console.error('❌ [CouponBook] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰북 처리 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(handler);
