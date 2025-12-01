/**
 * 마이페이지 쿠폰함 API
 * GET /api/my/coupons
 *
 * 사용자가 발급받은 쿠폰 목록 조회
 * - 연동 쿠폰 (coupon_master) - 상품 결제 시 발급
 * - 캠페인 쿠폰 (user_coupons) - QR/알림톡으로 발급
 * - 상태별 필터: all, issued/active, used, expired
 * - type 필터: all, integrated, campaign
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

    const { status = 'all', type = 'all' } = req.query;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://travleap.vercel.app';
    const now = new Date();
    let allCoupons = [];

    // ========== 1. 연동 쿠폰 조회 (coupon_master) ==========
    if (type === 'all' || type === 'integrated') {
      let integratedQuery = `
        SELECT
          cm.*,
          (SELECT COUNT(*) FROM integrated_coupon_usage WHERE coupon_id = cm.id) as used_count,
          p.business_name as target_merchant_name,
          l.title as listing_title
        FROM coupon_master cm
        LEFT JOIN partners p ON cm.target_merchant_id = p.id
        LEFT JOIN listings l ON cm.listing_id = l.id
        WHERE cm.user_id = ?
      `;

      if (status === 'issued' || status === 'active') {
        integratedQuery += ` AND cm.status = 'ACTIVE' AND cm.expires_at > NOW()`;
      } else if (status === 'used') {
        integratedQuery += ` AND cm.status = 'FULLY_USED'`;
      } else if (status === 'expired') {
        integratedQuery += ` AND (cm.status = 'EXPIRED' OR cm.expires_at <= NOW())`;
      }

      integratedQuery += ` ORDER BY cm.created_at DESC`;

      const integratedResult = await connection.execute(integratedQuery, [userId]);

      for (const coupon of (integratedResult.rows || [])) {
        const expiresAt = new Date(coupon.expires_at);
        const isExpired = now > expiresAt;
        const usedCount = parseInt(coupon.used_count) || 0;

        allCoupons.push({
          id: coupon.id,
          coupon_type: 'integrated', // 연동 쿠폰
          coupon_sub_type: coupon.coupon_type || 'INTEGRATED', // INTEGRATED, SINGLE, PRODUCT
          coupon_code: coupon.code,
          status: isExpired ? 'EXPIRED' : coupon.status,
          is_valid: !isExpired && coupon.status === 'ACTIVE',
          // 쿠폰 정보
          coupon_name: coupon.name,
          coupon_description: coupon.description,
          region_name: coupon.region_name,
          // 타입별 정보
          listing_id: coupon.listing_id,
          listing_title: coupon.listing_title,
          target_merchant_id: coupon.target_merchant_id,
          target_merchant_name: coupon.target_merchant_name,
          // 할인 정보 (가맹점별로 다름)
          discount_type: 'VARIABLE',
          discount_value: null,
          max_discount: null,
          // 유효기간
          valid_from: coupon.created_at,
          valid_until: coupon.expires_at,
          // 사용 현황
          total_merchants: coupon.total_merchants || 0,
          used_merchants: usedCount,
          remaining_merchants: Math.max(0, (coupon.total_merchants || 0) - usedCount),
          // QR URL
          qr_url: coupon.qr_url || `${siteUrl}/coupon/${coupon.code}`,
          // 연동 정보
          order_id: coupon.order_id,
          created_at: coupon.created_at
        });
      }
    }

    // ========== 2. 캠페인 쿠폰 조회 (user_coupons) ==========
    if (type === 'all' || type === 'campaign') {
      // 쿼리 조건 설정
      let statusCondition = '';
      if (status === 'issued' || status === 'active') {
        statusCondition = "AND uc.status = 'ISSUED'";
      } else if (status === 'used') {
        statusCondition = "AND uc.status = 'USED'";
      } else if (status === 'expired') {
        statusCondition = "AND uc.status = 'EXPIRED'";
      }

      // 캠페인 쿠폰 목록 조회
      const couponsResult = await connection.execute(`
      SELECT
        uc.id,
        uc.coupon_code,
        uc.status,
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
        uc.id DESC
    `, [userId]);

    const coupons = couponsResult.rows || [];

      // 만료 체크 및 상태 업데이트
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

        const qrUrl = `${siteUrl}/partner/coupon?code=${coupon.coupon_code}`;

        allCoupons.push({
          id: coupon.id,
          coupon_type: 'campaign', // 캠페인 쿠폰
          coupon_code: coupon.coupon_code,
          status: currentStatus,
          is_valid: currentStatus === 'ISSUED',
          issued_at: null,
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
          qr_url: qrUrl,
          created_at: null
        });
      }
    }

    // ========== 3. 정렬 및 응답 ==========
    // 정렬: 유효한 쿠폰 먼저, 그 다음 생성일 최신순
    allCoupons.sort((a, b) => {
      if (a.is_valid && !b.is_valid) return -1;
      if (!a.is_valid && b.is_valid) return 1;
      // created_at이 있으면 최신순 정렬
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    // 통계
    const stats = {
      total: allCoupons.length,
      active: allCoupons.filter(c => c.is_valid).length,
      integrated: allCoupons.filter(c => c.coupon_type === 'integrated').length,
      campaign: allCoupons.filter(c => c.coupon_type === 'campaign').length,
      issued: allCoupons.filter(c => c.status === 'ISSUED' || c.status === 'ACTIVE').length,
      used: allCoupons.filter(c => c.status === 'USED' || c.status === 'FULLY_USED').length,
      expired: allCoupons.filter(c => c.status === 'EXPIRED').length
    };

    console.log(`✅ [My Coupons] ${allCoupons.length}개 쿠폰 조회 (user=${userId}, integrated=${stats.integrated}, campaign=${stats.campaign})`);

    return res.status(200).json({
      success: true,
      data: allCoupons,
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
