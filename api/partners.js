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

    // 활성화된 파트너만 조회 (is_active = 1, status = 'approved')
    // images 필드 제외 - base64 이미지 때문에 DB sort 메모리 부족 에러 발생
    const result = await connection.execute(`
      SELECT
        p.id, p.user_id, p.business_name, p.contact_name, p.email, p.phone,
        p.business_address, p.location, p.services, p.base_price,
        p.detailed_address, p.description, p.business_hours,
        p.duration, p.min_age, p.max_capacity, p.language,
        p.tier, p.partner_type, p.is_verified, p.is_featured,
        p.is_active, p.status, p.lat, p.lng, p.created_at, p.updated_at
      FROM partners p
      WHERE p.is_active = 1 AND p.status = 'approved'
      ORDER BY
        p.is_featured DESC,
        p.created_at DESC
    `);

    console.log(`✅ Partners API: ${result.rows?.length || 0}개 파트너 조회 성공`);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('❌ Partners API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
