/**
 * TypeScript API 파일을 JavaScript로 변환
 *
 * 변환 규칙:
 * 1. 모든 타입 정의 제거
 * 2. import에서 타입 import 제거
 * 3. 인터페이스 제거
 * 4. 타입 어노테이션 제거
 * 5. .ts 확장자를 .js로 변경
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// TypeScript 파일 목록
const tsFiles = [
  'api/activities/route.ts',
  'api/admin/commission-settings.ts',
  'api/auth/route.ts',
  'api/banners/route.ts',
  'api/bookings/create-with-lock.ts',
  'api/bookings/return-inspect.ts',
  'api/categories/route.ts',
  'api/db/route.ts',
  'api/listings/[id].ts',
  'api/payments/confirm.ts',
  'api/payments/webhook.ts',
  'api/pms/sync/route.ts',
  'api/rentcar/payment.ts',
  'api/rentcar/vendor-register.ts',
  'api/rentcar/vendor-vehicles.ts',
  'api/reviews/recent/route.ts',
  'api/shared/activities-module.ts',
  'api/shared/banners-module.ts',
  'api/shared/listings.ts',
  'api/shared/lodging.ts',
  'api/shared/newsletter.ts',
  'api/shared/partners.ts'
];

/**
 * TypeScript 코드를 JavaScript로 변환
 */
function convertTsToJs(content) {
  let result = content;

  // 1. interface 제거
  result = result.replace(/export interface \w+\s*\{[^}]*\}/gs, '');
  result = result.replace(/interface \w+\s*\{[^}]*\}/gs, '');

  // 2. type 정의 제거
  result = result.replace(/export type \w+\s*=\s*[^;]+;/g, '');
  result = result.replace(/type \w+\s*=\s*[^;]+;/g, '');

  // 3. 타입 import 제거
  result = result.replace(/import type \{[^}]+\} from [^;]+;/g, '');
  result = result.replace(/import \{([^}]+)\} from/g, (match, imports) => {
    // type 키워드가 있는 import 제거
    const cleanImports = imports
      .split(',')
      .filter(imp => !imp.trim().startsWith('type '))
      .join(',');
    return cleanImports.trim() ? `import {${cleanImports}} from` : '';
  });

  // 4. 함수 파라미터의 타입 어노테이션 제거
  result = result.replace(/\(([^)]+)\):\s*Promise<\w+>/g, (match, params) => {
    const cleanParams = params
      .split(',')
      .map(param => {
        // 파라미터명만 추출 (타입 제거)
        const paramName = param.split(':')[0].trim();
        return paramName;
      })
      .join(', ');
    return `(${cleanParams})`;
  });

  // 5. 변수 타입 어노테이션 제거
  result = result.replace(/:\s*\w+(\[\])?\s*=/g, ' =');
  result = result.replace(/:\s*\w+(\[\])?\s*;/g, ';');

  // 6. 함수 반환 타입 제거
  result = result.replace(/\):\s*Promise<[^>]+>/g, ')');
  result = result.replace(/\):\s*\w+\s*\{/g, ') {');

  // 7. as 타입 캐스팅 제거
  result = result.replace(/\s+as\s+\w+/g, '');

  // 8. .ts import를 .js로 변경
  result = result.replace(/from ['"](.+)\.ts['"]/g, "from '$1.js'");

  // 9. 빈 줄 정리 (3개 이상의 연속된 빈 줄을 2개로)
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result;
}

/**
 * 파일 변환 실행
 */
async function convertFiles() {
  console.log('🔄 TypeScript → JavaScript 변환 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const tsFile of tsFiles) {
    const tsPath = path.join(projectRoot, tsFile);
    const jsFile = tsFile.replace(/\.ts$/, '.js');
    const jsPath = path.join(projectRoot, jsFile);

    try {
      // TypeScript 파일 읽기
      const tsContent = fs.readFileSync(tsPath, 'utf-8');

      // JavaScript로 변환
      const jsContent = convertTsToJs(tsContent);

      // JavaScript 파일 저장
      fs.writeFileSync(jsPath, jsContent, 'utf-8');

      // TypeScript 파일 삭제
      fs.unlinkSync(tsPath);

      console.log(`✅ ${tsFile} → ${jsFile}`);
      successCount++;

    } catch (error) {
      console.error(`❌ ${tsFile} 변환 실패:`, error.message);
      failCount++;
    }
  }

  console.log(`\n🎉 변환 완료!`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${failCount}개`);

  if (failCount > 0) {
    console.log('\n⚠️  일부 파일 변환에 실패했습니다. 수동으로 확인해주세요.');
  }
}

// 실행
convertFiles().catch(console.error);
