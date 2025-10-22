const { Pool } = require('@neondatabase/serverless');

// Neon PostgreSQL connection
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = getPool();

    if (req.method === 'GET') {
      // 모든 사용자 조회
      console.log('👥 [Neon] 사용자 목록 조회');
      const result = await db.query(
        'SELECT id, username, email, name, phone, role, created_at, updated_at FROM users ORDER BY created_at DESC'
      );

      console.log('✅ [Neon] 사용자 조회 완료:', result.rows.length, '명');
      return res.status(200).json({
        success: true,
        data: result.rows
      });
    }

    if (req.method === 'POST') {
      // 사용자 생성 (관리자 전용)
      const { username, email, password, name, phone, role } = req.body;

      console.log('➕ [Neon] 사용자 생성:', email);

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, username, email, name, phone, role, created_at, updated_at`,
        [username, email, hashedPassword, name, phone || null, role || 'user']
      );

      console.log('✅ [Neon] 사용자 생성 완료:', result.rows[0].email);
      return res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    }

    if (req.method === 'PUT') {
      // 사용자 정보 수정
      const { id, name, phone, role } = req.body;

      console.log('✏️ [Neon] 사용자 수정:', id);

      const result = await db.query(
        `UPDATE users
         SET name = $1, phone = $2, role = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, username, email, name, phone, role, created_at, updated_at`,
        [name, phone, role, id]
      );

      console.log('✅ [Neon] 사용자 수정 완료:', result.rows[0]?.email);
      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    if (req.method === 'DELETE') {
      // 사용자 삭제
      const { id } = req.query;

      console.log('🗑️ [Neon] 사용자 삭제:', id);

      await db.query('DELETE FROM users WHERE id = $1', [id]);

      console.log('✅ [Neon] 사용자 삭제 완료');
      return res.status(200).json({
        success: true,
        message: '사용자가 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [Neon] 사용자 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.'
    });
  }
};
