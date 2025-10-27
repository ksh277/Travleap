const mysql = require('mysql2/promise');

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let connection = null;

  try {
    // MySQL 연결 (mysql2 사용)
    const mysqlUrl = new URL(process.env.DATABASE_URL);
    connection = await mysql.createConnection({
      host: mysqlUrl.hostname,
      user: mysqlUrl.username,
      password: mysqlUrl.password,
      database: mysqlUrl.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: true }
    });

    const addedColumns = [];

    // weekly_rate_krw 컬럼 확인
    const [weeklyColumns] = await connection.execute(`
      SHOW COLUMNS FROM rentcar_vehicles LIKE 'weekly_rate_krw'
    `);

    if (weeklyColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN weekly_rate_krw INT DEFAULT NULL COMMENT '주간 요금 (원, NULL이면 일일요금*6 계산)'
      `);
      addedColumns.push('weekly_rate_krw');
    }

    // monthly_rate_krw 컬럼 확인
    const [monthlyColumns] = await connection.execute(`
      SHOW COLUMNS FROM rentcar_vehicles LIKE 'monthly_rate_krw'
    `);

    if (monthlyColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN monthly_rate_krw INT DEFAULT NULL COMMENT '월간 요금 (원, NULL이면 일일요금*25 계산)'
      `);
      addedColumns.push('monthly_rate_krw');
    }

    await connection.end();

    if (addedColumns.length > 0) {
      return res.status(200).json({
        success: true,
        message: `${addedColumns.join(', ')} 컬럼이 성공적으로 추가되었습니다.`,
        added_columns: addedColumns
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'weekly_rate_krw, monthly_rate_krw 컬럼이 이미 존재합니다.',
        already_exists: true
      });
    }

  } catch (error) {
    console.error('❌ [Add Columns] 오류:', error);

    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Connection close error:', closeError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
};
