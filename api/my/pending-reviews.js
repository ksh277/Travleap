/**
 * 대기 중인 리뷰 목록 조회 API
 * GET /api/my/pending-reviews
 *
 * 사용한 쿠폰 중 리뷰 미작성 목록 반환
 * - 사이트 입장 시 리뷰 모달 표시용
 * - 캠페인 쿠폰 + 쿠폰북 쿠폰 모두 포함
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
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    // 사용한 쿠폰 중 리뷰 미작성 목록 조회
    // 캠페인 쿠폰(coupon_id 있음) + 쿠폰북 쿠폰(claim_source='coupon_book') 모두 포함
    const result = await connection.execute(`
      SELECT
        uc.id as user_coupon_id,
        uc.coupon_code,
        uc.used_at,
        uc.order_amount,
        uc.discount_amount,
        uc.final_amount,
        uc.claim_source,
        p.id as partner_id,
        p.business_name as partner_name,
        p.business_address as partner_address,
        p.services as partner_category,
        p.coupon_discount_type,
        p.coupon_discount_value,
        p.coupon_max_discount,
        c.name as coupon_name,
        c.description as coupon_description,
        CASE
          WHEN uc.claim_source = 'coupon_book' THEN 'coupon_book'
          ELSE 'campaign'
        END as coupon_type
      FROM user_coupons uc
      LEFT JOIN partners p ON uc.used_partner_id = p.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
        AND uc.status = 'USED'
        AND (uc.review_submitted = FALSE OR uc.review_submitted IS NULL)
      ORDER BY uc.used_at DESC
      LIMIT 10
    `, [userId]);

    // 응답 데이터 가공 (쿠폰북 쿠폰용 할인 텍스트 추가)
    const pendingReviews = (result.rows || []).map(row => {
      // 쿠폰북 쿠폰인 경우 파트너 할인 정보로 쿠폰명/설명 생성
      if (row.claim_source === 'coupon_book' && !row.coupon_name) {
        let discountText = '';
        if (row.coupon_discount_type === 'percent') {
          discountText = `${row.coupon_discount_value}% 할인`;
          if (row.coupon_max_discount) {
            discountText += ` (최대 ${Number(row.coupon_max_discount).toLocaleString()}원)`;
          }
        } else if (row.coupon_discount_value) {
          discountText = `${Number(row.coupon_discount_value).toLocaleString()}원 할인`;
        }

        return {
          ...row,
          coupon_name: `${row.partner_name || '가맹점'} 쿠폰북 쿠폰`,
          coupon_description: discountText || '가맹점별 할인 적용'
        };
      }
      return row;
    });

    return res.status(200).json({
      success: true,
      data: pendingReviews,
      count: pendingReviews.length,
      message: pendingReviews.length > 0
        ? `리뷰 작성 대기 중인 쿠폰이 ${pendingReviews.length}개 있습니다`
        : '모든 리뷰를 작성했습니다'
    });

  } catch (error) {
    console.error('❌ [Pending Reviews] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '리뷰 목록 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
