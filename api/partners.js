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
    const result = await connection.execute(`
      SELECT p.*
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
