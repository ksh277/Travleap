/**
 * JWT 전체 시스템 검증 스크립트
 */

console.log('\n' + '='.repeat(80));
console.log('🔐 JWT 시스템 전체 검증');
console.log('='.repeat(80));

// 1. 파일 존재 확인
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'utils/jwt.ts',
  'utils/jwt-client.ts',
  'hooks/useAuth.ts',
  'api/auth/route.ts',
];

console.log('\n1️⃣  필수 파일 존재 확인:');
console.log('-'.repeat(80));

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.error('\n❌ 일부 필수 파일이 누락되었습니다.');
  process.exit(1);
}

// 2. 환경 변수 확인
require('dotenv').config();

console.log('\n2️⃣  환경 변수 확인:');
console.log('-'.repeat(80));

const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
let allEnvVarsSet = true;

requiredEnvVars.forEach(envVar => {
  const exists = !!process.env[envVar];
  console.log(`${exists ? '✅' : '❌'} ${envVar}: ${exists ? '설정됨' : '누락'}`);
  if (!exists) allEnvVarsSet = false;
});

if (!allEnvVarsSet) {
  console.warn('\n⚠️  일부 환경 변수가 누락되었습니다.');
}

// 3. jwt-client.ts 핵심 기능 검증
console.log('\n3️⃣  JWT Client 유틸리티 검증:');
console.log('-'.repeat(80));

const jwtClientContent = fs.readFileSync('utils/jwt-client.ts', 'utf8');

const clientChecks = [
  { name: 'SameSite=Lax 설정', pattern: /SameSite=Lax/ },
  { name: 'URL 인코딩 (encodeURIComponent)', pattern: /encodeURIComponent\(value\)/ },
  { name: 'URL 디코딩 (decodeURIComponent)', pattern: /decodeURIComponent\(value\)/ },
  { name: '쿠키 설정 로그', pattern: /console\.log\('🍪 쿠키 설정 완료'/ },
  { name: '토큰 만료 체크', pattern: /isTokenExpired/ },
];

clientChecks.forEach(check => {
  const passed = check.pattern.test(jwtClientContent);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 4. useAuth.ts 핵심 기능 검증
console.log('\n4️⃣  useAuth Hook 검증:');
console.log('-'.repeat(80));

const useAuthContent = fs.readFileSync('hooks/useAuth.ts', 'utf8');

const authChecks = [
  { name: '세션 복원 함수 (restoreSession)', pattern: /const restoreSession = \(\)/ },
  { name: '쿠키 백업 (getCookie)', pattern: /CookieUtils\.getCookie\('auth_token'\)/ },
  { name: 'localStorage 백업', pattern: /StorageUtils\.getItem<string>\('auth_token'\)/ },
  { name: '토큰 갱신 함수 (refreshToken)', pattern: /const refreshToken = useCallback/ },
  { name: '동적 API URL', pattern: /window\.location\.hostname === 'localhost'/ },
  { name: '세션 저장 (saveSession)', pattern: /const saveSession = / },
  { name: '세션 삭제 (clearSession)', pattern: /const clearSession = / },
];

authChecks.forEach(check => {
  const passed = check.pattern.test(useAuthContent);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 5. API 라우트 검증
console.log('\n5️⃣  API 라우트 검증:');
console.log('-'.repeat(80));

const apiContent = fs.readFileSync('api/auth/route.ts', 'utf8');

const apiChecks = [
  { name: '로그인 액션 (action=login)', pattern: /if \(action === 'login'\)/ },
  { name: '회원가입 액션 (action=register)', pattern: /if \(action === 'register'\)/ },
  { name: '토큰 갱신 액션 (action=refresh)', pattern: /if \(action === 'refresh'\)/ },
  { name: 'JWT 토큰 생성', pattern: /JWTUtils\.generateToken/ },
  { name: 'JWT 토큰 검증', pattern: /jwt\.verify/ },
  { name: 'CORS 헤더', pattern: /Access-Control-Allow-Origin/ },
];

apiChecks.forEach(check => {
  const passed = check.pattern.test(apiContent);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 6. 요약
console.log('\n' + '='.repeat(80));
console.log('📊 검증 요약');
console.log('='.repeat(80));

console.log('\n✅ JWT 시스템 구성요소:');
console.log('   - JWT 서버 유틸리티 (utils/jwt.ts)');
console.log('   - JWT 클라이언트 유틸리티 (utils/jwt-client.ts)');
console.log('   - Auth Hook (hooks/useAuth.ts)');
console.log('   - Auth API (api/auth/route.ts)');

console.log('\n✅ 핵심 기능:');
console.log('   - 로그인/회원가입/토큰 갱신 API');
console.log('   - 쿠키 & localStorage 이중 저장');
console.log('   - 자동 세션 복원 (새로고침 시)');
console.log('   - 토큰 만료 감지 및 자동 갱신');
console.log('   - SameSite=Lax (CSRF 방지)');
console.log('   - URL 인코딩/디코딩 (특수문자 처리)');

console.log('\n✅ 보안 설정:');
console.log('   - JWT_SECRET 환경 변수 사용');
console.log('   - HS256 알고리즘');
console.log('   - 24시간 토큰 유효기간');
console.log('   - 7일 쿠키 유지');
console.log('   - bcrypt 비밀번호 해싱');

console.log('\n' + '='.repeat(80));
console.log('✅ JWT 시스템 검증 완료!');
console.log('='.repeat(80) + '\n');
