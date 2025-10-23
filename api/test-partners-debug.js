/**
 * 파트너 DB 디버그 API
 * 정확한 에러 메시지와 데이터를 확인하기 위한 테스트 엔드포인트
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const debugInfo = {
    step: '',
    error: null,
    data: null,
    queries: []
  };

  try {
    // Step 1: 간단한 카운트
    debugInfo.step = 'Step 1: Count all partners';
    const countResult = await connection.execute('SELECT COUNT(*) as total FROM partners');
    debugInfo.queries.push({
      step: 1,
      query: 'SELECT COUNT(*) as total FROM partners',
      result: countResult.rows
    });

    // Step 2: 파트너 5개만 조회 (간단)
    debugInfo.step = 'Step 2: Select 5 partners (simple)';
    const simpleResult = await connection.execute('SELECT id, business_name, partner_type, is_active, status FROM partners LIMIT 5');
    debugInfo.queries.push({
      step: 2,
      query: 'SELECT id, business_name, partner_type, is_active, status FROM partners LIMIT 5',
      result: simpleResult.rows
    });

    // Step 3: LEFT JOIN 없이 조회
    debugInfo.step = 'Step 3: Select partners without JOIN';
    const noJoinResult = await connection.execute('SELECT * FROM partners LIMIT 3');
    debugInfo.queries.push({
      step: 3,
      query: 'SELECT * FROM partners LIMIT 3',
      result: noJoinResult.rows
    });

    // Step 4: LEFT JOIN with GROUP BY (문제의 쿼리)
    debugInfo.step = 'Step 4: LEFT JOIN with GROUP BY';
    const joinResult = await connection.execute(`
      SELECT
        p.*,
        COUNT(DISTINCT l.id) as listing_count
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id
      GROUP BY p.id
      LIMIT 3
    `);
    debugInfo.queries.push({
      step: 4,
      query: 'LEFT JOIN with GROUP BY',
      result: joinResult.rows
    });

    debugInfo.step = 'Success!';
    return res.status(200).json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    debugInfo.error = {
      message: error.message,
      stack: error.stack,
      code: error.code
    };

    return res.status(200).json({
      success: false,
      debug: debugInfo,
      errorAtStep: debugInfo.step
    });
  }
};
