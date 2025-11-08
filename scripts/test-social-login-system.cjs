const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function testSocialLogin() {
  console.log('🔍 소셜 로그인 시스템 진단\n');
  console.log('=' .repeat(60));

  // 1. 환경 변수 확인
  console.log('\n1️⃣  환경 변수 확인:');
  console.log('─'.repeat(60));

  const googleClientId = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  const kakaoAppKey = process.env.VITE_KAKAO_APP_KEY;
  const naverClientId = process.env.VITE_NAVER_CLIENT_ID;

  console.log(`  Google Client ID: ${googleClientId ? '✅ SET (' + googleClientId.substring(0, 20) + '...)' : '❌ MISSING'}`);
  console.log(`  Kakao App Key: ${kakaoAppKey ? '✅ SET (' + kakaoAppKey + ')' : '❌ MISSING'}`);
  console.log(`  Naver Client ID: ${naverClientId ? '✅ SET (' + naverClientId + ')' : '❌ MISSING (비어있음!)'}`);

  // 2. Neon DB 연결 테스트
  console.log('\n2️⃣  Neon DB 연결 테스트:');
  console.log('─'.repeat(60));

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('  ❌ DATABASE_URL이 설정되지 않았습니다!');
    return;
  }

  const sql = neon(databaseUrl);

  try {
    await sql`SELECT 1`;
    console.log('  ✅ Neon DB 연결 성공');
  } catch (error) {
    console.log('  ❌ Neon DB 연결 실패:', error.message);
    return;
  }

  // 3. provider 컬럼 확인
  console.log('\n3️⃣  Users 테이블 스키마 확인:');
  console.log('─'.repeat(60));

  try {
    const schema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('provider', 'provider_id', 'email', 'name')
    `;

    const hasProvider = schema.some(col => col.column_name === 'provider');
    const hasProviderId = schema.some(col => col.column_name === 'provider_id');
    const hasEmail = schema.some(col => col.column_name === 'email');
    const hasName = schema.some(col => col.column_name === 'name');

    console.log(`  email: ${hasEmail ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  name: ${hasName ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  provider: ${hasProvider ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  provider_id: ${hasProviderId ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (error) {
    console.log('  ❌ 스키마 확인 실패:', error.message);
  }

  // 4. 기존 소셜 로그인 사용자 확인
  console.log('\n4️⃣  기존 소셜 로그인 사용자 확인:');
  console.log('─'.repeat(60));

  try {
    const socialUsers = await sql`
      SELECT provider, COUNT(*) as count
      FROM users
      WHERE provider IS NOT NULL
      GROUP BY provider
    `;

    if (socialUsers.length > 0) {
      console.log('  ✅ 소셜 로그인 사용자 발견:');
      socialUsers.forEach(row => {
        console.log(`    - ${row.provider}: ${row.count}명`);
      });
    } else {
      console.log('  ℹ️  소셜 로그인 사용자 없음 (새 시스템이면 정상)');
    }
  } catch (error) {
    console.log('  ❌ 쿼리 실패:', error.message);
  }

  // 5. 소셜 로그인 테스트 쿼리
  console.log('\n5️⃣  소셜 로그인 쿼리 테스트 (Google):');
  console.log('─'.repeat(60));

  try {
    const testProvider = 'google';
    const testProviderId = '115593965333726809221'; // 실제 DB에 있는 사용자

    const testQuery = await sql`
      SELECT * FROM users
      WHERE provider = ${testProvider}
      AND provider_id = ${testProviderId}
    `;

    if (testQuery.length > 0) {
      console.log('  ✅ 소셜 로그인 쿼리 성공');
      console.log(`    사용자: ${testQuery[0].email} (${testQuery[0].name})`);
    } else {
      console.log('  ⚠️  테스트 사용자를 찾을 수 없음');
    }
  } catch (error) {
    console.log('  ❌ 쿼리 실패:', error.message);
  }

  // 6. INSERT 테스트 (롤백)
  console.log('\n6️⃣  소셜 로그인 INSERT 테스트 (롤백):');
  console.log('─'.repeat(60));

  try {
    const testEmail = `test_${Date.now()}@example.com`;
    const testInsert = await sql`
      INSERT INTO users (email, name, provider, provider_id, role, password_hash, created_at, updated_at, username)
      VALUES (
        ${testEmail},
        'Test User',
        'google',
        '999999999999',
        'user',
        '',
        NOW(),
        NOW(),
        ${`test_${Date.now()}`}
      )
      RETURNING id, email
    `;

    if (testInsert.length > 0) {
      console.log('  ✅ INSERT 성공:', testInsert[0].email);

      // 테스트 데이터 삭제
      await sql`DELETE FROM users WHERE id = ${testInsert[0].id}`;
      console.log('  ✅ 테스트 데이터 삭제 완료 (롤백)');
    }
  } catch (error) {
    console.log('  ❌ INSERT 실패:', error.message);
    console.log('    에러 상세:', error);
  }

  // 7. 최종 진단
  console.log('\n' + '='.repeat(60));
  console.log('📊 최종 진단 결과:');
  console.log('='.repeat(60));
  console.log('');

  const issues = [];
  const ok = [];

  if (!naverClientId || naverClientId.trim() === '') {
    issues.push('❌ VITE_NAVER_CLIENT_ID가 비어있음 → 네이버 로그인 불가능');
  } else {
    ok.push('✅ Naver Client ID 설정됨');
  }

  if (googleClientId) {
    ok.push('✅ Google Client ID 설정됨');
  } else {
    issues.push('❌ Google Client ID 없음');
  }

  if (kakaoAppKey) {
    ok.push('✅ Kakao App Key 설정됨');
  } else {
    issues.push('❌ Kakao App Key 없음');
  }

  console.log('정상 항목:');
  ok.forEach(item => console.log('  ' + item));

  if (issues.length > 0) {
    console.log('\n⚠️  문제 발견:');
    issues.forEach(item => console.log('  ' + item));
    console.log('\n💡 해결 방법:');
    if (!naverClientId || naverClientId.trim() === '') {
      console.log('  1. .env 파일을 열고 VITE_NAVER_CLIENT_ID에 네이버 애플리케이션 Client ID를 입력하세요');
      console.log('  2. 네이버 개발자 센터(https://developers.naver.com)에서 발급받을 수 있습니다');
    }
  } else {
    console.log('\n✅ 모든 환경 변수가 올바르게 설정되었습니다!');
  }

  console.log('');
}

testSocialLogin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
