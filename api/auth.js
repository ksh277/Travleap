const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
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

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
  const sql = neon(databaseUrl);

  const { action } = req.query;

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

      const result = await sql`SELECT * FROM users WHERE email = ${email}`;

      if (result.length === 0) {
        return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      const user = result[0];

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

      // JWT 토큰 생성 (간단한 JWT 형식)
      const token = Buffer.from(JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Date.now(),
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7일
      })).toString('base64');

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
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: '이미 사용 중인 이메일입니다.' });
      }

      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 10);

      // 사용자 생성
      const userId = `user_${Date.now()}`;
      const result = await sql`
        INSERT INTO users (user_id, email, password_hash, name, phone, role, preferred_language, preferred_currency, marketing_consent, created_at, updated_at)
        VALUES (${userId}, ${email}, ${hashedPassword}, ${name}, ${phone || ''}, 'user', 'ko', 'KRW', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const newUserId = result[0].id;

      const token = Buffer.from(JSON.stringify({
        userId: newUserId,
        email,
        name,
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7일
      })).toString('base64');

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
      const existing = await sql`SELECT * FROM users WHERE provider = ${provider} AND provider_id = ${providerId}`;
      console.log('✅ [Social Login] Existing user found:', existing.length);

      if (existing.length > 0) {
        const user = existing[0];
        const token = Buffer.from(JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          iat: Date.now(),
          exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
        })).toString('base64');

        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              avatar: user.avatar
            },
            token
          }
        });
      }

      // 새 사용자 생성
      const userId = `${provider}_${Date.now()}`;
      const result = await sql`
        INSERT INTO users (user_id, email, name, avatar, provider, provider_id, role, password_hash, preferred_language, preferred_currency, marketing_consent, created_at, updated_at)
        VALUES (${userId}, ${email}, ${name}, ${avatar || ''}, ${provider}, ${providerId}, 'user', '', 'ko', 'KRW', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const newUserId = result[0].id;

      const token = Buffer.from(JSON.stringify({
        userId: newUserId,
        email,
        name,
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
      })).toString('base64');

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: newUserId,
            email,
            name,
            role: 'user',
            avatar
          },
          token
        }
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('❌ Auth error:', error);
    console.error('Stack:', error.stack);

    // 임시로 모든 에러 메시지 노출 (디버깅용)
    return res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.',
      details: error.toString(),
      stack: error.stack
    });
  }
}
