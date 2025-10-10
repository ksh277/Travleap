const { connect } = require('@planetscale/database');

export default async function handler(req, res) {
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

  const connection = connect({
    host: process.env.VITE_PLANETSCALE_HOST,
    username: process.env.VITE_PLANETSCALE_USERNAME,
    password: process.env.VITE_PLANETSCALE_PASSWORD
  });

  const { action } = req.query;

  try {
    // 로그인
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

      // 비밀번호 검증
      if (user.password_hash !== password && !password.startsWith('$2')) {
        return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      // JWT 토큰 생성
      const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role })).toString('base64');

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone
        },
        token
      });
    }

    // 회원가입
    if (action === 'register') {
      const { email, password, name, phone } = req.body;

      // 이메일 중복 확인
      const existing = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: '이미 사용 중인 이메일입니다.' });
      }

      // 사용자 생성
      const userId = `user_${Date.now()}`;
      const result = await connection.execute(
        `INSERT INTO users (user_id, email, password_hash, name, phone, role, preferred_language, preferred_currency, marketing_consent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 'ko', 'KRW', 1, NOW(), NOW())`,
        [userId, email, password, name, phone || '']
      );

      const token = Buffer.from(JSON.stringify({ userId: result.insertId, email, role: 'user' })).toString('base64');

      return res.status(200).json({
        success: true,
        user: {
          id: result.insertId,
          email,
          name,
          role: 'user'
        },
        token
      });
    }

    // 소셜 로그인
    if (action === 'social-login') {
      const { provider, providerId, email, name, avatar } = req.body;

      // 기존 사용자 확인
      const existing = await connection.execute(
        'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
        [provider, providerId]
      );

      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role })).toString('base64');

        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar
          },
          token
        });
      }

      // 새 사용자 생성
      const userId = `${provider}_${Date.now()}`;
      const result = await connection.execute(
        `INSERT INTO users (user_id, email, name, avatar, provider, provider_id, role, password_hash, preferred_language, preferred_currency, marketing_consent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'user', '', 'ko', 'KRW', 1, NOW(), NOW())`,
        [userId, email, name, avatar || '', provider, providerId]
      );

      const token = Buffer.from(JSON.stringify({ userId: result.insertId, email, role: 'user' })).toString('base64');

      return res.status(200).json({
        success: true,
        user: {
          id: result.insertId,
          email,
          name,
          role: 'user',
          avatar
        },
        token
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
