/**
 * 인증 API - Vercel Serverless Function (Node.js Runtime)
 * POST /api/auth?action=login - 로그인
 * POST /api/auth?action=register - 회원가입
 */

// Vercel에 Node.js runtime 사용하도록 명시
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// JWT Utils (inline)
class JWTUtils {
  static get SECRET_KEY(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET must be set');
    }
    return secret;
  }

  static generateToken(payload: { userId: number; email: string; name: string; role: string }): string {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name
      },
      this.SECRET_KEY,
      {
        expiresIn: '24h',
        algorithm: 'HS256',
        issuer: 'travleap',
        audience: 'travleap-users'
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. CORS 헤더
    const origin = request.headers.get('origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    };

    // 2. URL 파싱
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log('🔑 Auth API called:', {
      action,
      runtime: 'nodejs',
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });

    // 3. 환경변수 확인
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: JWT_SECRET not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: DATABASE_URL not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Body 파싱
    const body = await request.json() as any;
    const { email, password, name, phone } = body;

    console.log('📧 Request:', { email, action });

    // 5. DB 연결 (Neon Postgres)
    const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found');
    }
    const sql = neon(databaseUrl);
    console.log('✅ Database connected');

    // 6. 로그인
    if (action === 'login') {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await sql`SELECT id, email, name, phone, role, password_hash FROM users WHERE email = ${email}`;

      if (!result || result.length === 0) {
        console.log('❌ User not found:', email);
        return new Response(
          JSON.stringify({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const user: any = result[0];
      console.log('✅ User found:', user.email);

      // 비밀번호 검증
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('🔐 Password valid:', isValid);

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // JWT 토큰 생성
      const token = JWTUtils.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      console.log('✅ Login successful');

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              role: user.role,
            },
            token
          },
          message: '로그인 성공',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. 회원가입
    if (action === 'register') {
      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ success: false, error: '필수 항목을 입력해주세요.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 이메일 중복 확인
      const checkResult = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (checkResult && checkResult.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: '이미 가입된 이메일입니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 비밀번호 해싱
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 사용자 생성
      await sql`INSERT INTO users (email, password_hash, name, phone, role, created_at)
                VALUES (${email}, ${hashedPassword}, ${name}, ${phone || ''}, 'user', ${new Date().toISOString()})`;

      const savedResult = await sql`SELECT id, email, name, phone, role FROM users WHERE email = ${email}`;

      const savedUser: any = savedResult[0];

      // JWT 토큰 생성
      const token = JWTUtils.generateToken({
        userId: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
      });

      console.log('✅ Registration successful');

      return new Response(
        JSON.stringify({
          success: true,
          data: { user: savedUser, token },
          message: '회원가입이 완료되었습니다.',
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: '잘못된 요청입니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auth error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}
