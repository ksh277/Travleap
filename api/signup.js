const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { withSecureSignup } = require('../utils/geo-block-middleware.cjs');
const { logSignup } = require('../utils/activity-logger.cjs');
const { verifyRecaptcha } = require('../utils/recaptcha');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다!');
}

// Neon PostgreSQL connection
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, email, password, name, phone, recaptchaToken } = req.body;

    console.log('📝 회원가입 요청:', username, email);

    // reCAPTCHA 검증
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'signup', 0.5);
    if (!recaptchaResult.success && !recaptchaResult.skipped) {
      console.warn('🤖 reCAPTCHA 검증 실패:', recaptchaResult.error);
      return res.status(403).json({
        success: false,
        error: recaptchaResult.error || '보안 검증에 실패했습니다.'
      });
    }
    if (recaptchaResult.success && !recaptchaResult.skipped) {
      console.log('✅ reCAPTCHA 검증 성공 (점수:', recaptchaResult.score + ')');
    }

    // 필수 입력 검증
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: '아이디, 이메일, 비밀번호, 이름은 필수 입력 항목입니다.'
      });
    }

    // 아이디 형식 검증 (영문, 숫자, 언더스코어만 허용, 3-20자)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: '아이디는 영문, 숫자, 언더스코어(_)만 사용 가능하며 3-20자여야 합니다.'
      });
    }

    // 이메일 형식 검증
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식이 아닙니다.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    const db = getPool();

    // 중복 확인 (username, email)
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '이미 사용중인 아이디 또는 이메일입니다.'
      });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, username, email, name, role`,
      [username, email, hashedPassword, name, phone || null, 'user']
    );

    const user = result.rows[0];

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ 회원가입 성공:', username);

    // 회원가입 로그 기록
    try {
      await logSignup(user.id, email, 'email', req);
    } catch (logError) {
      console.warn('⚠️ 회원가입 로그 기록 실패:', logError.message);
    }

    // 신규 회원 쿠폰 자동 발급 (member_target='new')
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
        `, [user.id, coupon.id, userCouponCode, coupon.valid_until]);

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

        console.log(`🎁 [Signup] 신규 회원 쿠폰 발급: user=${username}, code=${userCouponCode}`);
      }
    } catch (couponError) {
      console.error('⚠️ [Signup] 신규 회원 쿠폰 발급 실패 (회원가입은 성공):', couponError.message);
    }

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role
        },
        coupon: issuedCoupon // 발급된 신규 회원 쿠폰 (없으면 null)
      },
      message: issuedCoupon
        ? '회원가입이 완료되었습니다. 신규 회원 쿠폰이 발급되었습니다!'
        : '회원가입이 완료되었습니다.'
    });
  } catch (error) {
    console.error('❌ 회원가입 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
}

// 보안 미들웨어 적용 (해외IP차단 + 스팸필터)
// 초대코드는 기본 비활성화 (필요시 inviteCodeEnabled: true로 변경)
module.exports = withSecureSignup(handler, {
  geoBlockEnabled: true,      // 해외 IP 차단
  inviteCodeEnabled: false,   // 초대 코드 (현재 비활성화)
  spamFilterEnabled: true     // 스팸 필터
});
