/**
 * 쿠폰북 - 쿠폰 다운로드 API
 * POST /api/coupon-book/download
 *
 * 파트너별 쿠폰 다운로드 (고유 코드 생성, 중복 방지)
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// 고유 쿠폰 코드 생성 (8자리 영숫자)
function generateCouponCode(prefix = 'CB') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix + '-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

  // 인증 확인
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
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({ success: false, error: '파트너 ID가 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 파트너 정보 확인 (is_coupon_partner=1인지)
    const partnerResult = await connection.execute(`
      SELECT
        id, business_name, business_type,
        coupon_discount_type, coupon_discount_value,
        coupon_max_discount, coupon_min_order
      FROM partners
      WHERE id = ? AND is_coupon_partner = 1 AND status = 'approved'
    `, [partnerId]);

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '쿠폰 참여 가맹점을 찾을 수 없습니다.'
      });
    }

    const partner = partnerResult.rows[0];

    // 2. 이미 해당 파트너 쿠폰을 받았는지 확인 (미사용 상태)
    const existingCoupon = await connection.execute(`
      SELECT id, coupon_code, status, expires_at
      FROM user_coupons
      WHERE user_id = ?
        AND used_partner_id = ?
        AND claim_source = 'coupon_book'
        AND status = 'ISSUED'
    `, [userId, partnerId]);

    if (existingCoupon.rows && existingCoupon.rows.length > 0) {
      const existing = existingCoupon.rows[0];
      return res.status(409).json({
        success: false,
        error: '이미 해당 가맹점 쿠폰을 보유하고 있습니다.',
        existingCoupon: {
          code: existing.coupon_code,
          expiresAt: existing.expires_at
        }
      });
    }

    // 3. 고유 쿠폰 코드 생성 (중복 체크)
    let couponCode;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      couponCode = generateCouponCode('CB');

      const codeCheck = await connection.execute(
        'SELECT id FROM user_coupons WHERE coupon_code = ?',
        [couponCode]
      );

      if (!codeCheck.rows || codeCheck.rows.length === 0) {
        break;
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({
        success: false,
        error: '쿠폰 코드 생성에 실패했습니다. 다시 시도해주세요.'
      });
    }

    // 4. 만료일 설정 (다운로드 후 30일)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // 5. user_coupons에 저장
    await connection.execute(`
      INSERT INTO user_coupons (
        user_id, coupon_id, coupon_code, status,
        issued_at, expires_at, claim_source, used_partner_id
      ) VALUES (?, NULL, ?, 'ISSUED', NOW(), ?, 'coupon_book', ?)
    `, [userId, couponCode, expiresAtStr, partnerId]);

    // 6. 할인 정보 텍스트 생성
    let discountText;
    if (partner.coupon_discount_type === 'percent') {
      discountText = `${partner.coupon_discount_value}% 할인`;
      if (partner.coupon_max_discount) {
        discountText += ` (최대 ${Number(partner.coupon_max_discount).toLocaleString()}원)`;
      }
    } else {
      discountText = `${Number(partner.coupon_discount_value).toLocaleString()}원 할인`;
    }

    if (partner.coupon_min_order) {
      discountText += ` · ${Number(partner.coupon_min_order).toLocaleString()}원 이상 주문 시`;
    }

    return res.status(201).json({
      success: true,
      message: '쿠폰이 발급되었습니다!',
      data: {
        couponCode,
        partner: {
          id: partner.id,
          name: partner.business_name,
          type: partner.business_type
        },
        discount: {
          type: partner.coupon_discount_type,
          value: partner.coupon_discount_value,
          maxDiscount: partner.coupon_max_discount,
          minOrder: partner.coupon_min_order,
          text: discountText
        },
        expiresAt: expiresAtStr
      }
    });

  } catch (error) {
    console.error('[CouponBook Download] Error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
