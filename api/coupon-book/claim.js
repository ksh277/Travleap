const { connect } = require('@planetscale/database');

/**
 * 쿠폰북 무료 쿠폰 발급 API (QR 스캔 후)
 * POST /api/coupon-book/claim
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'POST 요청만 허용됩니다'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const { campaignId, userId } = req.body;

    if (!campaignId || !userId) {
      return res.status(400).json({
        success: false,
        message: '캠페인 ID와 사용자 ID가 필요합니다'
      });
    }

    console.log(`[Coupon Book] Claim request: campaign=${campaignId}, user=${userId}`);

    // 캠페인 정보 조회
    const campaignResult = await connection.execute(`
      SELECT
        cbc.id,
        cbc.coupon_id,
        cbc.max_claims,
        cbc.current_claims,
        cbc.valid_from,
        cbc.valid_until,
        cbc.is_active,
        c.code as coupon_code,
        c.name as coupon_name,
        c.discount_type,
        c.discount_value,
        c.valid_until as coupon_expires_at,
        c.usage_per_user
      FROM coupon_book_campaigns cbc
      JOIN coupons c ON cbc.coupon_id = c.id
      WHERE cbc.id = ?
    `, [campaignId]);

    if (!campaignResult.rows || campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '캠페인을 찾을 수 없습니다'
      });
    }

    const campaign = campaignResult.rows[0];

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

    // 이미 발급받았는지 확인
    const existingResult = await connection.execute(`
      SELECT id FROM user_coupons
      WHERE user_id = ? AND coupon_id = ? AND campaign_id = ?
    `, [userId, campaign.coupon_id, campaignId]);

    if (existingResult.rows && existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_CLAIMED',
        message: '이미 발급받은 쿠폰입니다'
      });
    }

    // 쿠폰 발급 코드 생성 (개인별 고유 코드)
    const userCouponCode = `${campaign.coupon_code}-${userId.toString().slice(-4)}-${Date.now().toString(36).toUpperCase()}`;

    // 만료일 계산 (쿠폰 만료일 또는 30일 후)
    let expiresAt = campaign.coupon_expires_at;
    if (!expiresAt) {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      expiresAt = thirtyDaysLater.toISOString().slice(0, 19).replace('T', ' ');
    }

    // user_coupons에 발급 기록
    await connection.execute(`
      INSERT INTO user_coupons (
        user_id, coupon_id, coupon_code, status,
        issued_at, expires_at, claim_source, campaign_id
      ) VALUES (?, ?, ?, 'issued', NOW(), ?, 'qr_poster', ?)
    `, [userId, campaign.coupon_id, userCouponCode, expiresAt, campaignId]);

    // 캠페인 발급 수 증가
    await connection.execute(`
      UPDATE coupon_book_campaigns
      SET current_claims = current_claims + 1
      WHERE id = ?
    `, [campaignId]);

    // user_rewards 테이블에 사용자 초기화 (없으면 생성)
    try {
      await connection.execute(`
        INSERT IGNORE INTO user_rewards (user_id, total_points, coupon_usage_count)
        VALUES (?, 0, 0)
      `, [userId]);
    } catch (e) {
      console.warn('user_rewards insert ignored:', e.message);
    }

    console.log(`[Coupon Book] Coupon claimed successfully: ${userCouponCode}`);

    return res.status(200).json({
      success: true,
      message: '쿠폰이 발급되었습니다',
      coupon: {
        code: userCouponCode,
        name: campaign.coupon_name,
        discount_type: campaign.discount_type,
        discount_value: campaign.discount_value,
        expires_at: expiresAt
      }
    });

  } catch (error) {
    console.error('[Coupon Book] Claim error:', error);
    return res.status(500).json({
      success: false,
      message: '쿠폰 발급 중 오류가 발생했습니다'
    });
  }
};
