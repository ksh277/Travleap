/**
 * 벤더 회원가입 API
 * - Neon DB: 사용자 계정 생성 (role='vendor')
 * - PlanetScale DB: partners 테이블에 업체 자동 생성
 */

const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Neon PostgreSQL connection
let neonPool;
function getNeonPool() {
  if (!neonPool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_DATABASE_URL not configured');
    }
    neonPool = new Pool({ connectionString });
  }
  return neonPool;
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

  let neonClient = null;

  try {
    const {
      username,
      email,
      password,
      name,
      phone,
      vendor_category, // 'lodging', 'travel', 'food', 'popup' 등
      business_name,
      business_number
    } = req.body;

    console.log('🏢 벤더 회원가입 요청:', { email, vendor_category, business_name });

    // 필수 입력 검증
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: '아이디, 이메일, 비밀번호, 이름은 필수 입력 항목입니다.'
      });
    }

    if (!vendor_category) {
      return res.status(400).json({
        success: false,
        error: '업체 카테고리를 선택해주세요.'
      });
    }

    // 카테고리 검증
    const validCategories = ['lodging', 'travel', 'attraction', 'food', 'popup', 'rentcar', 'event', 'experience'];
    if (!validCategories.includes(vendor_category)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 카테고리입니다.'
      });
    }

    // 아이디 형식 검증
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

    // Neon DB (사용자 계정)
    const neonDb = getNeonPool();
    neonClient = await neonDb.connect();

    // 중복 확인
    const existingUser = await neonClient.query(
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

    // 1. Neon DB에 벤더 사용자 생성 (role='vendor')
    const userResult = await neonClient.query(
      `INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'vendor', NOW(), NOW())
       RETURNING id, username, email, name, role`,
      [username, email, hashedPassword, name, phone || null]
    );

    const user = userResult.rows[0];
    console.log('✅ Neon DB 사용자 생성:', { userId: user.id, email: user.email });

    // 2. PlanetScale DB에 partners 테이블 레코드 자동 생성
    const planetscale = connect({ url: process.env.DATABASE_URL });

    // partner_type 매핑
    const partnerTypeMap = {
      'lodging': 'lodging',
      'travel': 'travel',
      'attraction': 'attraction',
      'food': 'food',
      'popup': 'popup',
      'rentcar': 'rentcar',
      'event': 'event',
      'experience': 'experience'
    };

    const partnerType = partnerTypeMap[vendor_category] || 'general';

    // 기본 업체명: business_name이 없으면 name 사용
    const finalBusinessName = business_name || `${name}의 ${getCategoryKoreanName(vendor_category)}`;

    await planetscale.execute(
      `INSERT INTO partners (
        user_id,
        partner_type,
        business_name,
        business_number,
        contact_name,
        email,
        phone,
        status,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, NOW(), NOW())`,
      [
        user.id,
        partnerType,
        finalBusinessName,
        business_number || null,
        name,
        email,
        phone || null
      ]
    );

    console.log('✅ PlanetScale DB partners 레코드 생성:', {
      userId: user.id,
      partnerType,
      businessName: finalBusinessName
    });

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: 'vendor' // 중요: role을 'vendor'로 설정
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ 벤더 회원가입 완료:', { email, vendor_category });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: 'vendor'
        },
        vendor_category: partnerType
      },
      message: `${getCategoryKoreanName(vendor_category)} 벤더 회원가입이 완료되었습니다.`
    });

  } catch (error) {
    console.error('❌ 벤더 회원가입 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    if (neonClient) {
      neonClient.release();
    }
  }
};

// 카테고리 한글명 반환
function getCategoryKoreanName(category) {
  const names = {
    'lodging': '숙박업체',
    'travel': '여행사',
    'attraction': '관광지',
    'food': '음식점',
    'popup': '팝업스토어',
    'rentcar': '렌트카',
    'event': '행사업체',
    'experience': '체험업체'
  };
  return names[category] || '업체';
}
