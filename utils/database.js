const { neon } = require('@neondatabase/serverless');

class Database {
  constructor() {
    // 브라우저 환경에서는 DB 직접 접속 불가
    if (typeof window !== 'undefined') {
      throw new Error('❌ Database cannot be accessed from browser! Use API routes instead.');
    }

    // Neon PostgreSQL 연결
    const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    this.sql = neon(databaseUrl);
    console.log('✅ [Database] Connected to Neon PostgreSQL');
  }

  async execute(sqlString, params = []) {
    try {
      // Neon은 템플릿 리터럴을 사용하지만, 파라미터 바인딩을 위해 변환
      let result;
      if (params.length === 0) {
        result = await this.sql([sqlString]);
      } else {
        // ? 플레이스홀더를 $1, $2로 변환
        let paramIndex = 1;
        const pgSql = sqlString.replace(/\?/g, () => `$${paramIndex++}`);

        // 템플릿 리터럴 형식으로 실행
        const strings = [pgSql];
        strings.raw = [pgSql];
        result = await this.sql(strings, ...params);
      }

      return {
        rows: result || [],
        insertId: result && result.length > 0 && result[0].id ? Number(result[0].id) : 0,
        affectedRows: result ? result.length : 0
      };
    } catch (error) {
      console.error('Database execution error:', error);
      return {
        rows: [],
        insertId: 0,
        affectedRows: 0
      };
    }
  }

  async query(sqlString, params = []) {
    const result = await this.execute(sqlString, params);
    return result.rows;
  }

  async select(table, where) {
    let sql = `SELECT * FROM ${table}`;
    const params = [];

    if (where) {
      const conditions = Object.keys(where).map((key) => {
        params.push(where[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.execute(sql, params);
    return result.rows;
  }

  async findAll(table, where) {
    return this.select(table, where);
  }

  async findOne(table, where) {
    const results = await this.select(table, where);
    return results.length > 0 ? results[0] : null;
  }

  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const result = await this.execute(sql, values);

    const id = result.rows[0]?.id || Date.now();
    return { id: Number(id), ...data };
  }

  async update(table, id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await this.execute(sql, [...values, id]);

    return (result.affectedRows || 0) > 0;
  }

  async delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const result = await this.execute(sql, [id]);

    return (result.affectedRows || 0) > 0;
  }

  async getListings(filters = {}) {
    let sql = `
      SELECT
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.is_published = 1
    `;
    const params = [];

    if (filters.category && filters.category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(filters.category);
    }

    if (filters.location) {
      sql += ' AND l.location LIKE ?';
      params.push(`%${filters.location}%`);
    }

    if (filters.minPrice) {
      sql += ' AND l.price_from >= ?';
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      sql += ' AND l.price_from <= ?';
      params.push(filters.maxPrice);
    }

    sql += ' ORDER BY l.created_at DESC';

    if (filters.limit) {
      sql += ` LIMIT ${filters.limit}`;
      if (filters.offset) {
        sql += ` OFFSET ${filters.offset}`;
      }
    }

    return this.query(sql, params);
  }

  async getCategories() {
    return this.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order');
  }

  async getPartners() {
    try {
      return this.query('SELECT * FROM partners WHERE status = ? ORDER BY created_at DESC', ['approved']);
    } catch (error) {
      return [];
    }
  }

  async getReviews(listingId) {
    if (listingId) {
      return this.query(`
        SELECT r.*, u.name as user_name, l.title as listing_title
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.listing_id = ?
        ORDER BY r.created_at DESC
      `, [listingId]);
    } else {
      return this.query(`
        SELECT r.*, u.name as user_name, l.title as listing_title, l.location as listing_location
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.is_verified = 1
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
    }
  }

  async testConnection() {
    try {
      const result = await this.query('SELECT 1 as test');
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }
}

// Singleton
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

const db = new Proxy({}, {
  get(target, prop) {
    const instance = getDatabase();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

module.exports = { db, getDatabase, Database };
