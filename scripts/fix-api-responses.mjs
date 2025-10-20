/**
 * new Response()를 res.status().json()으로 변환
 * ! (non-null assertion) 제거
 * CORS 헤더를 res.setHeader로 변경
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function fixResponses(content) {
  let result = content;

  // 1. ! 제거 (TypeScript non-null assertion)
  result = result.replace(/DATABASE_URL!/g, 'DATABASE_URL');
  result = result.replace(/(\w+)!/g, '$1');

  // 2. new Response with JSON.stringify를 res.status().json()으로
  result = result.replace(
    /return\s+new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\)\s*,\s*\{\s*status:\s*(\d+)[^}]*\}\s*\)/g,
    'return res.status($2).json($1)'
  );

  // 3. new Response(null, ...) 를 res.status().end()로
  result = result.replace(
    /return\s+new\s+Response\s*\(\s*null\s*,\s*\{[^}]*\}\s*\)/g,
    'return res.status(200).end()'
  );

  // 4. new Response without status (기본 200)
  result = result.replace(
    /return\s+new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\)\s*\)/g,
    'return res.status(200).json($1)'
  );

  // 5. corsHeaders 객체를 res.setHeader로 변환
  // module.exports 직후에 CORS 헤더 설정 추가
  if (result.includes('corsHeaders')) {
    result = result.replace(
      /(module\.exports\s*=\s*async\s+function\s+handler\s*\(req,\s*res\)\s*\{)/,
      '$1\n  // CORS\n  res.setHeader(\'Access-Control-Allow-Origin\', req.headers[\'origin\'] || \'*\');\n  res.setHeader(\'Access-Control-Allow-Methods\', \'GET, POST, PUT, DELETE, OPTIONS\');\n  res.setHeader(\'Access-Control-Allow-Headers\', \'Content-Type, Authorization\');\n'
    );

    // corsHeaders 객체 정의 제거
    result = result.replace(/const\s+corsHeaders\s*=\s*\{[^}]+\};?\s*/g, '');
    result = result.replace(/const\s+origin\s*=\s*req\.headers\['origin'\]\s*\|\|\s*'\*';\s*/g, '');
  }

  return result;
}

async function fixAllFiles() {
  console.log('🔧 Response 형식 수정 시작...\n');

  const apiDir = path.join(projectRoot, 'api');
  let successCount = 0;

  function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');

          // new Response가 있는 파일만 수정
          if (content.includes('new Response')) {
            const fixed = fixResponses(content);
            fs.writeFileSync(fullPath, fixed, 'utf-8');

            const relativePath = path.relative(projectRoot, fullPath);
            console.log(`✅ ${relativePath}`);
            successCount++;
          }
        } catch (error) {
          const relativePath = path.relative(projectRoot, fullPath);
          console.error(`❌ ${relativePath}:`, error.message);
        }
      }
    }
  }

  processDirectory(apiDir);

  console.log(`\n🎉 수정 완료! (${successCount}개 파일)`);
}

fixAllFiles().catch(console.error);
