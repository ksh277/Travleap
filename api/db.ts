import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connect } from '@planetscale/database';

// PlanetScale 연결
const connection = connect({
  host: process.env.VITE_PLANETSCALE_HOST,
  username: process.env.VITE_PLANETSCALE_USERNAME,
  password: process.env.VITE_PLANETSCALE_PASSWORD
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const { action } = req.query;

  try {
    // SELECT
    if (action === 'select' && req.method === 'POST') {
      const { table, where, limit, offset } = req.body;

      let sql = `SELECT * FROM ${table}`;
      const params: any[] = [];

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

      return res.json({
        success: true,
        data: result.rows
      });
    }

    // INSERT
    if (action === 'insert' && req.method === 'POST') {
      const { table, data } = req.body;

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map(() => '?').join(', ');

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      const result = await connection.execute(sql, values);

      return res.json({
        success: true,
        data: {
          id: result.insertId,
          ...data
        }
      });
    }

    // UPDATE
    if (action === 'update' && req.method === 'POST') {
      const { table, id, data } = req.body;

      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map(col => `${col} = ?`).join(', ');

      const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
      await connection.execute(sql, [...values, id]);

      return res.json({
        success: true,
        data: { id, ...data }
      });
    }

    // DELETE
    if (action === 'delete' && req.method === 'POST') {
      const { table, id } = req.body;

      const sql = `DELETE FROM ${table} WHERE id = ?`;
      await connection.execute(sql, [id]);

      return res.json({
        success: true
      });
    }

    // QUERY (자유 SQL 실행)
    if (action === 'query' && req.method === 'POST') {
      const { sql, params = [] } = req.body;

      const result = await connection.execute(sql, params);

      return res.json({
        success: true,
        data: result.rows
      });
    }

    return res.status(404).json({ error: 'Action not found' });

  } catch (error: any) {
    console.error('DB API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '데이터베이스 처리 중 오류가 발생했습니다.'
    });
  }
}
