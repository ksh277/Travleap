const { connect } = require('@planetscale/database');

// ⚠️ SECURITY FIX: 이 파일은 심각한 보안 위험이 있어 사용을 중단합니다.
// SQL 인젝션 및 무인증 DB 접근 취약점이 있습니다.
// 대신 각 기능별 전용 API를 사용하세요.

// Serverless function for Vercel
module.exports = async function handler(req, res) {
  // SECURITY FIX: CORS 와일드카드 제거
  const allowedOrigins = [
    'https://travleap.vercel.app',
    'https://www.travleap.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
    process.env.NODE_ENV === 'development' ? 'http://localhost:3004' : null
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // SECURITY FIX: 인증 체크 추가
  const adminSecret = process.env.ADMIN_API_SECRET;
  const authHeader = req.headers.authorization;

  if (!adminSecret || !authHeader || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: '이 API는 관리자 인증이 필요합니다.'
    });
  }

  // PlanetScale 연결 - SECURITY FIX: 환경 변수명 변경
  const connection = connect({
    host: process.env.PLANETSCALE_HOST,
    username: process.env.PLANETSCALE_USERNAME,
    password: process.env.PLANETSCALE_PASSWORD
  });

  const { action } = req.query;

  try {
    // SELECT
    if (action === 'select') {
      const { table, where, limit, offset } = req.body;

      let sql = `SELECT * FROM ${table}`;
      const params = [];

      if (where && Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map(key => `${key} = ?`);
        sql += ` WHERE ${conditions.join(' AND ')}`;
        params.push(...Object.values(where));
      }

      if (limit) {
        sql += ` LIMIT ?`;
        params.push(limit);
      }

      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }

      const result = await connection.execute(sql, params);
      return res.status(200).json({ success: true, data: result });
    }

    // INSERT
    if (action === 'insert') {
      const { table, data } = req.body;

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map(() => '?').join(', ');

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      const result = await connection.execute(sql, values);

      return res.status(200).json({
        success: true,
        data: {
          id: result.insertId,
          ...data
        }
      });
    }

    // UPDATE
    if (action === 'update') {
      const { table, id, data } = req.body;

      const updates = Object.keys(data).map(key => `${key} = ?`);
      const values = [...Object.values(data), id];

      const sql = `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(sql, values);

      return res.status(200).json({ success: true });
    }

    // DELETE
    if (action === 'delete') {
      const { table, id } = req.body;

      const sql = `DELETE FROM ${table} WHERE id = ?`;
      await connection.execute(sql, [id]);

      return res.status(200).json({ success: true });
    }

    // QUERY (raw SQL) - SECURITY FIX: 위험한 기능 비활성화
    if (action === 'query') {
      // SECURITY: 원시 SQL 실행은 보안상 위험하여 비활성화
      // 필요한 경우 전용 API 엔드포인트를 만들어 사용하세요
      return res.status(403).json({
        success: false,
        error: 'FEATURE_DISABLED',
        message: '보안상의 이유로 원시 SQL 실행 기능은 비활성화되었습니다. 전용 API를 사용하세요.'
      });

      /* DISABLED FOR SECURITY
      const { sql, params } = req.body;
      const result = await connection.execute(sql, params || []);
      return res.status(200).json({ success: true, data: result });
      */
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
