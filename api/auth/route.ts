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
      'Access-Control-Allow-Credentials': 'true',
    };

    // 2. URL 파싱
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log('🔑 Auth API called:', {
      action,
      method: request.method,
      url: request.url,
      origin,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });

    // 3. 환경변수 확인
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set in environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
          details: 'JWT_SECRET not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set in environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
          details: 'DATABASE_URL not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Body 파싱
    const body = await request.json() as any;
    const { email, password, name, phone } = body;

    console.log('📧 Request body:', { email, hasPassword: !!password, name, phone });

    // 5. Dynamic imports
    const [{ connect }, bcrypt, { JWTUtils }] = await Promise.all([
      import('@planetscale/database'),
      import('bcryptjs'),
      import('../../utils/jwt')
    ]);

    console.log('✅ Modules loaded successfully');

    // 6. DB 연결
    const conn = connect({ url: process.env.DATABASE_URL! });
    console.log('✅ Database connection established');

    // 7. 로그인
    if (action === 'login') {
      console.log('🔐 Processing login for:', email);

      if (!email || !password) {
        console.error('❌ Missing email or password');
        return new Response(
          JSON.stringify({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const result = await conn.execute(
          'SELECT id, email, name, phone, role, password_hash FROM users WHERE email = ?',
          [email]
        );

        console.log('📊 DB query result:', {
          rowCount: result.rows?.length || 0,
          hasRows: !!(result.rows && result.rows.length > 0)
        });

        if (!result.rows || result.rows.length === 0) {
          console.error('❌ User not found:', email);
          return new Response(
            JSON.stringify({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const user: any = result.rows[0];
        console.log('✅ Found user:', { email: user.email, role: user.role, hasPasswordHash: !!user.password_hash });

        // bcrypt.compare (default export handling)
        const bcryptCompare = bcrypt.compare || (bcrypt as any).default?.compare;

        if (!bcryptCompare) {
          console.error('❌ bcrypt.compare function not available');
          throw new Error('Password validation function not available');
        }

        const isValid = await bcryptCompare(password, user.password_hash);

        console.log('🔐 Password validation result:', isValid);

        if (!isValid) {
          console.error('❌ Invalid password for user:', email);
          return new Response(
            JSON.stringify({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('🎫 Generating JWT token...');
        const token = JWTUtils.generateToken({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        console.log('✅ Token generated, length:', token.length);

        const userResponse = {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        };

        console.log('✅ Login successful for:', email);

        return new Response(
          JSON.stringify({
            success: true,
            data: { user: userResponse, token },
            message: '로그인 성공',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (dbError) {
        console.error('❌ Database or password validation error:', dbError);
        return new Response(
          JSON.stringify({
            success: false,
            error: '로그인 처리 중 오류가 발생했습니다.',
            details: dbError instanceof Error ? dbError.message : String(dbError)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. 회원가입
    if (action === 'register') {
      console.log('📝 Processing registration for:', email);

      if (!email || !password || !name) {
        console.error('❌ Missing required fields');
        return new Response(
          JSON.stringify({ success: false, error: '필수 항목을 입력해주세요.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const checkResult = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);

        if (checkResult.rows && checkResult.rows.length > 0) {
          console.error('❌ Email already exists:', email);
          return new Response(
            JSON.stringify({ success: false, error: '이미 가입된 이메일입니다.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('🔐 Hashing password...');
        const bcryptGenSalt = bcrypt.genSalt || (bcrypt as any).default?.genSalt;
        const bcryptHash = bcrypt.hash || (bcrypt as any).default?.hash;

        const salt = await bcryptGenSalt(10);
        const hashedPassword = await bcryptHash(password, salt);

        console.log('💾 Inserting user into database...');
        await conn.execute(
          'INSERT INTO users (email, password_hash, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [email, hashedPassword, name, phone || '', 'user', new Date().toISOString()]
        );

        const savedResult = await conn.execute(
          'SELECT id, email, name, phone, role FROM users WHERE email = ?',
          [email]
        );

        const savedUser: any = savedResult.rows[0];
        console.log('✅ User created:', savedUser.email);

        console.log('🎫 Generating JWT token...');
        const token = JWTUtils.generateToken({
          userId: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
          role: savedUser.role,
        });

        console.log('✅ Registration successful for:', email);

        return new Response(
          JSON.stringify({
            success: true,
            data: { user: savedUser, token },
            message: '회원가입이 완료되었습니다.',
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (regError) {
        console.error('❌ Registration error:', regError);
        return new Response(
          JSON.stringify({
            success: false,
            error: '회원가입 처리 중 오류가 발생했습니다.',
            details: regError instanceof Error ? regError.message : String(regError)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: '잘못된 요청입니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal auth error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

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
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
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
