import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connect } from '@planetscale/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// PlanetScale 연결
const connection = connect({
  host: process.env.VITE_PLANETSCALE_HOST,
  username: process.env.VITE_PLANETSCALE_USERNAME,
  password: process.env.VITE_PLANETSCALE_PASSWORD
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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
    // 로그인
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body;

      console.log('🔑 로그인 시도:', email);

      // 1. 사용자 찾기
      const result = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
      }

      const user = result.rows[0] as any;

      // 2. 비밀번호 확인
      let passwordMatch = false;
      if (user.password_hash.startsWith('hashed_')) {
        passwordMatch = password === user.password_hash.replace('hashed_', '');
      } else {
        passwordMatch = await bcrypt.compare(password, user.password_hash);
      }

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
      }

      // 3. JWT 토큰 생성
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role
          },
          token
        },
        message: '로그인에 성공했습니다.'
      });
    }

    // 회원가입
    if (action === 'register' && req.method === 'POST') {
      const { email, password, name, phone } = req.body;

      console.log('📝 회원가입 시도:', email);

      // 1. 이메일 중복 확인
      const existingUser = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 사용 중인 이메일입니다.'
        });
      }

      // 2. 비밀번호 해시화
      const passwordHash = await bcrypt.hash(password, 10);

      // 3. 사용자 생성
      await connection.execute(
        `INSERT INTO users (user_id, email, password_hash, name, phone, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 'active', NOW(), NOW())`,
        [`user_${Date.now()}`, email, passwordHash, name, phone || '']
      );

      // 4. 생성된 사용자 조회
      const newUserResult = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      const newUser = newUserResult.rows[0] as any;

      // 5. JWT 토큰 생성
      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            phone: newUser.phone,
            role: newUser.role
          },
          token
        },
        message: '회원가입이 완료되었습니다.'
      });
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({
      success: false,
      error: '처리 중 오류가 발생했습니다.'
    });
  }
}
