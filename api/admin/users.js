const { Pool } = require('@neondatabase/serverless');
const { maskForLog } = require('../../utils/pii-masking');

// Neon PostgreSQL connection (users 테이블은 Neon에 있음)
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

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

  try {
    const db = getPool();

    // Neon PostgreSQL은 .rows 사용
    const result = await db.query(`
      SELECT
        id, email, name, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching users:', maskForLog(error));
    // 에러 시 빈 배열 반환
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};
