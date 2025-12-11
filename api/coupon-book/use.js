/**
 * 쿠폰북 - 쿠폰 사용처리 API
 * POST /api/coupon-book/use
 *
 * 가맹점 직원이 고객 휴대폰에서 직접 "사용처리" 버튼을 누르는 방식
 * - 파트너 로그인 불필요
 * - 주문금액 입력 불필요
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 인증 확인 (쿠폰 소유자 본인 확인)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  let userId;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
  }

  try {
    const { couponId, couponCode } = req.body;

    if (!couponId && !couponCode) {
      return res.status(400).json({
        success: false,
        error: '쿠폰 ID 또는 쿠폰 코드가 필요합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 쿠폰 조회 (본인 소유, claim_source='coupon_book', status='ISSUED')
    let couponQuery;
    let couponParams;

    if (couponId) {
      couponQuery = `
        SELECT uc.id, uc.coupon_code, uc.status, uc.expires_at, uc.used_partner_id,
               p.business_name as partner_name,
               p.coupon_discount_type, p.coupon_discount_value,
               p.coupon_max_discount, p.coupon_min_order
        FROM user_coupons uc
        LEFT JOIN partners p ON uc.used_partner_id = p.id
        WHERE uc.id = ? AND uc.user_id = ? AND uc.claim_source = 'coupon_book'
      `;
      couponParams = [couponId, userId];
    } else {
      couponQuery = `
        SELECT uc.id, uc.coupon_code, uc.status, uc.expires_at, uc.used_partner_id,
               p.business_name as partner_name,
               p.coupon_discount_type, p.coupon_discount_value,
               p.coupon_max_discount, p.coupon_min_order
        FROM user_coupons uc
        LEFT JOIN partners p ON uc.used_partner_id = p.id
        WHERE uc.coupon_code = ? AND uc.user_id = ? AND uc.claim_source = 'coupon_book'
      `;
      couponParams = [couponCode, userId];
    }

    const couponResult = await connection.execute(couponQuery, couponParams);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '쿠폰을 찾을 수 없습니다.'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 상태 확인
    if (coupon.status === 'USED') {
      return res.status(400).json({
        success: false,
        error: '이미 사용된 쿠폰입니다.'
      });
    }

    if (coupon.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        error: '만료된 쿠폰입니다.'
      });
    }

    // 3. 만료일 확인
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      // 만료 처리
      await connection.execute(`
        UPDATE user_coupons SET status = 'EXPIRED' WHERE id = ?
      `, [coupon.id]);

      return res.status(400).json({
        success: false,
        error: '유효기간이 만료된 쿠폰입니다.'
      });
    }

    // 4. 사용 처리
    const usedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`
      UPDATE user_coupons
      SET status = 'USED', used_at = ?
      WHERE id = ?
    `, [usedAt, coupon.id]);

    // 5. 할인 정보 텍스트 생성
    let discountText = '';
    if (coupon.coupon_discount_type === 'percent') {
      discountText = `${coupon.coupon_discount_value}% 할인`;
      if (coupon.coupon_max_discount) {
        discountText += ` (최대 ${Number(coupon.coupon_max_discount).toLocaleString()}원)`;
      }
    } else if (coupon.coupon_discount_value) {
      discountText = `${Number(coupon.coupon_discount_value).toLocaleString()}원 할인`;
    }

    return res.status(200).json({
      success: true,
      message: '쿠폰이 사용되었습니다!',
      data: {
        couponId: coupon.id,
        couponCode: coupon.coupon_code,
        partner: {
          id: coupon.used_partner_id,
          name: coupon.partner_name
        },
        discount: discountText,
        usedAt: usedAt
      }
    });

  } catch (error) {
    console.error('[CouponBook Use] Error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
