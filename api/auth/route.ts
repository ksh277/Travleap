/**
 * 인증 API - Vercel Serverless Function
 * POST /api/auth?action=login - 로그인
 * POST /api/auth?action=register - 회원가입
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Dynamic imports로 변경 - Vercel에서 더 안정적
export async function POST(request: NextRequest) {
  try {
    // 1. CORS 헤더 먼저 설정
    const origin = request.headers.get('origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // 2. URL 파라미터 파싱
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log('🔑 Auth API 요청:', { action, url: request.url });

    // 3. 요청 본문 파싱
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password, name, phone } = body;

    // 4. Dynamic imports - Vercel 호환성 향상
    const [{ connect }, bcryptModule, { JWTUtils }] = await Promise.all([
      import('@planetscale/database'),
      import('bcryptjs'),
      import('../../utils/jwt')
    ]);

    const bcrypt = bcryptModule.default || bcryptModule;

    console.log('✅ 모듈 로드 완료');

    // 5. DB 연결
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    const conn = connect({ url: dbUrl });

    // 6. 로그인 처리
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log('🔍 사용자 조회:', email);

      const result = await conn.execute(
        'SELECT id, email, name, phone, role, password_hash FROM users WHERE email = ?',
        [email]
      );

      if (!result.rows || result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401, headers: corsHeaders }
        );
      }

      const user: any = result.rows[0];
      console.log('✅ 사용자 찾음:', user.email);

      // 비밀번호 검증
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('🔐 비밀번호 검증:', isValid);

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401, headers: corsHeaders }
        );
      }

      // JWT 생성
      const token = JWTUtils.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      };

      console.log('✅ 로그인 성공:', user.email);

      return NextResponse.json(
        {
          success: true,
          data: { user: userResponse, token },
          message: '로그인 성공',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 7. 회원가입 처리
    if (action === 'register') {
      if (!email || !password || !name) {
        return NextResponse.json(
          { success: false, error: '이메일, 비밀번호, 이름은 필수입니다.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // 이메일 중복 체크
      const checkResult = await conn.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (checkResult.rows && checkResult.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: '이미 가입된 이메일입니다.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // 비밀번호 해싱
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // DB 저장
      await conn.execute(
        'INSERT INTO users (email, password_hash, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, name, phone || '', 'user', new Date().toISOString()]
      );

      // 저장된 사용자 조회
      const savedResult = await conn.execute(
        'SELECT id, email, name, phone, role FROM users WHERE email = ?',
        [email]
      );

      const savedUser: any = savedResult.rows[0];

      // JWT 생성
      const token = JWTUtils.generateToken({
        userId: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
      });

      return NextResponse.json(
        {
          success: true,
          data: { user: savedUser, token },
          message: '회원가입이 완료되었습니다.',
        },
        { status: 201, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다.' },
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Auth API 오류:', error);
    console.error('상세:', error instanceof Error ? error.message : String(error));
    console.error('스택:', error instanceof Error ? error.stack : undefined);

    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}
