/**
 * 쿠폰 사용 API
 * POST /api/coupon/use
 *
 * 파트너(가맹점)가 고객의 쿠폰을 사용 처리
 * - 주문 금액 입력 → 할인 계산 → 사용 완료 처리
 * - 파트너 통계 업데이트
 * - 리뷰 대기 상태로 설정
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

/**
 * 할인 금액 계산
 */
function calculateDiscount(orderAmount, discountType, discountValue, maxDiscount) {
  let discountAmount = 0;

  if (discountType === 'PERCENT') {
    discountAmount = Math.floor(orderAmount * (discountValue / 100));
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  } else if (discountType === 'AMOUNT') {
    discountAmount = discountValue;
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }
  }

  return discountAmount;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'POST 요청만 허용됩니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const partnerId = req.user?.partnerId;
    const { coupon_code, order_amount } = req.body;

    // 1. 파트너 인증 확인
    if (!partnerId) {
      return res.status(401).json({
        success: false,
        error: 'PARTNER_REQUIRED',
        message: '파트너 계정으로 로그인해주세요'
      });
    }

    if (!coupon_code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_COUPON_CODE',
        message: '쿠폰 코드를 입력해주세요'
      });
    }

    if (!order_amount || order_amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ORDER_AMOUNT',
        message: '올바른 주문 금액을 입력해주세요'
      });
    }

    // 2. 파트너 정보 조회
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

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PARTNER_NOT_FOUND',
        message: '파트너 정보를 찾을 수 없습니다'
      });
    }

    const partner = partnerResult.rows[0];

    // 파트너 상태 확인
    if (partner.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'PARTNER_NOT_APPROVED',
        message: '승인되지 않은 가맹점입니다'
      });
    }

    // 쿠폰 참여 여부 확인
    if (!partner.is_coupon_partner) {
      return res.status(403).json({
        success: false,
        error: 'PARTNER_NOT_COUPON_ENABLED',
        message: '쿠폰 사용이 불가능한 가맹점입니다'
      });
    }

    // 3. 쿠폰 조회
    const userCouponResult = await connection.execute(`
      SELECT
        uc.id as user_coupon_id,
        uc.user_id,
        uc.coupon_id,
        uc.coupon_code,
        uc.status,
        uc.expires_at,
        c.code as campaign_code,
        c.name as coupon_name,
        c.target_type,
        c.target_categories,
        c.default_discount_type,
        c.default_discount_value,
        c.default_max_discount
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.coupon_code = ?
      LIMIT 1
    `, [coupon_code.toUpperCase()]);

    if (!userCouponResult.rows || userCouponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: '존재하지 않는 쿠폰 코드입니다'
      });
    }

    const userCoupon = userCouponResult.rows[0];

    // 4. 쿠폰 상태 확인
    if (userCoupon.status === 'USED') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_USED',
        message: '이미 사용된 쿠폰입니다'
      });
    }

    if (userCoupon.status !== 'ISSUED') {
      return res.status(400).json({
        success: false,
        error: 'COUPON_INVALID',
        message: '사용할 수 없는 쿠폰입니다'
      });
    }

    // 5. 유효기간 확인
    if (userCoupon.expires_at && new Date(userCoupon.expires_at) < new Date()) {
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

    // 6. target_type 확인
    if (userCoupon.target_type === 'CATEGORY') {
      const targetCategories = userCoupon.target_categories
        ? (typeof userCoupon.target_categories === 'string'
          ? JSON.parse(userCoupon.target_categories)
          : userCoupon.target_categories)
        : [];

      if (targetCategories.length > 0 && !targetCategories.includes(partner.category)) {
        return res.status(403).json({
          success: false,
          error: 'CATEGORY_NOT_MATCHED',
          message: '이 쿠폰은 해당 카테고리에서 사용할 수 없습니다'
        });
      }
    }

    if (userCoupon.target_type === 'SPECIFIC') {
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

    // 7. 할인 설정 결정 (파트너별 설정 우선)
    let discountType = userCoupon.default_discount_type;
    let discountValue = userCoupon.default_discount_value;
    let maxDiscount = userCoupon.default_max_discount;
    let minOrder = 0;

    if (partner.coupon_discount_type && partner.coupon_discount_value) {
      discountType = partner.coupon_discount_type;
      discountValue = partner.coupon_discount_value;
      maxDiscount = partner.coupon_max_discount || maxDiscount;
      minOrder = partner.coupon_min_order || 0;
    }

    // 8. 최소 주문 금액 확인
    if (minOrder > 0 && order_amount < minOrder) {
      return res.status(400).json({
        success: false,
        error: 'MIN_ORDER_NOT_MET',
        message: `최소 주문 금액은 ${minOrder.toLocaleString()}원입니다`
      });
    }

    // 9. 할인 계산
    const discountAmount = calculateDiscount(order_amount, discountType, discountValue, maxDiscount);
    const finalAmount = order_amount - discountAmount;

    // 10. 쿠폰 사용 처리
    await connection.execute(`
      UPDATE user_coupons
      SET
        status = 'USED',
        used_at = NOW(),
        used_partner_id = ?,
        order_amount = ?,
        discount_amount = ?,
        final_amount = ?,
        review_submitted = FALSE
      WHERE id = ?
    `, [partnerId, order_amount, discountAmount, finalAmount, userCoupon.user_coupon_id]);

    // 11. 파트너 통계 업데이트
    await connection.execute(`
      UPDATE partners
      SET
        total_coupon_usage = COALESCE(total_coupon_usage, 0) + 1,
        total_discount_given = COALESCE(total_discount_given, 0) + ?
      WHERE id = ?
    `, [discountAmount, partnerId]);

    // 12. 쿠폰 사용 카운트 업데이트
    await connection.execute(`
      UPDATE coupons
      SET used_count = COALESCE(used_count, 0) + 1
      WHERE id = ?
    `, [userCoupon.coupon_id]);

    console.log(`✅ [Coupon] 쿠폰 사용 완료: code=${coupon_code}, partner=${partner.business_name}, order=${order_amount}, discount=${discountAmount}`);

    // 13. 응답
    return res.status(200).json({
      success: true,
      message: '쿠폰이 정상적으로 사용되었습니다',
      data: {
        coupon_code: userCoupon.coupon_code,
        coupon_name: userCoupon.coupon_name,
        partner_name: partner.business_name,
        order_amount: order_amount,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        used_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Use] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 사용 처리 중 오류가 발생했습니다'
    });
  }
}

// 파트너 인증 필수
module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
