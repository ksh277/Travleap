/**
 * 쿠폰 발급 API
 * POST /api/coupon/claim
 *
 * 로그인한 사용자가 쿠폰 코드(캠페인 코드)로 개인 쿠폰 발급
 * - 랜덤 개인 쿠폰 코드 생성
 * - 중복 발급 방지
 * - DB UNIQUE 제약으로 코드 중복 방지
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

/**
 * 랜덤 쿠폰 코드 생성 (8자리)
 * - 혼동 문자 제외: 0, O, 1, I, L
 * - 대문자 + 숫자 조합
 */
function generateCouponCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 중복되지 않는 쿠폰 코드 생성 (최대 10회 시도)
 */
async function generateUniqueCouponCode(connection) {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCouponCode();

    // 중복 체크
    const existing = await connection.execute(
      'SELECT id FROM user_coupons WHERE coupon_code = ? LIMIT 1',
      [code]
    );

    if (!existing.rows || existing.rows.length === 0) {
      return code; // 중복 없음, 사용 가능
    }

    console.log(`⚠️ 쿠폰 코드 중복, 재시도: ${code} (시도 ${attempt + 1}/${maxAttempts})`);
  }

  throw new Error('쿠폰 코드 생성 실패: 중복 코드가 너무 많습니다');
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
    const userId = req.user?.id || req.user?.userId;
    const { coupon_code } = req.body; // 캠페인/쿠폰 코드 (예: SHINAN2025)

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    if (!coupon_code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_COUPON_CODE',
        message: '쿠폰 코드를 입력해주세요'
      });
    }

    // 1. 쿠폰(캠페인) 조회
    const couponResult = await connection.execute(`
      SELECT
        id, code, name, description,
        target_type, target_categories,
        default_discount_type, default_discount_value, default_max_discount,
        valid_from, valid_to,
        usage_limit, current_usage, max_issues_per_user,
        is_active
      FROM coupons
      WHERE code = ? AND is_active = TRUE
      LIMIT 1
    `, [coupon_code.toUpperCase()]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: '유효하지 않은 쿠폰 코드입니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 유효기간 체크
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({
        success: false,
        error: 'COUPON_NOT_STARTED',
        message: '아직 시작되지 않은 쿠폰입니다'
      });
    }

    if (coupon.valid_to && new Date(coupon.valid_to) < now) {
      return res.status(400).json({
        success: false,
        error: 'COUPON_EXPIRED',
        message: '만료된 쿠폰입니다'
      });
    }

    // 3. 총 발급 수량 체크
    if (coupon.usage_limit && coupon.current_usage >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        error: 'COUPON_LIMIT_REACHED',
        message: '쿠폰 발급 수량이 모두 소진되었습니다'
      });
    }

    // 4. 1인당 발급 제한 체크
    const userCouponCount = await connection.execute(`
      SELECT COUNT(*) as count
      FROM user_coupons
      WHERE user_id = ? AND coupon_id = ?
    `, [userId, coupon.id]);

    const currentCount = userCouponCount.rows?.[0]?.count || 0;
    const maxPerUser = coupon.max_issues_per_user || 1;

    if (currentCount >= maxPerUser) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_ISSUED',
        message: '이미 발급받은 쿠폰입니다'
      });
    }

    // 5. 랜덤 개인 쿠폰 코드 생성 (중복 방지)
    const personalCouponCode = await generateUniqueCouponCode(connection);

    // 6. user_coupons에 발급
    const expiresAt = coupon.valid_to || null;

    await connection.execute(`
      INSERT INTO user_coupons (
        user_id, coupon_id, coupon_code, status, expires_at
      ) VALUES (?, ?, ?, 'ISSUED', ?)
    `, [userId, coupon.id, personalCouponCode, expiresAt]);

    // 7. 쿠폰 발급 카운트 증가
    await connection.execute(`
      UPDATE coupons
      SET current_usage = COALESCE(current_usage, 0) + 1
      WHERE id = ?
    `, [coupon.id]);

    console.log(`✅ [Coupon] 쿠폰 발급 완료: user=${userId}, code=${personalCouponCode}, coupon=${coupon.code}`);

    // 8. 응답
    return res.status(201).json({
      success: true,
      message: '쿠폰이 발급되었습니다',
      data: {
        coupon_code: personalCouponCode,
        coupon_name: coupon.name,
        coupon_description: coupon.description,
        discount_type: coupon.default_discount_type,
        discount_value: coupon.default_discount_value,
        max_discount: coupon.default_max_discount,
        expires_at: expiresAt,
        qr_url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/coupon/use?code=${personalCouponCode}`
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Claim] Error:', error);

    // 중복 키 에러 처리 (동시 발급 시도)
    if (error.message?.includes('Duplicate entry')) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_CODE',
        message: '쿠폰 발급 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 발급 중 오류가 발생했습니다'
    });
  }
}

// 인증 필요 (로그인 상태에서만 발급)
module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
