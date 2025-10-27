const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    const { email, password } = req.body;

    console.log('🔑 로그인 요청:', email);

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
      ? 'SELECT id, email, username, name, role, password_hash FROM users WHERE email = $1'
      : 'SELECT id, email, username, name, role, password_hash FROM users WHERE username = $1';

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

    // 벤더인 경우 벤더 타입 확인 (partners 테이블에서)
    let vendorType = null;
    if (user.role === 'vendor') {
      const planetscale = connect({ url: process.env.DATABASE_URL });

      // partners 테이블에서 벤더 타입 확인
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
          'attraction': 'attraction', // 관광지 → attraction
          'travel': 'travel',         // 여행 → travel
          'event': 'event',           // 행사 → event
          'experience': 'experience'  // 체험 → experience
        };

        vendorType = vendorTypeMap[partnerType] || partnerType;
        console.log('✅ 벤더 타입 확인됨:', user.email, '→', partnerType, '→', vendorType);
      } else {
        console.log('⚠️ partners 테이블에 벤더 정보가 없습니다:', user.email);
      }
    }

    // JWT 토큰 생성 시 vendorType 포함
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role
    };

    // vendorType이 있으면 추가
    if (vendorType) {
      tokenPayload.vendorType = vendorType;
    }

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ 로그인 성공:', user.username || user.email, 'role:', user.role, 'vendorType:', vendorType);

    // 응답 user 객체 생성
    const responseUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role
    };

    // vendorType이 있으면 추가
    if (vendorType) {
      responseUser.vendorType = vendorType;
    }

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
