/**
 * 쿠폰북 - 전체 쿠폰 다운로드 API
 * POST /api/coupon-book/download-all
 *
 * 모든 쿠폰북 파트너의 쿠폰을 한번에 발급
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
    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 모든 쿠폰북 파트너 조회
    const partnersResult = await connection.execute(`
      SELECT
        id, business_name, business_type,
        coupon_discount_type, coupon_discount_value,
        coupon_max_discount, coupon_min_order
      FROM partners
      WHERE is_coupon_partner = 1 AND status = 'approved'
    `);

    const partners = partnersResult.rows || [];

    if (partners.length === 0) {
      return res.status(404).json({
        success: false,
        error: '참여 가맹점이 없습니다.'
      });
    }

    // 2. 이미 보유중인 쿠폰 확인
    const existingResult = await connection.execute(`
      SELECT used_partner_id
      FROM user_coupons
      WHERE user_id = ?
        AND claim_source = 'coupon_book'
        AND status = 'ISSUED'
    `, [userId]);

    const existingPartnerIds = new Set(
      (existingResult.rows || []).map(row => row.used_partner_id)
    );

    // 3. 발급할 파트너 필터링 (이미 보유중인 파트너 제외)
    const partnersToIssue = partners.filter(p => !existingPartnerIds.has(p.id));

    if (partnersToIssue.length === 0) {
      return res.status(200).json({
        success: true,
        message: '이미 모든 쿠폰을 보유하고 있습니다.',
        data: {
          issued: 0,
          alreadyOwned: partners.length,
          coupons: []
        }
      });
    }

    // 4. 만료일 설정 (다운로드 후 30일)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // 5. 각 파트너별 쿠폰 발급
    const issuedCoupons = [];
    const errors = [];

    for (const partner of partnersToIssue) {
      try {
        // 고유 쿠폰 코드 생성
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
          errors.push({ partnerId: partner.id, error: '쿠폰 코드 생성 실패' });
          continue;
        }

        // user_coupons에 저장
        await connection.execute(`
          INSERT INTO user_coupons (
            user_id, coupon_id, coupon_code, status,
            issued_at, expires_at, claim_source, used_partner_id
          ) VALUES (?, NULL, ?, 'ISSUED', NOW(), ?, 'coupon_book', ?)
        `, [userId, couponCode, expiresAtStr, partner.id]);

        // 할인 정보 텍스트 생성
        let discountText;
        if (partner.coupon_discount_type === 'percent') {
          discountText = `${partner.coupon_discount_value}% 할인`;
          if (partner.coupon_max_discount) {
            discountText += ` (최대 ${Number(partner.coupon_max_discount).toLocaleString()}원)`;
          }
        } else {
          discountText = `${Number(partner.coupon_discount_value).toLocaleString()}원 할인`;
        }

        issuedCoupons.push({
          couponCode,
          partner: {
            id: partner.id,
            name: partner.business_name,
            type: partner.business_type
          },
          discountText,
          expiresAt: expiresAtStr
        });

      } catch (partnerError) {
        console.error(`[CouponBook DownloadAll] Partner ${partner.id} error:`, partnerError);
        errors.push({ partnerId: partner.id, error: partnerError.message });
      }
    }

    return res.status(201).json({
      success: true,
      message: `${issuedCoupons.length}개의 쿠폰이 발급되었습니다!`,
      data: {
        issued: issuedCoupons.length,
        alreadyOwned: existingPartnerIds.size,
        total: partners.length,
        coupons: issuedCoupons,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('[CouponBook DownloadAll] Error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
