/**
 * 인증 API 엔드포인트
 * POST /api/auth?action=register - 회원가입
 * POST /api/auth?action=login - 로그인
 */

// @ts-ignore - Next.js types not installed in Vite project
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { connect } from '@planetscale/database';
import { JWTUtils } from '../../utils/jwt';
import { getCorsHeaders } from '../../utils/cors';

// Vercel 환경에서 직접 DB 연결 생성
const getDbConnection = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return connect({ url });
};

// CORS 헤더 (동적 생성)
function getCorsHeadersForRequest(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return getCorsHeaders(origin);
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeadersForRequest(request);
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST 요청 처리
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeadersForRequest(request);

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log('📨 Auth API POST 요청:', {
      action,
      url: request.url,
      method: request.method,
      hasBody: request.body !== null
    });

    if (action === 'register') {
      return await handleRegister(request);
    } else if (action === 'login') {
      return await handleLogin(request);
    } else {
      console.log('❌ 잘못된 action:', action);
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('❌ Auth API error:', error);
    console.error('에러 상세:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 회원가입 처리
async function handleRegister(request: NextRequest) {
  const corsHeaders = getCorsHeadersForRequest(request);

  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    console.log('📝 회원가입 요청:', email);

    // 1. 필수 필드 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: '이메일, 비밀번호, 이름은 필수입니다.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. 이메일 중복 체크
    const conn = getDbConnection();
    const checkResult = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (checkResult.rows && checkResult.rows.length > 0) {
      console.log('❌ 이미 존재하는 이메일:', email);
      return NextResponse.json(
        { success: false, error: '이미 가입된 이메일입니다.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('🔐 비밀번호 해싱 완료');

    // 6. 사용자 데이터 준비
    const newUser = {
      email,
      password_hash: hashedPassword,
      name,
      phone: phone || '',
      role: 'user',
      created_at: new Date().toISOString(),
    };

    // 7. DB에 저장
    await conn.execute(
      'INSERT INTO users (email, password_hash, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newUser.email, newUser.password_hash, newUser.name, newUser.phone, newUser.role, newUser.created_at]
    );
    console.log('✅ DB에 사용자 저장 완료');

    // 8. 저장된 사용자 조회 (ID 포함)
    const savedResult = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
    const savedUsers = savedResult.rows;
    if (!savedUsers || savedUsers.length === 0) {
      throw new Error('사용자 저장 후 조회 실패');
    }

    const savedUser = savedUsers[0];
    console.log('✅ 사용자 조회 성공 - ID:', savedUser.id);

    // 9. JWT 토큰 생성
    const token = JWTUtils.generateToken({
      userId: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
    });

    // 10. 비밀번호 해시 제거 후 반환
    const userResponse = {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      phone: savedUser.phone,
      role: savedUser.role,
    };

    console.log('✅ 회원가입 완료:', email);

    return NextResponse.json(
      {
        success: true,
        data: { user: userResponse, token },
        message: '회원가입이 완료되었습니다.',
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ 회원가입 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '회원가입 처리 중 오류가 발생했습니다.',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 로그인 처리
async function handleLogin(request: NextRequest) {
  const corsHeaders = getCorsHeadersForRequest(request);

  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('🔑 로그인 요청:', email);

    // 1. 필수 필드 검증
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. DB에서 사용자 조회
    const conn = getDbConnection();
    const result = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
    const users = result.rows;

    if (!users || users.length === 0) {
      console.log('❌ 사용자를 찾을 수 없음:', email);
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = users[0];
    console.log('✅ 사용자 찾음:', user.email, 'role:', user.role);

    // 3. 비밀번호 검증 (bcrypt only - no plaintext fallback for security)
    let isPasswordValid = false;

    try {
      // CRITICAL: Only bcrypt hash verification allowed
      if (!user.password_hash || !user.password_hash.startsWith('$2')) {
        console.error('❌ SECURITY: Invalid password hash format for user:', email);
        return NextResponse.json(
          { success: false, error: '비밀번호 형식 오류입니다. 관리자에게 문의하세요.' },
          { status: 500, headers: corsHeaders }
        );
      }

      isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log('🔐 bcrypt 비밀번호 검증:', isPasswordValid);
    } catch (error) {
      console.error('비밀번호 검증 오류:', error);
      return NextResponse.json(
        { success: false, error: '비밀번호 검증 중 오류가 발생했습니다.' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치');
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. JWT 토큰 생성
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 5. 비밀번호 해시 제거 후 반환
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };

    console.log('✅ 로그인 성공:', user.email, 'role:', user.role);

    return NextResponse.json(
      {
        success: true,
        data: { user: userResponse, token },
        message: '로그인 성공',
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
