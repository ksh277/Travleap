/**
 * 보험 조회 API (사용자용)
 * GET /api/insurance?category=rentcar - 특정 카테고리의 활성화된 보험 조회
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

  const { category } = req.query;

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    let query = `
      SELECT id, name, category, price, coverage_amount, description, coverage_details
      FROM insurances
      WHERE is_active = 1
    `;

    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY price ASC`;

    const result = await connection.execute(query, params);

    const insurances = (result.rows || []).map(insurance => ({
      ...insurance,
      coverage_details: typeof insurance.coverage_details === 'string'
        ? JSON.parse(insurance.coverage_details)
        : insurance.coverage_details
    }));

    console.log(`✅ 보험 조회 성공: ${insurances.length}개 (category: ${category || 'all'})`);

    return res.status(200).json({
      success: true,
      data: insurances
    });
  } catch (error) {
    console.error('❌ Insurance API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
