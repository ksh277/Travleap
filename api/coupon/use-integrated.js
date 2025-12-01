/**
 * 연동 쿠폰 사용 API
 * POST /api/coupon/use-integrated
 *
 * 가맹점에서 연동 쿠폰(coupon_master)을 사용할 때 호출
 * - 같은 가맹점에서는 1회만 사용 가능 (UNIQUE constraint)
 * - 할인 금액 계산 및 기록
 * - 캠페인 쿠폰과 별도로 관리
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

/**
 * 할인 금액 계산
 */
function calculateDiscount(orderAmount, discountType, discountValue, maxDiscount) {
  let discountAmount = 0;
  const type = (discountType || '').toUpperCase();

  if (type === 'PERCENT' || type === 'PERCENTAGE') {
    discountAmount = Math.floor(orderAmount * (discountValue / 100));
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  } else if (type === 'AMOUNT' || type === 'FIXED') {
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

    // 2. 파트너 정보 및 할인 규칙 조회
    const partnerResult = await connection.execute(`
      SELECT
        p.*,
        COALESCE(mcr.discount_type, p.coupon_discount_type, 'PERCENT') as rule_discount_type,
        COALESCE(mcr.discount_value, p.coupon_discount_value, 10) as rule_discount_value,
        COALESCE(mcr.max_discount, p.coupon_max_discount, 10000) as rule_max_discount,
        COALESCE(mcr.min_order, p.coupon_min_order, 0) as rule_min_order
      FROM partners p
      LEFT JOIN merchant_coupon_rules mcr ON p.id = mcr.merchant_id AND mcr.is_active = 1
      WHERE p.id = ?
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

    // 3. 연동 쿠폰 조회 (coupon_master)
    const couponResult = await connection.execute(`
      SELECT * FROM coupon_master
      WHERE code = ? AND status = 'ACTIVE'
    `, [coupon_code.toUpperCase()]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: '유효한 쿠폰을 찾을 수 없습니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 4. 유효기간 확인
    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);
    if (now > expiresAt) {
      await connection.execute(
        'UPDATE coupon_master SET status = "EXPIRED" WHERE id = ?',
        [coupon.id]
      );

      return res.status(400).json({
        success: false,
        error: 'COUPON_EXPIRED',
        message: '유효기간이 만료된 쿠폰입니다'
      });
    }

    // 4-1. 쿠폰 타입별 사용 가능 여부 확인
    const couponType = coupon.coupon_type || 'INTEGRATED';

    // SINGLE 타입: 특정 가맹점에서만 사용 가능
    if (couponType === 'SINGLE' && coupon.target_merchant_id) {
      if (parseInt(coupon.target_merchant_id) !== parseInt(partnerId)) {
        return res.status(400).json({
          success: false,
          error: 'MERCHANT_NOT_ALLOWED',
          message: '이 쿠폰은 지정된 가맹점에서만 사용 가능합니다'
        });
      }
    }

    // PRODUCT 타입: 특정 상품 관련 쿠폰 (여기서는 가맹점 사용이므로 일반적으로 허용)
    // 추후 listing_id와 가맹점의 연동 확인 로직 추가 가능

    // 5. 최소 주문 금액 확인
    if (order_amount < partner.rule_min_order) {
      return res.status(400).json({
        success: false,
        error: 'MIN_ORDER_NOT_MET',
        message: `최소 주문 금액은 ${partner.rule_min_order.toLocaleString()}원입니다`
      });
    }

    // 6. 이미 이 가맹점에서 사용했는지 확인
    const usageCheck = await connection.execute(`
      SELECT id FROM integrated_coupon_usage
      WHERE coupon_id = ? AND merchant_id = ?
    `, [coupon.id, partnerId]);

    if (usageCheck.rows && usageCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_USED_AT_MERCHANT',
        message: '이 가맹점에서는 이미 쿠폰을 사용했습니다'
      });
    }

    // 7. 할인 금액 계산
    const discountType = partner.rule_discount_type;
    const discountValue = parseFloat(partner.rule_discount_value);
    const maxDiscount = parseInt(partner.rule_max_discount);
    const discountAmount = calculateDiscount(order_amount, discountType, discountValue, maxDiscount);
    const finalAmount = order_amount - discountAmount;

    // 8. 사용 기록 저장
    const usageResult = await connection.execute(`
      INSERT INTO integrated_coupon_usage (
        coupon_id, user_id, merchant_id,
        discount_type, discount_value, order_amount, discount_amount, final_amount,
        used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      coupon.id,
      coupon.user_id,
      partnerId,
      discountType,
      discountValue,
      order_amount,
      discountAmount,
      finalAmount
    ]);

    const usageId = usageResult.insertId;

    // 9. 쿠폰 사용 카운트 업데이트
    await connection.execute(`
      UPDATE coupon_master
      SET used_merchants = used_merchants + 1,
          updated_at = NOW()
      WHERE id = ?
    `, [coupon.id]);

    // 10. 파트너 통계 업데이트
    try {
      await connection.execute(`
        UPDATE partners
        SET total_coupon_usage = COALESCE(total_coupon_usage, 0) + 1,
            total_discount_given = COALESCE(total_discount_given, 0) + ?
        WHERE id = ?
      `, [discountAmount, partnerId]);
    } catch (statsError) {
      console.warn('⚠️ [Coupon] 파트너 통계 업데이트 실패 (무시):', statsError.message);
    }

    // 11. 모든 가맹점에서 사용했는지 확인 → FULLY_USED로 변경
    const totalUsed = await connection.execute(`
      SELECT COUNT(*) as count FROM integrated_coupon_usage WHERE coupon_id = ?
    `, [coupon.id]);

    const usedCount = totalUsed.rows?.[0]?.count || 0;
    if (coupon.total_merchants > 0 && usedCount >= coupon.total_merchants) {
      await connection.execute(
        'UPDATE coupon_master SET status = "FULLY_USED" WHERE id = ?',
        [coupon.id]
      );
    }

    console.log(`✅ [Integrated Coupon] 사용 완료: ${coupon_code} @ ${partner.business_name} (할인: ${discountAmount}원)`);

    return res.status(200).json({
      success: true,
      message: '쿠폰이 사용되었습니다',
      data: {
        usage_id: usageId,
        coupon_code: coupon_code,
        coupon_name: coupon.name,
        coupon_type: couponType,
        partner_name: partner.business_name,
        order_amount: order_amount,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        used_at: new Date().toISOString(),
        can_write_review: true
      }
    });

  } catch (error) {
    console.error('❌ [Integrated Coupon Use] Error:', error);

    // UNIQUE constraint violation
    if (error.message && error.message.includes('Duplicate entry')) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_USED_AT_MERCHANT',
        message: '이 가맹점에서는 이미 쿠폰을 사용했습니다'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 사용 중 오류가 발생했습니다'
    });
  }
}

// 파트너 인증 필수
module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requirePartner: true }));
