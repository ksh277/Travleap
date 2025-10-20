/**
 * 파트너 상세 조회 API
 * GET /api/partners/[id] - 특정 파트너 상세 정보 반환
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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Partner ID is required' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 파트너 상세 정보 조회
    const result = await connection.execute(`
      SELECT
        p.*,
        COUNT(DISTINCT l.id) as listing_count,
        COUNT(DISTINCT r.id) as review_count,
        AVG(r.rating) as avg_rating
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id
      LEFT JOIN reviews r ON l.id = r.listing_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '파트너를 찾을 수 없습니다.'
      });
    }

    const partner = result.rows[0];

    // images 필드 파싱 (JSON 문자열인 경우)
    if (partner.images && typeof partner.images === 'string') {
      try {
        partner.images = JSON.parse(partner.images);
      } catch (e) {
        partner.images = [];
      }
    }

    console.log(`✅ Partner Detail API: 파트너 ${id} 조회 성공`);

    return res.status(200).json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('❌ Partner Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: '파트너 정보를 불러오는데 실패했습니다.'
    });
  }
};
