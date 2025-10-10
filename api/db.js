const { connect } = require('@planetscale/database');

// Serverless function for Vercel
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // PlanetScale 연결
  const connection = connect({
    host: process.env.VITE_PLANETSCALE_HOST,
    username: process.env.VITE_PLANETSCALE_USERNAME,
    password: process.env.VITE_PLANETSCALE_PASSWORD
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
      return res.status(200).json({ success: true, data: result.rows });
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

    // QUERY (raw SQL)
    if (action === 'query') {
      const { sql, params } = req.body;

      const result = await connection.execute(sql, params || []);

      return res.status(200).json({
        success: true,
        data: result.rows
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
