const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');

/**
 * 관리자 쿠폰 관리 API (관리자 전용)
 * GET: 모든 쿠폰 조회
 * POST: 쿠폰 생성
 * PUT: 쿠폰 수정
 * DELETE: 쿠폰 삭제
 */
async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 모든 쿠폰 조회
    if (req.method === 'GET') {
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
          is_active,
          usage_limit,
          current_usage,
          usage_per_user,
          created_at,
          updated_at
        FROM coupons
        ORDER BY created_at DESC
      `);

      const coupons = (result.rows || []).map(coupon => ({
        ...coupon,
        remaining: coupon.usage_limit ? coupon.usage_limit - coupon.current_usage : null
      }));

      return res.status(200).json({
        success: true,
        data: coupons
      });
    }

    // POST: 쿠폰 생성
    if (req.method === 'POST') {
      const {
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
        usage_per_user
      } = req.body;

      if (!code || !discount_type || !discount_value) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_REQUIRED_FIELDS',
          message: '필수 항목을 입력해주세요 (코드, 할인 타입, 할인 값)'
        });
      }

      // 코드 중복 확인
      const existingCoupon = await connection.execute(`
        SELECT id FROM coupons WHERE code = ?
      `, [code.toUpperCase()]);

      if (existingCoupon.rows && existingCoupon.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_CODE',
          message: '이미 존재하는 쿠폰 코드입니다'
        });
      }

      await connection.execute(`
        INSERT INTO coupons (
          code, title, description, discount_type, discount_value,
          min_amount, max_discount_amount, target_category,
          valid_from, valid_until, usage_limit, usage_per_user,
          is_active, current_usage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 0)
      `, [
        code.toUpperCase(),
        title || null,
        description || null,
        discount_type,
        discount_value,
        min_amount || 0,
        max_discount_amount || null,
        target_category || null,
        valid_from || null,
        valid_until || null,
        usage_limit || null,
        usage_per_user || null
      ]);

      console.log(`✅ [Admin] 쿠폰 생성: ${code}`);

      return res.status(201).json({
        success: true,
        message: '쿠폰이 생성되었습니다'
      });
    }

    // PUT: 쿠폰 수정
    if (req.method === 'PUT') {
      const {
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
        is_active,
        usage_limit,
        usage_per_user
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '쿠폰 ID가 필요합니다'
        });
      }

      // 코드 변경 시 중복 확인
      if (code) {
        const existingCoupon = await connection.execute(`
          SELECT id FROM coupons WHERE code = ? AND id != ?
        `, [code.toUpperCase(), id]);

        if (existingCoupon.rows && existingCoupon.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'DUPLICATE_CODE',
            message: '이미 존재하는 쿠폰 코드입니다'
          });
        }
      }

      await connection.execute(`
        UPDATE coupons SET
          code = ?,
          title = ?,
          description = ?,
          discount_type = ?,
          discount_value = ?,
          min_amount = ?,
          max_discount_amount = ?,
          target_category = ?,
          valid_from = ?,
          valid_until = ?,
          is_active = ?,
          usage_limit = ?,
          usage_per_user = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        code?.toUpperCase(),
        title,
        description,
        discount_type,
        discount_value,
        min_amount,
        max_discount_amount,
        target_category,
        valid_from,
        valid_until,
        is_active !== undefined ? is_active : true,
        usage_limit,
        usage_per_user,
        id
      ]);

      console.log(`✅ [Admin] 쿠폰 수정: ${id}`);

      return res.status(200).json({
        success: true,
        message: '쿠폰이 수정되었습니다'
      });
    }

    // DELETE: 쿠폰 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '쿠폰 ID가 필요합니다'
        });
      }

      await connection.execute(`
        DELETE FROM coupons WHERE id = ?
      `, [id]);

      console.log(`✅ [Admin] 쿠폰 삭제: ${id}`);

      return res.status(200).json({
        success: true,
        message: '쿠폰이 삭제되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 메서드입니다'
    });

  } catch (error) {
    console.error('❌ [Admin Coupons] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 관리 중 오류가 발생했습니다'
    });
  }
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);
