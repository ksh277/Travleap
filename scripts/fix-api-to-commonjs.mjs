/**
 * ESM API 파일을 Vercel Serverless Function 형식(CommonJS)으로 변환
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const esmFiles = [
  'api/activities/route.js',
  'api/admin/commission-settings.js',
  'api/auth/route.js',
  'api/banners/route.js',
  'api/bookings/create-with-lock.js',
  'api/bookings/return-inspect.js',
  'api/categories/route.js',
  'api/db/route.js',
  'api/payments/confirm.js',
  'api/payments/webhook.js',
  'api/pms/sync/route.js',
  'api/rentcar/payment.js',
  'api/rentcar/vendor-register.js',
  'api/rentcar/vendor-vehicles.js',
  'api/reviews/recent/route.js',
  'api/shared/activities-module.js',
  'api/shared/banners-module.js',
  'api/shared/lodging.js',
  'api/shared/newsletter.js'
];

function convertToCommonJS(content) {
  let result = content;

  // 1. TypeScript 타입 제거
  result = result.replace(/:\s*Request/g, '');
  result = result.replace(/:\s*Response/g, '');
  result = result.replace(/:\s*any\b/g, '');
  result = result.replace(/:\s*string\b/g, '');
  result = result.replace(/:\s*number\b/g, '');
  result = result.replace(/:\s*boolean\b/g, '');
  result = result.replace(/!(\.|;|\))/g, '$1'); // ! 제거

  // 2. import 문을 require로 변환
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, source) => {
    const cleanImports = imports
      .split(',')
      .map(imp => imp.trim().replace(/^type\s+/, ''))
      .filter(imp => !imp.startsWith('type '))
      .join(', ');
    return `const { ${cleanImports} } = require('${source}')`;
  });

  result = result.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require(\'$2\')');

  // 3. export interface/type 제거
  result = result.replace(/export\s+(interface|type)\s+\w+[^;{]*(\{[^}]*\}|=[^;]+);?/gs, '');

  // 4. export function들을 찾아서 하나의 handler로 통합
  const exportFunctions = [];
  const functionRegex = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g;

  let match;
  while ((match = functionRegex.exec(result)) !== null) {
    exportFunctions.push({
      name: match[1],
      body: match[2]
    });
  }

  // export function 제거
  result = result.replace(/export\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
  result = result.replace(/export\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');

  // 5. export const 제거
  result = result.replace(/export\s+const\s+\w+\s*=[^;]+;/g, '');
  result = result.replace(/export\s+\{[^}]+\}/g, '');

  // 6. 통합된 handler 생성
  if (exportFunctions.length > 0) {
    let handlerCode = '\nmodule.exports = async function handler(req, res) {\n';

    // GET, POST, OPTIONS 등 메서드별 처리
    if (exportFunctions.some(f => f.name === 'GET' || f.name === 'POST' || f.name === 'OPTIONS')) {
      // HTTP 메서드 기반 라우팅
      exportFunctions.forEach((func, idx) => {
        if (idx === 0) {
          handlerCode += `  if (req.method === '${func.name}') {\n`;
        } else {
          handlerCode += `  } else if (req.method === '${func.name}') {\n`;
        }

        // 함수 본문을 req, res로 변환
        let funcBody = func.body
          .replace(/request\.headers\.get\(['"]([^'"]+)['"]\)/g, "req.headers['$1']")
          .replace(/\brequest\b/g, 'req')
          .replace(/return\s+new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\)\s*,\s*\{\s*status:\s*(\d+)[^}]*\}\s*\)/g, 'return res.status($2).json($1)')
          .replace(/return\s+new\s+Response\s*\(\s*null\s*,\s*\{[^}]*\}\s*\)/g, 'return res.status(200).end()')
          .replace(/return\s+new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\)\s*\)/g, 'return res.status(200).json($1)');

        handlerCode += funcBody;
      });

      handlerCode += '  } else {\n';
      handlerCode += '    return res.status(405).json({ success: false, error: \'Method not allowed\' });\n';
      handlerCode += '  }\n';
    }

    handlerCode += '};\n';

    result += handlerCode;
  }

  // 7. 빈 줄 정리
  result = result.replace(/\n{4,}/g, '\n\n\n');

  // 8. 남은 TS 타입 정리
  result = result.replace(/:\s*\w+(\[\])?\s*=/g, ' =');
  result = result.replace(/\s+as\s+\w+/g, '');

  return result;
}

async function convertFiles() {
  console.log('🔄 ESM → CommonJS 변환 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const file of esmFiles) {
    const filePath = path.join(projectRoot, file);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  ${file} (파일 없음)`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // 이미 CommonJS면 스킵
      if (!content.includes('import ') && !content.includes('export ')) {
        console.log(`⏭️  ${file} (이미 CommonJS)`);
        continue;
      }

      const converted = convertToCommonJS(content);
      fs.writeFileSync(filePath, converted, 'utf-8');

      console.log(`✅ ${file}`);
      successCount++;

    } catch (error) {
      console.error(`❌ ${file}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n🎉 변환 완료!`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   스킵: ${esmFiles.length - successCount - failCount}개`);
  console.log(`   실패: ${failCount}개`);
}

convertFiles().catch(console.error);
