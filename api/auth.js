const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { withStrictRateLimit } = require('../utils/rate-limit-middleware');

// 수동 body parser (Vercel에서 자동 파싱이 안 될 경우)
async function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body) {
      resolve(req.body);
      return;
    }

    let buffer = '';
    req.on('data', chunk => {
      buffer += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(buffer ? JSON.parse(buffer) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

async function handler(req, res) {
  // CORS
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

  // 수동으로 body 파싱
  req.body = await parseBody(req);

  const connection = connect({ url: process.env.DATABASE_URL });

  // JWT_SECRET 환경변수 확인
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET 환경변수가 설정되지 않았습니다!');
    return res.status(500).json({
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의하세요.'
    });
  }

  const { action } = req.query;

  // req.body 디버깅
  console.log('📨 [Auth API] Request:', {
    method: req.method,
    action,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : 'no body',
    contentType: req.headers['content-type'],
    bodyContent: req.body
  });

  try {
    // 로그인
    if (action === 'login') {
      const { email, password } = req.body;

      // 입력 검증
      if (!email || !password) {
        return res.status(400).json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: '잘못된 입력 형식입니다.' });
      }

      const result = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      const user = result.rows[0];

      console.log('🔍 Login attempt for:', email);
      console.log('   User found:', user.email, '(ID:', user.id, ')');
      console.log('   Password hash exists:', !!user.password_hash);
      console.log('   Hash length:', user.password_hash ? user.password_hash.length : 0);
      console.log('   Status:', user.status);
      console.log('   Role:', user.role);

      // 비밀번호 해시가 없는 경우 (소셜 로그인 전용 계정)
      if (!user.password_hash || user.password_hash === '') {
        console.log('❌ No password hash - social login account');
        return res.status(401).json({ success: false, error: '소셜 로그인으로 가입한 계정입니다.' });
      }

      // 비밀번호 검증 (bcrypt 사용)
      console.log('   Comparing password...');
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log('   Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      console.log('✅ Login successful for:', user.email);

      // JWT 토큰 생성 (정상 JWT 사용)
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d', algorithm: 'HS256' }
      );

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone
          },
          token
        }
      });
    }

    // 회원가입
    if (action === 'register') {
      const { email, password, name, phone } = req.body;

      // 입력 검증
      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: '필수 항목을 입력해주세요.' });
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: '올바른 이메일 형식이 아닙니다.' });
      }

      // 비밀번호 강도 검증 (최소 8자)
      if (password.length < 8) {
        return res.status(400).json({ success: false, error: '비밀번호는 최소 8자 이상이어야 합니다.' });
      }

      // 이름 길이 검증
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ success: false, error: '이름은 2~50자 이내여야 합니다.' });
      }

      // 이메일 중복 확인
      const existing = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);

      if (existing.rows && existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: '이미 사용 중인 이메일입니다.' });
      }

      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 10);

      // username 생성 (이메일 @ 앞부분 + timestamp)
      const username = email.split('@')[0] + '_' + Date.now().toString().substring(8);

      // 사용자 생성
      const result = await connection.execute(
        'INSERT INTO users (email, username, password_hash, name, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [email, username, hashedPassword, name, phone || '', 'user']
      );

      const newUserId = result.insertId;

      const token = jwt.sign(
        {
          userId: newUserId,
          email,
          name,
          role: 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d', algorithm: 'HS256' }
      );

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: newUserId,
            email,
            name,
            role: 'user',
            phone: phone || ''
          },
          token
        }
      });
    }

    // 소셜 로그인
    if (action === 'social-login') {
      const { provider, providerId, email, name, avatar } = req.body;

      console.log('🔑 [Social Login] Request data:', { provider, providerId, email, name, hasAvatar: !!avatar });

      // 기존 사용자 확인
      console.log('🔍 [Social Login] Checking existing user...');
      const existing = await connection.execute(
        'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
        [provider, providerId]
      );
      console.log('✅ [Social Login] Existing user found:', existing.rows ? existing.rows.length : 0);

      if (existing.rows && existing.rows.length > 0) {
        const user = existing.rows[0];
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          JWT_SECRET,
          { expiresIn: '7d', algorithm: 'HS256' }
        );

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              avatar: null
            },
            token
          }
        });
      }

      // 새 사용자 생성
      console.log('🆕 [Social Login] Creating new user...');

      // username 생성 (이메일 @ 앞부분 사용)
      const username = email.split('@')[0] + '_' + providerId.substring(0, 6);

      const result = await connection.execute(
        'INSERT INTO users (email, username, name, provider, provider_id, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [email, username, name, provider, providerId, 'user', '']
      );

      const newUserId = result.insertId;
      const newUser = { id: newUserId, email, name, role: 'user' };
      console.log('✅ [Social Login] New user created:', newUser.id);

      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        },
        JWT_SECRET,
        { expiresIn: '7d', algorithm: 'HS256' }
      );

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            avatar: avatar || null
          },
          token
        }
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('❌ Auth error:', error);
    console.error('Stack:', error.stack);

    // 프로덕션에서는 자세한 에러 메시지 숨기기
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return res.status(500).json({
      success: false,
      error: isDevelopment ? error.message : '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      ...(isDevelopment && { details: error.toString(), stack: error.stack })
    });
  }
}

// Rate Limiting 적용 (15분에 5회)
module.exports = withStrictRateLimit(handler);
