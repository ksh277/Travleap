/**
 * 인증 API 엔드포인트
 * POST /api/auth?action=register - 회원가입
 * POST /api/auth?action=login - 로그인
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '../../utils/database-cloud';
import { JWTUtils } from '../../utils/jwt';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST 요청 처리
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'register') {
      return await handleRegister(request);
    } else if (action === 'login') {
      return await handleLogin(request);
    } else {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 회원가입 처리
async function handleRegister(request: NextRequest) {
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
    const existingUsers = await db.select('users', { email });
    if (existingUsers && existingUsers.length > 0) {
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
      user_id: `user_${Date.now()}`,
      email,
      password_hash: hashedPassword,
      name,
      phone: phone || '',
      role: 'user',
      is_active: true,
      preferred_language: 'ko',
      preferred_currency: 'KRW',
      marketing_consent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 7. DB에 저장
    await db.insert('users', newUser);
    console.log('✅ DB에 사용자 저장 완료');

    // 8. 저장된 사용자 조회 (ID 포함)
    const savedUsers = await db.select('users', { email });
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
      user_id: savedUser.user_id,
      email: savedUser.email,
      name: savedUser.name,
      phone: savedUser.phone,
      role: savedUser.role,
      is_active: savedUser.is_active,
      preferred_language: savedUser.preferred_language,
      preferred_currency: savedUser.preferred_currency,
      created_at: savedUser.created_at,
      updated_at: savedUser.updated_at,
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
    const users = await db.select('users', { email });

    if (!users || users.length === 0) {
      console.log('❌ 사용자를 찾을 수 없음:', email);

      // 관리자 계정 폴백 (DB에 없을 때만)
      if (email === 'admin@shinan.com' && password === 'admin123') {
        console.log('✅ 관리자 폴백 로그인');

        const adminUser = {
          id: 1,
          user_id: 'admin_shinan',
          email: 'admin@shinan.com',
          name: '관리자',
          phone: '010-0000-0000',
          role: 'admin',
          is_active: true,
          preferred_language: 'ko',
          preferred_currency: 'KRW',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const token = JWTUtils.generateToken({
          userId: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        });

        return NextResponse.json(
          {
            success: true,
            data: { user: adminUser, token },
            message: '관리자 로그인 성공',
          },
          { status: 200, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = users[0];
    console.log('✅ 사용자 찾음:', user.email, 'role:', user.role);

    // 3. 비밀번호 검증
    let isPasswordValid = false;

    try {
      // bcrypt 해시 검증
      if (user.password_hash && user.password_hash.startsWith('$2')) {
        isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔐 bcrypt 비밀번호 검증:', isPasswordValid);
      } else {
        // 평문 비교 (개발용)
        isPasswordValid = password === user.password_hash;
        console.log('🔓 평문 비밀번호 비교:', isPasswordValid);
      }
    } catch (error) {
      console.error('비밀번호 검증 오류:', error);
      isPasswordValid = password === user.password_hash;
      console.log('🔓 평문 비밀번호 폴백:', isPasswordValid);
    }

    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치');
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. 계정 활성화 확인
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403, headers: corsHeaders }
      );
    }

    // 5. JWT 토큰 생성
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 6. 비밀번호 해시 제거 후 반환
    const userResponse = {
      id: user.id,
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      preferred_language: user.preferred_language,
      preferred_currency: user.preferred_currency,
      created_at: user.created_at,
      updated_at: user.updated_at,
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
