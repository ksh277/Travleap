const express = require('express');
const cors = require('cors');
const { connect } = require('@planetscale/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// CORS 설정
app.use(cors());
app.use(express.json());

// PlanetScale 연결
const connection = connect({
  host: process.env.VITE_PLANETSCALE_HOST,
  username: process.env.VITE_PLANETSCALE_USERNAME,
  password: process.env.VITE_PLANETSCALE_PASSWORD
});

// 데이터베이스 연결 테스트
app.get('/api/health', async (req, res) => {
  try {
    const result = await connection.execute('SELECT 1 as test');
    res.json({ success: true, message: 'Database connected', data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SELECT
app.post('/api/db', async (req, res) => {
  const { action } = req.query;

  try {
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
      return res.json({ success: true, data: result.rows });
    }

    // INSERT
    if (action === 'insert') {
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
    if (action === 'update') {
      const { table, id, data } = req.body;

      const updates = Object.keys(data).map(key => `${key} = ?`);
      const values = [...Object.values(data), id];

      const sql = `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(sql, values);

      return res.json({ success: true });
    }

    // DELETE
    if (action === 'delete') {
      const { table, id } = req.body;

      const sql = `DELETE FROM ${table} WHERE id = ?`;
      await connection.execute(sql, [id]);

      return res.json({ success: true });
    }

    // QUERY (raw SQL)
    if (action === 'query') {
      const { sql, params } = req.body;

      const result = await connection.execute(sql, params || []);

      return res.json({
        success: true,
        data: result.rows
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// AUTH
app.post('/api/auth', async (req, res) => {
  const { action } = req.query;

  try {
    if (action === 'login') {
      const { email, password } = req.body;

      const result = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      const user = result.rows[0];

      console.log('🔍 Login attempt for:', email);
      console.log('   User found:', user.email, 'ID:', user.id);
      console.log('   Hash exists:', !!user.password_hash);

      // 비밀번호 검증 (bcrypt 사용)
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      console.log('   Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      console.log('✅ Login successful');

      // JWT 토큰 생성 (간단한 버전)
      const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role })).toString('base64');

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          token
        }
      });
    }

    if (action === 'register') {
      const { email, password, name, phone } = req.body;

      // 이미 존재하는지 확인
      const existing = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: '이미 등록된 이메일입니다.' });
      }

      // 사용자 생성 (bcrypt로 비밀번호 해시화)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const userId = `user_${Date.now()}`;
      await connection.execute(
        `INSERT INTO users (user_id, email, password_hash, name, phone, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 'active', NOW(), NOW())`,
        [userId, email, hashedPassword, name, phone || '']
      );

      // JWT 토큰 생성
      const token = Buffer.from(JSON.stringify({ userId, email, role: 'user' })).toString('base64');

      return res.json({
        success: true,
        data: {
          user: {
            id: userId,
            email,
            name,
            role: 'user'
          },
          token
        }
      });
    }

    // 소셜 로그인 (Google, Kakao, Naver)
    if (action === 'social-login') {
      const { provider, providerId, email, name, avatar } = req.body;

      if (!provider || !providerId || !email) {
        return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
      }

      // provider_id로 기존 사용자 확인
      let result = await connection.execute(
        'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
        [provider, providerId]
      );

      let user;

      if (result.rows.length === 0) {
        // 이메일로 기존 사용자 확인 (다른 방법으로 가입한 경우)
        const emailCheck = await connection.execute(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );

        if (emailCheck.rows.length > 0) {
          // 기존 계정에 소셜 로그인 연동
          user = emailCheck.rows[0];
          await connection.execute(
            'UPDATE users SET provider = ?, provider_id = ?, avatar = ? WHERE id = ?',
            [provider, providerId, avatar || user.avatar, user.id]
          );
        } else {
          // 새 사용자 생성
          const userId = `user_${Date.now()}`;
          await connection.execute(
            `INSERT INTO users (user_id, email, password_hash, name, avatar, role, status, provider, provider_id, created_at, updated_at)
             VALUES (?, ?, '', ?, ?, 'user', 'active', ?, ?, NOW(), NOW())`,
            [userId, email, name || email.split('@')[0], avatar || null, provider, providerId]
          );

          const newUser = await connection.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
          );
          user = newUser.rows[0];
        }
      } else {
        user = result.rows[0];
        // 프로필 정보 업데이트 (이름이나 아바타가 변경되었을 수 있음)
        if (name || avatar) {
          await connection.execute(
            'UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?',
            [name, avatar, user.id]
          );
        }
      }

      // JWT 토큰 생성
      const token = Buffer.from(JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        provider: provider
      })).toString('base64');

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name || name,
            role: user.role,
            avatar: user.avatar || avatar,
            provider: provider
          },
          token
        }
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Local API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.VITE_PLANETSCALE_USERNAME}`);
  console.log(`🔗 Endpoints: /api/db, /api/auth, /api/health`);
});
