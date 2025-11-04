/**
 * x-user-id 헤더를 JWT 인증으로 자동 마이그레이션하는 스크립트
 *
 * 변경사항:
 * 1. req.headers['x-user-id'] → req.user.userId
 * 2. withAuth 미들웨어 import 추가
 * 3. module.exports에 withAuth 래퍼 적용
 * 4. CORS 헤더에서 x-user-id 제거
 */

const fs = require('fs');
const path = require('path');

// 마이그레이션할 파일 목록
const filesToMigrate = [
  'pages/api/user/address.js',
  'pages/api/user/change-password.js',
  'pages/api/user/payments.js',
  'pages/api/payments/delete.js',
  'api/user/address.js',
  'api/user/change-password.js',
  'api/user/points.js',
  'api/user/profile.js',
  'api/user/payments.js',
  'api/payments/delete.js',
  'api/cart/update.js'
];

function migrateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ 파일 없음: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 1. withAuth import 추가 (이미 있으면 스킵)
  if (!content.includes('withAuth')) {
    // require 문 찾기
    const requireMatch = content.match(/^(const .+?require.+?;\n)+/m);
    if (requireMatch) {
      const lastRequire = requireMatch[0];
      const depth = filePath.split('/').length - 2; // api/ 제외
      const relativePath = '../'.repeat(depth) + 'utils/auth-middleware';

      const newImport = `const { withAuth } = require('${relativePath}');\n`;
      content = content.replace(lastRequire, lastRequire + newImport);
      modified = true;
    }
  }

  // 2. x-user-id 헤더 제거
  if (content.includes('x-user-id')) {
    content = content.replace(/,\s*x-user-id/g, '');
    content = content.replace(/x-user-id,\s*/g, '');
    modified = true;
  }

  // 3. req.headers['x-user-id'] → req.user.userId
  if (content.includes("req.headers['x-user-id']")) {
    content = content.replace(/req\.headers\['x-user-id'\]/g, 'req.user.userId');
    modified = true;
  }

  // 4. const userId = ... || req.query.userId 패턴 제거
  content = content.replace(/const userId = .+\|\| req\.query\.userId;?/g, 'const userId = req.user.userId;');

  // 5. module.exports 패턴 변경
  if (content.match(/module\.exports\s*=\s*async function/)) {
    // async function handler로 변경
    content = content.replace(
      /module\.exports\s*=\s*async function\s+handler/,
      'async function handler'
    );

    // 마지막에 withAuth 래퍼 추가
    if (!content.includes('withAuth(handler')) {
      content = content.replace(
        /^};?\s*$/m,
        '}\n\n// JWT 인증 적용\nmodule.exports = withAuth(handler, { requireAuth: true });\n'
      );
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ 마이그레이션 완료: ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️ 변경사항 없음: ${filePath}`);
    return false;
  }
}

// 실행
console.log('🔄 JWT 인증 마이그레이션 시작...\n');

let successCount = 0;
let totalCount = 0;

for (const file of filesToMigrate) {
  totalCount++;
  if (migrateFile(file)) {
    successCount++;
  }
}

console.log(`\n✨ 완료: ${successCount}/${totalCount} 파일 마이그레이션됨`);
