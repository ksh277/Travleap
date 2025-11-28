/**
 * 가맹점(파트너) 목록 조회 API
 * GET /api/partners - 모든 활성화된 파트너 목록 반환
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 🔧 쿼리 파라미터로 partner_type, coupon_only 필터링 가능
    const { type, coupon_only } = req.query || {};

    // 활성화되고 승인된 파트너만 조회 (is_active = 1, status = 'approved')
    // type 파라미터가 있으면 해당 타입만, 없으면 렌트카/숙박 제외
    // coupon_only=true면 쿠폰 참여 파트너만
    let query = `
      SELECT
        p.id, p.user_id, p.business_name, p.contact_name, p.email, p.phone, p.mobile_phone,
        p.business_address, p.location, p.services, p.base_price, p.base_price_text,
        p.detailed_address, p.description, p.business_hours,
        p.duration, p.min_age, p.max_capacity, p.language,
        p.tier, p.partner_type, p.is_verified, p.is_featured,
        p.is_active, p.status, p.lat, p.lng, p.images, p.created_at, p.updated_at,
        p.is_coupon_partner, p.coupon_discount_type, p.coupon_discount_value, p.coupon_max_discount
      FROM partners p
      WHERE p.is_active = 1
        AND p.status = 'approved'
    `;

    // 쿠폰 가맹점만 필터
    if (coupon_only === 'true') {
      query += ` AND p.is_coupon_partner = 1`;
    }

    if (type === 'rentcar') {
      // 렌트카 파트너만 조회
      query += ` AND p.partner_type = 'rentcar'`;
    } else if (type === 'lodging') {
      // 숙박 파트너만 조회
      query += ` AND p.partner_type = 'lodging'`;
    } else if (!type) {
      // 타입 지정 없으면 렌트카/숙박 제외 (가맹점 페이지용 - NULL 포함)
      query += ` AND (p.partner_type NOT IN ('rentcar', 'lodging') OR p.partner_type IS NULL)`;
    } else {
      // 특정 타입 조회
      query += ` AND p.partner_type = ?`;
    }

    query += `
      ORDER BY
        p.is_featured DESC,
        p.created_at DESC
    `;

    const result = type && type !== 'rentcar'
      ? await connection.execute(query, [type])
      : await connection.execute(query);

    const partners = result.rows || [];
    console.log(`✅ Partners API: ${partners.length}개 파트너 조회 성공 (type: ${type || 'all except rentcar'}, coupon_only: ${coupon_only || 'false'})`);

    return res.status(200).json({
      success: true,
      data: partners
    });
  } catch (error) {
    console.error('❌ Partners API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
