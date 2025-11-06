/**
 * 디버깅용 API - 데이터베이스 테이블 구조 확인
 * GET /api/debug/check-tables
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
  const results = {};

  const tablesToCheck = ['listings', 'categories', 'partners'];

  for (const tableName of tablesToCheck) {
    results[tableName] = {};

    try {
      // 1. 테이블 존재 확인
      const tableExistsResult = await connection.execute(
        `SHOW TABLES LIKE '${tableName}'`
      );

      if (!tableExistsResult.rows || tableExistsResult.rows.length === 0) {
        results[tableName].exists = false;
        results[tableName].error = 'Table does not exist';
        continue;
      }

      results[tableName].exists = true;

      // 2. 테이블 구조 확인
      const columnsResult = await connection.execute(`DESCRIBE ${tableName}`);
      results[tableName].columns = columnsResult.rows || [];

      // 3. 데이터 개수 확인
      const countResult = await connection.execute(
        `SELECT COUNT(*) as total FROM ${tableName}`
      );
      results[tableName].totalRecords = countResult.rows?.[0]?.total || 0;

      // 4. 샘플 데이터
      if (results[tableName].totalRecords > 0) {
        const sampleResult = await connection.execute(
          `SELECT * FROM ${tableName} LIMIT 2`
        );
        results[tableName].sampleData = sampleResult.rows || [];
      }

      // 5. listings 테이블 특별 확인
      if (tableName === 'listings' && results[tableName].totalRecords > 0) {
        try {
          const publishedResult = await connection.execute(
            `SELECT COUNT(*) as count FROM listings WHERE is_published = 1`
          );
          results[tableName].publishedCount = publishedResult.rows?.[0]?.count || 0;

          const activeResult = await connection.execute(
            `SELECT COUNT(*) as count FROM listings WHERE is_active = 1`
          );
          results[tableName].activeCount = activeResult.rows?.[0]?.count || 0;

          const bothResult = await connection.execute(
            `SELECT COUNT(*) as count FROM listings WHERE is_published = 1 AND is_active = 1`
          );
          results[tableName].publishedAndActiveCount = bothResult.rows?.[0]?.count || 0;

          // 카테고리별 개수
          const categoryResult = await connection.execute(
            `SELECT c.slug, c.name_ko, COUNT(l.id) as count
             FROM listings l
             LEFT JOIN categories c ON l.category_id = c.id
             WHERE l.is_published = 1 AND is_active = 1
             GROUP BY c.id, c.slug, c.name_ko`
          );
          results[tableName].byCategory = categoryResult.rows || [];
        } catch (e) {
          results[tableName].analysisError = e.message;
        }
      }

      // 6. partners 테이블 특별 확인
      if (tableName === 'partners' && results[tableName].totalRecords > 0) {
        try {
          const typeResult = await connection.execute(
            `SELECT partner_type, COUNT(*) as count FROM partners GROUP BY partner_type`
          );
          results[tableName].byPartnerType = typeResult.rows || [];

          const lodgingResult = await connection.execute(
            `SELECT COUNT(*) as count FROM partners WHERE partner_type = 'lodging'`
          );
          results[tableName].lodgingCount = lodgingResult.rows?.[0]?.count || 0;
        } catch (e) {
          results[tableName].analysisError = e.message;
        }
      }

    } catch (error) {
      results[tableName].error = error.message;
    }
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
    results
  });
};
