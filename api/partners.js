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
    // 🔧 쿼리 파라미터로 partner_type 필터링 가능
    const { type } = req.query || {};

    // 활성화되고 승인된 파트너만 조회 (is_active = 1, status = 'approved')
    // type 파라미터가 있으면 해당 타입만, 없으면 렌트카 제외
    let query = `
      SELECT
        p.id, p.user_id, p.business_name, p.contact_name, p.email, p.phone,
        p.business_address, p.location, p.services, p.base_price, p.base_price_text,
        p.detailed_address, p.description, p.business_hours,
        p.duration, p.min_age, p.max_capacity, p.language,
        p.tier, p.partner_type, p.is_verified, p.is_featured,
        p.is_active, p.status, p.lat, p.lng, p.images, p.created_at, p.updated_at
      FROM partners p
      WHERE p.is_active = 1
        AND p.status = 'approved'
    `;

    if (type === 'rentcar') {
      // 렌트카 파트너만 조회
      query += ` AND p.partner_type = 'rentcar'`;
    } else if (!type) {
      // 타입 지정 없으면 렌트카 제외 (기존 동작 유지)
      query += ` AND p.partner_type != 'rentcar'`;
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
    console.log(`✅ Partners API: ${partners.length}개 파트너 조회 성공 (type: ${type || 'all except rentcar'})`);

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
