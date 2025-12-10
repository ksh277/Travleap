const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logLogin } = require('../utils/activity-logger.cjs');
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
    const { email, password, recaptchaToken } = req.body;

    console.log('🔑 로그인 요청:', email);

    // reCAPTCHA 검증
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'login', 0.5);
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '아이디와 비밀번호를 입력해주세요.'
      });
    }

    const db = getPool();

    // email을 username으로도 받을 수 있도록 처리 (이메일 형식이면 email로, 아니면 username으로 검색)
    const isEmail = email.includes('@');
    const query = isEmail
      ? 'SELECT id, email, username, name, role, password_hash, vendor_type, vendor_id, partner_id FROM users WHERE email = $1'
      : 'SELECT id, email, username, name, role, password_hash, vendor_type, vendor_id, partner_id FROM users WHERE username = $1';

    const result = await db.query(query, [email]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 파트너인 경우 partnerId 확인
    let partnerId = null;
    if (user.role === 'partner') {
      // 1. 먼저 users 테이블의 partner_id 확인 (관리자가 설정한 값)
      if (user.partner_id) {
        partnerId = user.partner_id;
        console.log('✅ 파트너 ID 확인됨 (users.partner_id):', user.email, '→ partnerId:', partnerId);
      }

      // 2. users.partner_id가 없으면 partners 테이블에서 확인
      if (!partnerId) {
        const planetscale = connect({ url: process.env.DATABASE_URL });
        const partnerCheck = await planetscale.execute(
          `SELECT id FROM partners WHERE user_id = ? AND status = 'approved' LIMIT 1`,
          [user.id]
        );

        if (partnerCheck.rows && partnerCheck.rows.length > 0) {
          partnerId = partnerCheck.rows[0].id;
          console.log('✅ 파트너 ID 확인됨 (partners):', user.email, '→ partnerId:', partnerId);
        } else {
          console.log('⚠️ 파트너 정보를 찾을 수 없습니다:', user.email);
        }
      }
    }

    // 벤더인 경우 벤더 타입 확인
    let vendorType = null;
    if (user.role === 'vendor') {
      // 1. 먼저 users 테이블의 vendor_type 확인 (관리자가 설정한 값)
      if (user.vendor_type) {
        vendorType = user.vendor_type;
        console.log('✅ 벤더 타입 확인됨 (users.vendor_type):', user.email, '→', vendorType);
      }

      // 2. users.vendor_type이 없으면 partners 테이블에서 확인
      if (!vendorType) {
        const planetscale = connect({ url: process.env.DATABASE_URL });
        const partnerCheck = await planetscale.execute(
          `SELECT partner_type FROM partners WHERE user_id = ? LIMIT 1`,
          [user.id]
        );

        if (partnerCheck.rows && partnerCheck.rows.length > 0) {
          const partnerType = partnerCheck.rows[0].partner_type;

          // partner_type을 vendorType으로 매핑
          const vendorTypeMap = {
            'lodging': 'stay',          // 숙박 → stay
            'rentcar': 'rental',        // 렌트카 → rental
            'popup': 'popup',           // 팝업 → popup
            'food': 'food',             // 음식 → food
            'attraction': 'attractions', // 관광지 → attractions
            'attractions': 'attractions',
            'travel': 'travel',         // 여행 → travel
            'event': 'events',          // 행사 → events
            'events': 'events',
            'experience': 'experience', // 체험 → experience
            'tour': 'tour'              // 투어 → tour
          };

          vendorType = vendorTypeMap[partnerType] || partnerType;
          console.log('✅ 벤더 타입 확인됨 (partners):', user.email, '→', partnerType, '→', vendorType);
        }
      }

      // 3. partners에 없으면 rentcar_vendors 확인
      if (!vendorType) {
        const planetscale = connect({ url: process.env.DATABASE_URL });
        const rentcarCheck = await planetscale.execute(
          `SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`,
          [user.id]
        );

        if (rentcarCheck.rows && rentcarCheck.rows.length > 0) {
          vendorType = 'rental';
          console.log('✅ 벤더 타입 확인됨 (rentcar_vendors):', user.email, '→ rental');
        }
      }

      // 4. tour_vendors 확인
      if (!vendorType) {
        const planetscale = connect({ url: process.env.DATABASE_URL });
        const tourCheck = await planetscale.execute(
          `SELECT id FROM tour_vendors WHERE user_id = ? LIMIT 1`,
          [user.id]
        );

        if (tourCheck.rows && tourCheck.rows.length > 0) {
          vendorType = 'tour';
          console.log('✅ 벤더 타입 확인됨 (tour_vendors):', user.email, '→ tour');
        }
      }

      if (!vendorType) {
        console.log('⚠️ 벤더 타입을 확인할 수 없습니다:', user.email, '- 기본 팝업 대시보드 사용');
      }
    }

    // JWT 토큰 생성 시 vendorType/vendorId/partnerId 포함
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role
    };

    // partnerId가 있으면 추가
    if (partnerId) {
      tokenPayload.partnerId = partnerId;
    }

    // vendorType이 있으면 추가
    if (vendorType) {
      tokenPayload.vendorType = vendorType;
    }

    // vendorId가 있으면 추가 (관리자가 설정한 listing_id)
    if (user.vendor_id) {
      tokenPayload.vendorId = user.vendor_id;
      console.log('✅ 벤더 ID 추가됨 (users.vendor_id):', user.vendor_id);
    }

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ 로그인 성공:', user.username || user.email, 'role:', user.role, 'vendorType:', vendorType);

    // 로그인 로그 기록
    try {
      await logLogin(user.id, user.email, 'email', true, req);
    } catch (logError) {
      console.warn('⚠️ 로그인 로그 기록 실패:', logError.message);
    }

    // 응답 user 객체 생성
    const responseUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role
    };

    // partnerId가 있으면 추가
    if (partnerId) {
      responseUser.partnerId = partnerId;
    }

    // vendorType이 있으면 추가
    if (vendorType) {
      responseUser.vendorType = vendorType;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({
      success: true,
      data: {
        token,
        user: responseUser
      }
    });
  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
