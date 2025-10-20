/**
 * ESM API 파일을 CommonJS로 변환
 *
 * Vercel serverless functions은 CommonJS 형식을 사용하므로
 * import/export를 require/module.exports로 변환해야 함
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * ESM을 CommonJS로 변환
 */
function convertToCommonJS(content, filename) {
  let result = content;

  // 1. TypeScript 타입 제거
  result = result.replace(/:\s*Request/g, '');
  result = result.replace(/:\s*Response/g, '');
  result = result.replace(/:\s*any/g, '');
  result = result.replace(/!(\.|;)/g, '$1'); // TypeScript non-null assertion 제거

  // 2. import 문을 require로 변환
  // import { connect } from '@planetscale/database'; → const { connect } = require('@planetscale/database');
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, 'const {$1} = require(\'$2\')');

  // import foo from 'bar'; → const foo = require('bar');
  result = result.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require(\'$2\')');

  // 3. export function을 module.exports로 변환
  // export async function GET(request) { → exports.GET = async function(req, res) {
  result = result.replace(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g, 'module.exports = async function handler(req, res) {');
  result = result.replace(/export\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g, 'module.exports = function handler(req, res) {');

  // 4. export { } 형식 제거 (단일 handler로 통합)
  result = result.replace(/export\s+\{[^}]+\}/g, '');

  // 5. export const를 module.exports로 변환
  result = result.replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =');

  // 6. new Response를 res.status().json()으로 변환
  result = result.replace(
    /return\s+new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\),\s*\{[^}]*status:\s*(\d+)[^}]*\}\s*\)/g,
    'return res.status($2).json($1)'
  );

  // 7. request.headers.get을 req.headers로 변경
  result = result.replace(/request\.headers\.get\(['"]([^'"]+)['"]\)/g, 'req.headers[\'$1\']');

  return result;
}

/**
 * API 파일들을 CommonJS로 변환
 */
async function convertFiles() {
  console.log('🔄 ESM → CommonJS 변환 시작...\n');

  const apiDir = path.join(projectRoot, 'api');
  let successCount = 0;
  let failCount = 0;

  function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');

          // ESM import가 있는 파일만 변환
          if (content.includes('import ') || content.includes('export ')) {
            const converted = convertToCommonJS(content, entry.name);
            fs.writeFileSync(fullPath, converted, 'utf-8');

            const relativePath = path.relative(projectRoot, fullPath);
            console.log(`✅ ${relativePath}`);
            successCount++;
          }
        } catch (error) {
          const relativePath = path.relative(projectRoot, fullPath);
          console.error(`❌ ${relativePath}:`, error.message);
          failCount++;
        }
      }
    }
  }

  processDirectory(apiDir);

  console.log(`\n🎉 변환 완료!`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${failCount}개`);
}

// 실행
convertFiles().catch(console.error);
