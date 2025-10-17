/**
 * 인증 API - Vercel Serverless Function
 * POST /api/auth?action=login - 로그인
 * POST /api/auth?action=register - 회원가입
 */

export async function POST(request: Request) {
  try {
    // 1. CORS 헤더
    const origin = request.headers.get('origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 2. URL 파싱
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log('🔑 Auth API:', action);

    // 3. Body 파싱
    const body = await request.json() as any;
    const { email, password, name, phone } = body;

    // 4. Dynamic imports
    const [{ connect }, bcrypt, { JWTUtils }] = await Promise.all([
      import('@planetscale/database'),
      import('bcryptjs'),
      import('../../utils/jwt')
    ]);

    console.log('✅ Modules loaded');

    // 5. DB 연결
    const conn = connect({ url: process.env.DATABASE_URL! });

    // 6. 로그인
    if (action === 'login') {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await conn.execute(
        'SELECT id, email, name, phone, role, password_hash FROM users WHERE email = ?',
        [email]
      );

      if (!result.rows || result.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const user: any = result.rows[0];
      console.log('✅ Found user:', user.email);

      // bcrypt.compare (default export handling)
      const bcryptCompare = bcrypt.compare || (bcrypt as any).default?.compare;
      const isValid = await bcryptCompare(password, user.password_hash);

      console.log('🔐 Password valid:', isValid);

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      console.log('✅ Login success');

      return new Response(
        JSON.stringify({
          success: true,
          data: { user: userResponse, token },
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

      const checkResult = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (checkResult.rows && checkResult.rows.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: '이미 가입된 이메일입니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const bcryptGenSalt = bcrypt.genSalt || (bcrypt as any).default?.genSalt;
      const bcryptHash = bcrypt.hash || (bcrypt as any).default?.hash;

      const salt = await bcryptGenSalt(10);
      const hashedPassword = await bcryptHash(password, salt);

      await conn.execute(
        'INSERT INTO users (email, password_hash, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, name, phone || '', 'user', new Date().toISOString()]
      );

      const savedResult = await conn.execute(
        'SELECT id, email, name, phone, role FROM users WHERE email = ?',
        [email]
      );

      const savedUser: any = savedResult.rows[0];

      const token = JWTUtils.generateToken({
        userId: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
      });

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
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
