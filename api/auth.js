const { neon } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { withStrictRateLimit } = require('../utils/rate-limit-middleware.cjs');

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

  // Neon PostgreSQL 연결 (소셜 로그인 사용자도 Neon에 저장)
  if (!process.env.POSTGRES_DATABASE_URL) {
    console.error('❌ POSTGRES_DATABASE_URL 환경변수가 설정되지 않았습니다!');
    return res.status(500).json({
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의하세요.'
    });
  }
  const sql = neon(process.env.POSTGRES_DATABASE_URL);

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

      const result = await sql`SELECT * FROM users WHERE email = ${email}`;

      if (!result || result.length === 0) {
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
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

      if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, error: '이미 사용 중인 이메일입니다.' });
      }

      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 10);

      // username 생성 (Neon users 테이블용 - unique 제약)
      const username = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 사용자 생성 (Neon PostgreSQL)
      const result = await sql`
        INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
        VALUES (${username}, ${email}, ${hashedPassword}, ${name}, ${phone || ''}, 'user', NOW(), NOW())
        RETURNING id
      `;

      console.log('🔍 [Register] Neon INSERT result:', JSON.stringify(result));

      if (!result || !Array.isArray(result) || result.length === 0) {
        console.error('❌ [Register] Invalid Neon response:', result);
        throw new Error('사용자 생성에 실패했습니다. 데이터베이스 응답이 유효하지 않습니다.');
      }

      const newUserId = result[0].id;

      if (!newUserId) {
        console.error('❌ [Register] No ID returned:', result[0]);
        throw new Error('사용자 생성에 실패했습니다. ID가 반환되지 않았습니다.');
      }

      // 🎁 신규 회원 쿠폰 자동 발급
      let issuedCoupon = null;
      try {
        const planetscaleConn = connect({ url: process.env.DATABASE_URL });

        // 신규 회원 대상 쿠폰 조회
        const newMemberCoupons = await planetscaleConn.execute(`
          SELECT * FROM coupons
          WHERE coupon_category = 'member'
            AND member_target = 'new'
            AND is_active = TRUE
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (usage_limit IS NULL OR issued_count < usage_limit)
          ORDER BY created_at DESC
          LIMIT 1
        `);

        if (newMemberCoupons.rows && newMemberCoupons.rows.length > 0) {
          const coupon = newMemberCoupons.rows[0];

          // 고유 쿠폰 코드 생성
          let userCouponCode;
          let attempts = 0;
          while (attempts < 10) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = 'NEW-';
            for (let i = 0; i < 8; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            userCouponCode = code;

            const codeCheck = await planetscaleConn.execute(
              'SELECT id FROM user_coupons WHERE coupon_code = ?',
              [userCouponCode]
            );
            if (!codeCheck.rows || codeCheck.rows.length === 0) break;
            attempts++;
          }

          // user_coupons에 발급 (expires_at 포함)
          await planetscaleConn.execute(`
            INSERT INTO user_coupons (
              user_id, coupon_id, coupon_code, status, issued_at, expires_at
            ) VALUES (?, ?, ?, 'ISSUED', NOW(), ?)
          `, [newUserId, coupon.id, userCouponCode, coupon.valid_until]);

          // coupons의 issued_count 증가
          await planetscaleConn.execute(`
            UPDATE coupons SET issued_count = COALESCE(issued_count, 0) + 1 WHERE id = ?
          `, [coupon.id]);

          issuedCoupon = {
            code: userCouponCode,
            name: coupon.name || coupon.title,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value
          };

          console.log(`🎁 [Register] 신규 회원 쿠폰 발급: user=${newUserId}, code=${userCouponCode}`);
        }
      } catch (couponError) {
        console.error('⚠️ [Register] 신규 회원 쿠폰 발급 실패 (회원가입은 성공):', couponError.message);
      }

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
          token,
          coupon: issuedCoupon // 발급된 신규 회원 쿠폰 (없으면 null)
        },
        message: issuedCoupon ? '신규 회원 쿠폰이 발급되었습니다!' : undefined
      });
    }

    // 소셜 로그인
    if (action === 'social-login') {
      const { provider, providerId, email, name, avatar, phone } = req.body;

      console.log('🔑 [Social Login] Request data:', { provider, providerId, email, name, hasAvatar: !!avatar });

      // 기존 사용자 확인 (Neon PostgreSQL)
      console.log('🔍 [Social Login] Checking existing user in Neon...');
      const existing = await sql`
        SELECT * FROM users
        WHERE provider = ${provider} AND provider_id = ${providerId}
      `;
      console.log('✅ [Social Login] Existing user found:', existing.length);

      if (existing && existing.length > 0) {
        const user = existing[0];
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
      console.log('🆕 [Social Login] Creating new user in Neon...');

      // username 생성 (Neon users 테이블용 - unique 제약)
      const username = `${provider}_${Date.now()}_${providerId.substring(0, 6)}`;

      // Neon PostgreSQL - 소셜 로그인 사용자 생성
      const result = await sql`
        INSERT INTO users (username, email, name, phone, provider, provider_id, role, password_hash, created_at, updated_at)
        VALUES (${username}, ${email}, ${name}, ${phone || ''}, ${provider}, ${providerId}, 'user', '', NOW(), NOW())
        RETURNING id
      `;

      console.log('🔍 [Social Login] Neon INSERT result:', JSON.stringify(result));

      if (!result || !Array.isArray(result) || result.length === 0) {
        console.error('❌ [Social Login] Invalid Neon response:', result);
        throw new Error('소셜 로그인 사용자 생성에 실패했습니다. 데이터베이스 응답이 유효하지 않습니다.');
      }

      const newUserId = result[0].id;

      if (!newUserId) {
        console.error('❌ [Social Login] No ID returned:', result[0]);
        throw new Error('소셜 로그인 사용자 생성에 실패했습니다. ID가 반환되지 않았습니다.');
      }

      const newUser = { id: newUserId, email, name, role: 'user' };
      console.log('✅ [Social Login] New user created:', newUser.id);

      // 🎁 신규 회원 쿠폰 자동 발급
      let issuedCoupon = null;
      try {
        const planetscaleConn = connect({ url: process.env.DATABASE_URL });

        // 신규 회원 대상 쿠폰 조회
        const newMemberCoupons = await planetscaleConn.execute(`
          SELECT * FROM coupons
          WHERE coupon_category = 'member'
            AND member_target = 'new'
            AND is_active = TRUE
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (usage_limit IS NULL OR issued_count < usage_limit)
          ORDER BY created_at DESC
          LIMIT 1
        `);

        if (newMemberCoupons.rows && newMemberCoupons.rows.length > 0) {
          const coupon = newMemberCoupons.rows[0];

          // 고유 쿠폰 코드 생성
          let userCouponCode;
          let attempts = 0;
          while (attempts < 10) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = 'NEW-';
            for (let i = 0; i < 8; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            userCouponCode = code;

            const codeCheck = await planetscaleConn.execute(
              'SELECT id FROM user_coupons WHERE coupon_code = ?',
              [userCouponCode]
            );
            if (!codeCheck.rows || codeCheck.rows.length === 0) break;
            attempts++;
          }

          // user_coupons에 발급 (expires_at 포함)
          await planetscaleConn.execute(`
            INSERT INTO user_coupons (
              user_id, coupon_id, coupon_code, status, issued_at, expires_at
            ) VALUES (?, ?, ?, 'ISSUED', NOW(), ?)
          `, [newUser.id, coupon.id, userCouponCode, coupon.valid_until]);

          // coupons의 issued_count 증가
          await planetscaleConn.execute(`
            UPDATE coupons SET issued_count = COALESCE(issued_count, 0) + 1 WHERE id = ?
          `, [coupon.id]);

          issuedCoupon = {
            code: userCouponCode,
            name: coupon.name || coupon.title,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value
          };

          console.log(`🎁 [Social Login] 신규 회원 쿠폰 발급: user=${newUser.id}, code=${userCouponCode}`);
        }
      } catch (couponError) {
        console.error('⚠️ [Social Login] 신규 회원 쿠폰 발급 실패 (로그인은 성공):', couponError.message);
      }

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
          token,
          coupon: issuedCoupon // 발급된 신규 회원 쿠폰 (없으면 null)
        },
        message: issuedCoupon ? '신규 회원 쿠폰이 발급되었습니다!' : undefined
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
