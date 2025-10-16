const { connect } = require('@planetscale/database');

// PlanetScale connection using DATABASE_URL
const getDbConnection = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connect({ url });
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const conn = getDbConnection();

    // Query parameters for filtering
    const { role, search, date_from, date_to, page = '1', limit = '20' } = req.query;

    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    // Apply filters
    if (role) {
      const roles = role.split(',');
      sql += ` AND role IN (${roles.map(() => '?').join(',')})`;
      params.push(...roles);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      sql += ' AND created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND created_at <= ?';
      params.push(date_to);
    }

    sql += ' ORDER BY created_at DESC';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const result = await conn.execute(sql, params);
    const users = result.rows || [];

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: users.length,
        total_pages: Math.ceil(users.length / limitNum)
      }
    });
  } catch (error) {
    console.error('API /admin/users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      errorMessage: error.message || 'Unknown error',
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
    });
  }
};
