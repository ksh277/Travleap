const { Pool } = require('@neondatabase/serverless');
const mysql = require('mysql2/promise');

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

  let mysqlConnection = null;

  try {
    console.log('🔧 렌트카 벤더 계정 수정 시작...');

    // 1. Neon PostgreSQL에서 users 테이블 확인
    const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      ['rentcar@vendor.com']
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'rentcar@vendor.com 계정을 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];
    console.log('✅ users 테이블 확인:', user);

    // 2. MySQL (PlanetScale)에서 partners 테이블 확인 및 수정
    const mysqlUrl = new URL(process.env.DATABASE_URL);
    mysqlConnection = await mysql.createConnection({
      host: mysqlUrl.hostname,
      user: mysqlUrl.username,
      password: mysqlUrl.password,
      database: mysqlUrl.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: true }
    });

    // 현재 상태 확인
    const [currentRows] = await mysqlConnection.execute(
      'SELECT id, user_id, partner_type, business_name FROM partners WHERE user_id = ?',
      [user.id]
    );

    console.log('현재 partners 테이블 상태:', currentRows);

    const currentPartnerType = currentRows[0]?.partner_type || 'NONE';
    let operation = '';

    if (currentRows.length === 0) {
      // partners 테이블에 row가 없으면 INSERT
      console.log('⚠️ partners 테이블에 row 없음 → INSERT 실행');

      await mysqlConnection.execute(
        `INSERT INTO partners (
          user_id,
          partner_type,
          business_name,
          business_number,
          contact_name,
          email,
          phone,
          status,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
        [
          user.id,
          'rentcar',
          '드림렌트카',
          null,
          user.name,
          user.email,
          '010-9999-9999'
        ]
      );

      operation = 'INSERT';
      console.log('✅ INSERT 완료');

    } else {
      // partners 테이블에 row가 있으면 UPDATE
      console.log('✅ partners 테이블에 row 존재 → UPDATE 실행');

      await mysqlConnection.execute(
        'UPDATE partners SET partner_type = ? WHERE user_id = ?',
        ['rentcar', user.id]
      );

      operation = 'UPDATE';
      console.log('✅ UPDATE 완료');
    }

    // 업데이트 후 확인
    const [verifyRows] = await mysqlConnection.execute(
      'SELECT id, user_id, partner_type, business_name FROM partners WHERE user_id = ?',
      [user.id]
    );

    console.log('수정 후 partners 테이블:', verifyRows);

    await mysqlConnection.end();

    return res.status(200).json({
      success: true,
      message: `rentcar@vendor.com의 partner_type이 rentcar로 ${operation === 'INSERT' ? '생성' : '수정'}되었습니다.`,
      data: {
        operation: operation,
        user: user,
        before: currentPartnerType,
        after: verifyRows[0]?.partner_type || 'UNKNOWN',
        partner: verifyRows[0]
      }
    });

  } catch (error) {
    console.error('❌ 오류:', error);
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message,
      stack: error.stack
    });
  }
};
