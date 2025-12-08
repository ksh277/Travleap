const { connect } = require('@planetscale/database');

/**
 * 쿠폰북 캠페인 정보 조회 API
 * GET /api/coupon-book/campaign/:id
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'GET 요청만 허용됩니다'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const campaignId = req.query.id;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: '캠페인 ID가 필요합니다'
      });
    }

    console.log(`[Coupon Book] Fetching campaign: ${campaignId}`);

    // 캠페인 정보 조회
    const result = await connection.execute(`
      SELECT
        cbc.id,
        cbc.name,
        cbc.description,
        cbc.coupon_id,
        cbc.target_islands,
        cbc.max_claims,
        cbc.current_claims,
        cbc.valid_from,
        cbc.valid_until,
        cbc.is_active,
        c.code as coupon_code,
        c.name as coupon_name,
        c.discount_type,
        c.discount_value,
        c.valid_until as coupon_expires_at
      FROM coupon_book_campaigns cbc
      JOIN coupons c ON cbc.coupon_id = c.id
      WHERE cbc.id = ?
      LIMIT 1
    `, [campaignId]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '캠페인을 찾을 수 없습니다'
      });
    }

    const campaign = result.rows[0];

    // 유효성 검사
    const now = new Date();
    if (!campaign.is_active) {
      return res.status(400).json({
        success: false,
        message: '종료된 캠페인입니다'
      });
    }

    if (campaign.valid_from && new Date(campaign.valid_from) > now) {
      return res.status(400).json({
        success: false,
        message: '아직 시작되지 않은 캠페인입니다'
      });
    }

    if (campaign.valid_until && new Date(campaign.valid_until) < now) {
      return res.status(400).json({
        success: false,
        message: '종료된 캠페인입니다'
      });
    }

    if (campaign.max_claims && campaign.current_claims >= campaign.max_claims) {
      return res.status(400).json({
        success: false,
        message: '발급 수량이 모두 소진되었습니다'
      });
    }

    // 타겟 섬 파싱
    let targetIslands = [];
    try {
      if (campaign.target_islands) {
        targetIslands = JSON.parse(campaign.target_islands);
      }
    } catch (e) {
      console.warn('Failed to parse target_islands:', e);
    }

    return res.status(200).json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        coupon_name: campaign.coupon_name,
        discount_type: campaign.discount_type,
        discount_value: campaign.discount_value,
        expires_at: campaign.coupon_expires_at,
        target_islands: targetIslands,
        remaining: campaign.max_claims ? campaign.max_claims - campaign.current_claims : null
      }
    });

  } catch (error) {
    console.error('[Coupon Book] Campaign fetch error:', error);
    return res.status(500).json({
      success: false,
      message: '캠페인 정보를 불러오는데 실패했습니다'
    });
  }
};
