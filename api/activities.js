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

  // ⚠️ activities 테이블이 DB에 없음 - 빈 배열 반환으로 에러 로그 방지
  // TODO: activities 테이블 생성 시 아래 주석 해제
  /*
  try {
    const mysql = require('mysql2/promise');
    const mysqlUrl = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
      host: mysqlUrl.hostname,
      user: mysqlUrl.username,
      password: mysqlUrl.password,
      database: mysqlUrl.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: true }
    });

    const [rows] = await connection.execute(
      'SELECT * FROM activities WHERE is_active = 1 ORDER BY display_order ASC'
    );

    await connection.end();

    return res.status(200).json({
      success: true,
      activities: rows || []
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.status(200).json({
      success: true,
      activities: []
    });
  }
  */

  // 테이블이 없으므로 빈 배열 반환 (에러 로그 방지)
  return res.status(200).json({
    success: true,
    activities: []
  });
};
