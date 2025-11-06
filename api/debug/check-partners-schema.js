/**
 * 디버깅용 API - partners 테이블 스키마 확인
 * GET /api/debug/check-partners-schema
 *
 * partners 테이블의 구조, 특히 partner_type 컬럼 확인
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
    console.log('🔍 [Check Schema] Checking partners table schema...');

    // partners 테이블 구조 확인
    const schemaResult = await connection.execute(`
      DESCRIBE partners
    `);

    const schema = schemaResult.rows || [];

    // partner_type 컬럼 찾기
    const partnerTypeCol = schema.find(col => col.Field === 'partner_type');

    // 현재 사용 중인 partner_type 값들 확인
    const valuesResult = await connection.execute(`
      SELECT DISTINCT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    const currentValues = valuesResult.rows || [];

    console.log('✅ [Check Schema] Schema check completed');

    return res.status(200).json({
      success: true,
      partnerTypeColumn: partnerTypeCol,
      currentPartnerTypes: currentValues,
      fullSchema: schema
    });

  } catch (error) {
    console.error('❌ [Check Schema] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
