/**
 * 관리자 - 보험 관리 API
 * GET /api/admin/insurance - 모든 보험 조회
 * POST /api/admin/insurance - 새 보험 추가
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // TODO: 관리자 권한 체크
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // if (!token || !isAdmin(token)) {
  //   return res.status(403).json({ success: false, error: 'Unauthorized' });
  // }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // 모든 보험 조회
      const result = await connection.execute(`
        SELECT * FROM insurances
        ORDER BY category, is_active DESC, created_at DESC
      `);

      const insurances = (result.rows || []).map(insurance => ({
        ...insurance,
        coverage_details: typeof insurance.coverage_details === 'string'
          ? JSON.parse(insurance.coverage_details)
          : insurance.coverage_details
      }));

      console.log(`✅ 보험 목록 조회: ${insurances.length}개`);

      return res.status(200).json({
        success: true,
        data: insurances
      });
    }

    if (req.method === 'POST') {
      // 새 보험 추가
      const {
        name,
        category,
        price,
        coverage_amount,
        description,
        coverage_details,
        is_active = true
      } = req.body;

      // 유효성 검사
      if (!name || !category || price === undefined || coverage_amount === undefined || !description) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 보험 추가
      const result = await connection.execute(`
        INSERT INTO insurances (
          name, category, price, coverage_amount, description,
          coverage_details, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        name,
        category,
        price,
        coverage_amount,
        description,
        JSON.stringify(coverage_details),
        is_active ? 1 : 0
      ]);

      console.log(`✅ 보험 추가 완료: ${name} (ID: ${result.insertId})`);

      return res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          name,
          category,
          price,
          coverage_amount,
          description,
          coverage_details,
          is_active
        }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Insurance API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
