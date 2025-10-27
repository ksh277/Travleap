const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 🛑 Toss 심사용: 팝업만 활성화
    // 나중에 WHERE 조건 제거하면 전체 카테고리 활성화됨
    const result = await connection.execute(`
      SELECT * FROM categories
      WHERE is_active = 1 AND slug = 'popup'
      ORDER BY sort_order ASC
    `);

    return res.status(200).json({
      success: true,
      categories: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ success: false, message: '카테고리 조회 실패', categories: [] });
  }
};
