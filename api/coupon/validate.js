/**
 * 쿠폰 검증 API
 * GET /api/coupon/validate?code=ABC123XY
 *
 * 파트너(가맹점)가 고객의 쿠폰 코드를 검증
 * - 쿠폰 유효성 확인
 * - 파트너 쿠폰 참여 여부 확인
 * - 할인 정보 반환
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 요청만 허용됩니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    const { code } = req.query; // 개인 쿠폰 코드 (예: ABC123XY)
    const partnerId = req.user?.partnerId; // 파트너 로그인한 경우

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CODE',
        message: '쿠폰 코드를 입력해주세요'
      });
    }

    // 1. 개인 쿠폰 조회 (PlanetScale)
    const userCouponResult = await connection.execute(`
      SELECT
        uc.id as user_coupon_id,
        uc.user_id,
        uc.coupon_id,
        uc.coupon_code,
        uc.status,
        uc.used_at,
        uc.used_partner_id,
        c.code as campaign_code,
        c.name as coupon_name,
        c.description as coupon_description,
        c.target_type,
        c.target_categories,
        c.discount_type,
        c.discount_value,
        c.max_discount,
        c.valid_until
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.coupon_code = ?
      LIMIT 1
    `, [code.toUpperCase()]);

    if (!userCouponResult.rows || userCouponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: '존재하지 않는 쿠폰 코드입니다'
      });
    }

    const userCoupon = userCouponResult.rows[0];

    // 유저 이름 조회 (Neon)
    let customerName = '고객';
    if (userCoupon.user_id) {
      try {
        const userResult = await poolNeon.query(
          'SELECT name FROM users WHERE id = $1',
          [userCoupon.user_id]
        );
        if (userResult.rows?.[0]?.name) {
          customerName = userResult.rows[0].name;
        }
      } catch (e) {
        console.warn('⚠️ [Coupon Validate] Neon user query failed:', e.message);
      }
    }

    // 2. 쿠폰 상태 확인
    if (userCoupon.status === 'USED') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_USED',
        message: '이미 사용된 쿠폰입니다',
        data: {
          used_at: userCoupon.used_at
        }
      });
    }

    if (userCoupon.status === 'EXPIRED' || userCoupon.status === 'REVOKED') {
      return res.status(400).json({
        success: false,
        error: 'COUPON_INVALID',
        message: userCoupon.status === 'EXPIRED' ? '만료된 쿠폰입니다' : '취소된 쿠폰입니다'
      });
    }

    // 3. 유효기간 확인 (coupons.valid_until 사용)
    const expirationDate = userCoupon.valid_until;
    if (expirationDate && new Date(expirationDate) < new Date()) {
      // 만료 상태로 업데이트
      await connection.execute(
        'UPDATE user_coupons SET status = "EXPIRED" WHERE id = ?',
        [userCoupon.user_coupon_id]
      );

      return res.status(400).json({
        success: false,
        error: 'COUPON_EXPIRED',
        message: '만료된 쿠폰입니다'
      });
    }

    // 4. 파트너가 요청한 경우, 파트너 쿠폰 참여 여부 확인
    let partnerInfo = null;
    let discountType = userCoupon.discount_type === 'percentage' ? 'PERCENT' : 'AMOUNT';
    let discountValue = userCoupon.discount_value;
    let maxDiscount = userCoupon.max_discount;
    let minOrder = 0;

    if (partnerId) {
      // 파트너 정보 조회
      const partnerResult = await connection.execute(`
        SELECT
          id, business_name, status,
          is_coupon_partner,
          coupon_discount_type,
          coupon_discount_value,
          coupon_max_discount,
          coupon_min_order,
          services as category
        FROM partners
        WHERE id = ?
        LIMIT 1
      `, [partnerId]);

      if (partnerResult.rows && partnerResult.rows.length > 0) {
        partnerInfo = partnerResult.rows[0];

        // 파트너 상태 확인
        if (partnerInfo.status !== 'approved') {
          return res.status(403).json({
            success: false,
            error: 'PARTNER_NOT_APPROVED',
            message: '승인되지 않은 가맹점입니다'
          });
        }

        // 쿠폰 참여 여부 확인
        if (!partnerInfo.is_coupon_partner) {
          return res.status(403).json({
            success: false,
            error: 'PARTNER_NOT_COUPON_ENABLED',
            message: '쿠폰 사용이 불가능한 가맹점입니다'
          });
        }

        // target_type 확인
        if (userCoupon.target_type === 'CATEGORY') {
          const targetCategories = userCoupon.target_categories
            ? (typeof userCoupon.target_categories === 'string'
              ? JSON.parse(userCoupon.target_categories)
              : userCoupon.target_categories)
            : [];

          if (targetCategories.length > 0 && !targetCategories.includes(partnerInfo.category)) {
            return res.status(403).json({
              success: false,
              error: 'CATEGORY_NOT_MATCHED',
              message: '이 쿠폰은 해당 카테고리에서 사용할 수 없습니다'
            });
          }
        }

        if (userCoupon.target_type === 'SPECIFIC') {
          // coupon_targets 테이블에서 확인
          const targetCheck = await connection.execute(`
            SELECT id FROM coupon_targets
            WHERE coupon_id = ? AND partner_id = ?
            LIMIT 1
          `, [userCoupon.coupon_id, partnerId]);

          if (!targetCheck.rows || targetCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              error: 'PARTNER_NOT_TARGETED',
              message: '이 쿠폰은 해당 가맹점에서 사용할 수 없습니다'
            });
          }
        }

        // 파트너별 할인 설정이 있으면 우선 적용
        if (partnerInfo.coupon_discount_type && partnerInfo.coupon_discount_value) {
          // DB: 'percent' → 프론트: 'PERCENT' 변환
          const partnerType = (partnerInfo.coupon_discount_type || '').toLowerCase();
          discountType = (partnerType === 'percent' || partnerType === 'percentage') ? 'PERCENT' : 'AMOUNT';
          discountValue = partnerInfo.coupon_discount_value;
          maxDiscount = partnerInfo.coupon_max_discount || maxDiscount;
          minOrder = partnerInfo.coupon_min_order || 0;
        }
      }
    }

    // 5. 성공 응답
    console.log(`✅ [Coupon] 쿠폰 검증 성공: code=${code}, partner=${partnerId || 'none'}`);

    return res.status(200).json({
      success: true,
      message: '유효한 쿠폰입니다',
      data: {
        user_coupon_id: userCoupon.user_coupon_id,
        coupon_code: userCoupon.coupon_code,
        coupon_name: userCoupon.coupon_name,
        coupon_description: userCoupon.coupon_description,
        customer_name: customerName,
        discount: {
          type: discountType,
          value: discountValue,
          max_discount: maxDiscount,
          min_order: minOrder
        },
        expires_at: userCoupon.expires_at,
        partner: partnerInfo ? {
          id: partnerInfo.id,
          name: partnerInfo.business_name
        } : null
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Validate] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 검증 중 오류가 발생했습니다'
    });
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
}

// 파트너 인증 선택적 (로그인 없이도 검증 가능, 단 파트너 로그인 시 추가 검증)
module.exports = withPublicCors(withAuth(handler, { requireAuth: false }));
