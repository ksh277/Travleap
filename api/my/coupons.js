/**
 * 마이페이지 쿠폰함 API
 * GET /api/my/coupons
 *
 * 사용자가 발급받은 쿠폰 목록 조회
 * - 상태별 필터: all, issued, used, expired
 * - QR URL 포함
 */

const { connect } = require('@planetscale/database');
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

  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    const { status = 'all' } = req.query;

    // 쿼리 조건 설정
    let statusCondition = '';
    if (status === 'issued') {
      statusCondition = "AND uc.status = 'ISSUED'";
    } else if (status === 'used') {
      statusCondition = "AND uc.status = 'USED'";
    } else if (status === 'expired') {
      statusCondition = "AND uc.status = 'EXPIRED'";
    }

    // 사용자 쿠폰 목록 조회
    const couponsResult = await connection.execute(`
      SELECT
        uc.id,
        uc.coupon_code,
        uc.status,
        uc.created_at as issued_at,
        uc.used_at,
        uc.order_amount,
        uc.discount_amount,
        uc.final_amount,
        uc.used_partner_id,
        c.id as campaign_id,
        c.code as campaign_code,
        c.name as coupon_name,
        c.title as coupon_title,
        c.description as coupon_description,
        c.discount_type,
        c.discount_value,
        c.max_discount,
        c.valid_from,
        c.valid_until,
        c.target_type,
        c.target_categories,
        p.business_name as used_partner_name
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN partners p ON uc.used_partner_id = p.id
      WHERE uc.user_id = ?
      ${statusCondition}
      ORDER BY
        CASE uc.status
          WHEN 'ISSUED' THEN 1
          WHEN 'USED' THEN 2
          WHEN 'EXPIRED' THEN 3
          ELSE 4
        END,
        uc.created_at DESC
    `, [userId]);

    const coupons = couponsResult.rows || [];

    // 만료 체크 및 상태 업데이트
    const now = new Date();
    const processedCoupons = [];

    for (const coupon of coupons) {
      let currentStatus = coupon.status;

      // ISSUED 상태인데 유효기간 지났으면 EXPIRED로 변경
      if (currentStatus === 'ISSUED' && coupon.valid_until) {
        const validUntil = new Date(coupon.valid_until);
        if (validUntil < now) {
          currentStatus = 'EXPIRED';
          // DB 업데이트
          await connection.execute(
            'UPDATE user_coupons SET status = "EXPIRED" WHERE id = ?',
            [coupon.id]
          );
        }
      }

      // QR URL 생성
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://travleap.vercel.app';
      const qrUrl = `${siteUrl}/partner/coupon?code=${coupon.coupon_code}`;

      processedCoupons.push({
        id: coupon.id,
        coupon_code: coupon.coupon_code,
        status: currentStatus,
        issued_at: coupon.issued_at,
        used_at: coupon.used_at,
        // 캠페인 정보
        campaign_code: coupon.campaign_code,
        coupon_name: coupon.coupon_name || coupon.coupon_title,
        coupon_description: coupon.coupon_description,
        // 할인 정보
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount: coupon.max_discount,
        // 유효기간
        valid_from: coupon.valid_from,
        valid_until: coupon.valid_until,
        // 사용 대상
        target_type: coupon.target_type,
        target_categories: coupon.target_categories,
        // 사용 정보 (사용된 경우)
        used_info: currentStatus === 'USED' ? {
          partner_name: coupon.used_partner_name,
          order_amount: coupon.order_amount,
          discount_amount: coupon.discount_amount,
          final_amount: coupon.final_amount
        } : null,
        // QR URL
        qr_url: qrUrl
      });
    }

    // 통계
    const stats = {
      total: processedCoupons.length,
      issued: processedCoupons.filter(c => c.status === 'ISSUED').length,
      used: processedCoupons.filter(c => c.status === 'USED').length,
      expired: processedCoupons.filter(c => c.status === 'EXPIRED').length
    };

    console.log(`✅ [My Coupons] ${processedCoupons.length}개 쿠폰 조회 (user=${userId})`);

    return res.status(200).json({
      success: true,
      data: processedCoupons,
      stats
    });

  } catch (error) {
    console.error('❌ [My Coupons] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 조회 중 오류가 발생했습니다'
    });
  }
}

// 로그인 필수
module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
