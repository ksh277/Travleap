const mysql = require('mysql2/promise');

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

  let connection = null;

  try {
    // MySQL 연결
    const mysqlUrl = new URL(process.env.DATABASE_URL);
    connection = await mysql.createConnection({
      host: mysqlUrl.hostname,
      user: mysqlUrl.username,
      password: mysqlUrl.password,
      database: mysqlUrl.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: true }
    });

    console.log('🔧 deposit_krw 컬럼 추가 시작...');

    // 1. 컬럼 존재 여부 확인
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM rentcar_vehicles LIKE 'deposit_krw'
    `);

    if (columns.length > 0) {
      await connection.end();
      return res.status(200).json({
        success: true,
        message: 'deposit_krw 컬럼이 이미 존재합니다.',
        already_exists: true
      });
    }

    // 2. 컬럼 추가
    await connection.execute(`
      ALTER TABLE rentcar_vehicles
      ADD COLUMN deposit_krw INT DEFAULT 0 COMMENT '보증금 (원)' AFTER monthly_rate_krw
    `);

    console.log('✅ deposit_krw 컬럼 추가 완료');

    await connection.end();

    return res.status(200).json({
      success: true,
      message: 'deposit_krw 컬럼이 성공적으로 추가되었습니다.'
    });

  } catch (error) {
    console.error('❌ 오류:', error);
    if (connection) {
      await connection.end();
    }
    return res.status(500).json({
      success: false,
      error: '컬럼 추가 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
