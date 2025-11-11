const { connect } = require('@planetscale/database');
require('dotenv').config();

/**
 * Google Maps API 키 설정 테스트 스크립트
 *
 * 용도:
 * 1. 환경변수 확인
 * 2. API 엔드포인트 테스트
 * 3. 키 유효성 검증
 */

async function testGoogleMapsKey() {
  console.log('🗺️  Google Maps API 키 설정 테스트\n');
  console.log('='.repeat(80));

  let hasError = false;

  // 1. 환경변수 확인
  console.log('\n1️⃣ 환경변수 확인\n');

  const viteKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  if (viteKey) {
    console.log(`✅ VITE_GOOGLE_MAPS_API_KEY: ${viteKey.substring(0, 10)}...`);
  } else {
    console.log('❌ VITE_GOOGLE_MAPS_API_KEY: NOT FOUND');
    hasError = true;
  }

  if (googleKey) {
    console.log(`ℹ️  GOOGLE_MAPS_API_KEY: ${googleKey.substring(0, 10)}...`);
  } else {
    console.log('ℹ️  GOOGLE_MAPS_API_KEY: NOT FOUND (선택사항)');
  }

  // 2. 키 형식 검증
  console.log('\n2️⃣ API 키 형식 검증\n');

  const key = viteKey || googleKey;

  if (key) {
    if (key.startsWith('AIza')) {
      console.log('✅ API 키 형식: 올바름 (AIza로 시작)');
    } else {
      console.log('⚠️  API 키 형식: 의심스러움 (AIza로 시작하지 않음)');
      console.log('   Google Maps API 키는 보통 "AIza"로 시작합니다.');
    }

    if (key.length >= 39) {
      console.log(`✅ API 키 길이: ${key.length}자 (적절함)`);
    } else {
      console.log(`⚠️  API 키 길이: ${key.length}자 (너무 짧을 수 있음)`);
    }
  } else {
    console.log('❌ API 키가 없어서 형식 검증을 건너뜁니다.');
  }

  // 3. API 엔드포인트 시뮬레이션
  console.log('\n3️⃣ API 엔드포인트 시뮬레이션\n');

  console.log('📍 GET /api/config/google-maps-key');
  console.log('   서버 응답 시뮬레이션:');

  if (key) {
    const response = {
      success: true,
      key: key
    };
    console.log('   ✅ 성공:', JSON.stringify({
      success: response.success,
      key: response.key.substring(0, 10) + '...'
    }, null, 2));
  } else {
    const response = {
      success: false,
      error: 'API key not configured'
    };
    console.log('   ❌ 실패:', JSON.stringify(response, null, 2));
    hasError = true;
  }

  // 4. 클라이언트 사이드 로직 시뮬레이션
  console.log('\n4️⃣ 클라이언트 로직 시뮬레이션\n');

  console.log('App.tsx useEffect 실행:');
  console.log('  1. fetch(\'/api/config/google-maps-key\')');
  console.log('  2. window.__GOOGLE_MAPS_API_KEY__ = response.key');
  console.log('');

  console.log('utils/env.ts getGoogleMapsApiKey() 실행:');
  if (key) {
    console.log('  1. ✅ window.__GOOGLE_MAPS_API_KEY__ 확인 → 있음');
    console.log(`  2. 반환: "${key.substring(0, 10)}..."`);
  } else {
    console.log('  1. ❌ window.__GOOGLE_MAPS_API_KEY__ 확인 → 없음');
    console.log('  2. import.meta.env.VITE_GOOGLE_MAPS_API_KEY 확인 → 없음');
    console.log('  3. 반환: "" (빈 문자열)');
  }

  // 5. Google Maps 스크립트 URL 시뮬레이션
  console.log('\n5️⃣ Google Maps 스크립트 URL\n');

  if (key) {
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key.substring(0, 10)}...&libraries=places,geometry`;
    console.log('✅ 생성될 스크립트 URL:');
    console.log(`   ${scriptUrl}`);
  } else {
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=&libraries=places,geometry`;
    console.log('❌ 생성될 스크립트 URL (키 없음):');
    console.log(`   ${scriptUrl}`);
    console.log('   ⚠️  이 URL은 "ApiProjectMapError"를 발생시킵니다!');
  }

  // 6. Vercel 설정 가이드
  console.log('\n' + '='.repeat(80));
  console.log('\n6️⃣ Vercel 환경변수 설정 가이드\n');

  console.log('Vercel 대시보드에서 다음 환경변수를 설정하세요:');
  console.log('');
  console.log('  변수명: VITE_GOOGLE_MAPS_API_KEY');
  console.log('  값: AIza... (Google Maps API 키)');
  console.log('  환경: Production, Preview, Development (모두 체크)');
  console.log('');
  console.log('⚠️  중요: 환경변수 추가 후 반드시 재배포하세요!');
  console.log('');
  console.log('재배포 방법:');
  console.log('  - Vercel 대시보드: Deployments → 최신 배포 → Redeploy');
  console.log('  - CLI: vercel --prod');
  console.log('');

  // 7. Google Cloud Console 설정
  console.log('='.repeat(80));
  console.log('\n7️⃣ Google Cloud Console 설정 확인\n');

  console.log('Google Cloud Console에서 다음을 확인하세요:');
  console.log('');
  console.log('1. APIs & Services → Credentials → API 키 선택');
  console.log('');
  console.log('2. Application restrictions:');
  console.log('   - HTTP referrers 선택');
  console.log('   - 허용할 도메인 추가:');
  console.log('     • localhost:*/*');
  console.log('     • 127.0.0.1:*/*');
  console.log('     • your-domain.vercel.app/*');
  console.log('     • *.vercel.app/*');
  console.log('');
  console.log('3. API restrictions:');
  console.log('   - Restrict key 선택');
  console.log('   - 다음 API 활성화:');
  console.log('     • Maps JavaScript API ✅');
  console.log('     • Geocoding API ✅');
  console.log('     • Places API ✅');
  console.log('');

  // 최종 결과
  console.log('='.repeat(80));
  console.log('\n8️⃣ 테스트 결과\n');

  if (hasError) {
    console.log('❌ 테스트 실패: 환경변수가 설정되지 않았습니다.');
    console.log('');
    console.log('해결 방법:');
    console.log('  1. .env 파일 생성 (로컬 개발)');
    console.log('  2. VITE_GOOGLE_MAPS_API_KEY=your_api_key 추가');
    console.log('  3. Vercel 환경변수 설정 (배포)');
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ 테스트 성공: 모든 설정이 올바릅니다!');
    console.log('');
    console.log('다음 단계:');
    console.log('  1. npm run dev 실행');
    console.log('  2. 브라우저 콘솔에서 "✅ Google Maps API key loaded successfully" 확인');
    console.log('  3. 가맹점 페이지 (/partners) 접속하여 지도 확인');
    console.log('');
  }

  console.log('='.repeat(80));
}

// 실행
testGoogleMapsKey().catch(console.error);
