/**
 * 모든 API 파일을 완전한 CommonJS Vercel Handler 형식으로 변환
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// 이미 CommonJS인 파일들 (건드리지 않음)
const skipFiles = [
  'api/login.js',
  'api/signup.js',
  'api/accommodations.js',
  'api/activities.js',
  'api/test.js',
  'api/populate-data.js'
];

function isAlreadyCommonJS(content) {
  // module.exports로 시작하고 import/export가 없으면 CommonJS
  return content.includes('module.exports') &&
         !content.includes('import ') &&
         !content.includes('export ');
}

function hasNewResponse(content) {
  return content.includes('new Response');
}

function convertToHandler(content, filename) {
  let result = content;

  // 이미 제대로 된 CommonJS면 그냥 반환
  if (isAlreadyCommonJS(result) && !hasNewResponse(result)) {
    return null; // 변경 불필요
  }

  // 1. import를 require로
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, source) => {
    const cleanImports = imports
      .split(',')
      .map(imp => imp.trim().replace(/^type\s+/, ''))
      .filter(imp => !imp.startsWith('type '))
      .join(', ');
    return `const { ${cleanImports} } = require('${source}')`;
  });

  result = result.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require(\'$2\')');

  // 2. TypeScript 타입 제거
  result = result.replace(/:\s*Request\b/g, '');
  result = result.replace(/:\s*Response\b/g, '');
  result = result.replace(/:\s*(string|number|boolean|any)\b/g, '');
  result = result.replace(/!(\.|;|\)|,)/g, '$1');
  result = result.replace(/export\s+(interface|type)\s+\w+[^;{]*(\{[^}]*\}|=[^;]+);?/gs, '');

  // 3. export function들을 추출
  const functions = [];
  const funcRegex = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = funcRegex.exec(result)) !== null) {
    functions.push(match[1]); // GET, POST, OPTIONS 등
  }

  // 4. 전체를 다시 작성 - 깔끔한 handler로
  if (functions.length > 0) {
    // 원본 함수 본문들 추출
    const getFunctionBody = (funcName) => {
      const regex = new RegExp(`export\\s+async\\s+function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g');
      const match = regex.exec(result);
      return match ? match[1] : '';
    };

    // import 부분만 유지
    const imports = result.split('\n').filter(line =>
      line.trim().startsWith('const') && line.includes('require')
    ).join('\n');

    // 새로운 handler 작성
    let newCode = imports + '\n\n';
    newCode += 'module.exports = async function handler(req, res) {\n';
    newCode += '  // CORS\n';
    newCode += '  res.setHeader(\'Access-Control-Allow-Origin\', req.headers[\'origin\'] || \'*\');\n';
    newCode += '  res.setHeader(\'Access-Control-Allow-Methods\', \'GET, POST, PUT, DELETE, OPTIONS\');\n';
    newCode += '  res.setHeader(\'Access-Control-Allow-Headers\', \'Content-Type, Authorization\');\n\n';
    newCode += '  if (req.method === \'OPTIONS\') {\n';
    newCode += '    return res.status(200).end();\n';
    newCode += '  }\n\n';

    // 각 메서드별 처리
    functions.forEach((funcName, idx) => {
      const body = getFunctionBody(funcName);
      let cleanBody = body
        .replace(/const\s+origin\s*=\s*request\.headers\.get\(['"]origin['"]\)\s*\|\|\s*['"]\*['"];?\s*/g, '')
        .replace(/const\s+corsHeaders\s*=\s*\{[^}]+\};?\s*/g, '')
        .replace(/request\.headers\.get\(['"]([^'"]+)['"]\)/g, "req.headers['$1']")
        .replace(/\brequest\b/g, 'req')
        .replace(/new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\)\s*,\s*\{\s*status:\s*(\d+)[^}]*\}\s*\)/g, 'res.status($2).json($1)')
        .replace(/new\s+Response\s*\(\s*null\s*,\s*\{[^}]*\}\s*\)/g, 'res.status(200).end()')
        .replace(/new\s+Response\s*\(\s*JSON\.stringify\(([^)]+)\)\s*\)/g, 'res.status(200).json($1)');

      if (funcName !== 'OPTIONS') {
        if (idx === 0 || (idx === 1 && functions[0] === 'OPTIONS')) {
          newCode += `  if (req.method === '${funcName}') {\n`;
        } else {
          newCode += `  } else if (req.method === '${funcName}') {\n`;
        }
        newCode += cleanBody;
      }
    });

    if (functions.length > 1 || (functions.length === 1 && functions[0] !== 'OPTIONS')) {
      newCode += '  } else {\n';
      newCode += '    return res.status(405).json({ success: false, error: \'Method not allowed\' });\n';
      newCode += '  }\n';
    }

    newCode += '};\n';

    return newCode;
  }

  // export const 등 처리
  result = result.replace(/export\s+const\s+/g, 'const ');
  result = result.replace(/export\s+\{[^}]+\}/g, '');

  return result;
}

async function convertAllFiles() {
  console.log('🔄 모든 API를 CommonJS로 최종 변환...\n');

  const apiDir = path.join(projectRoot, 'api');
  let successCount = 0;
  let skipCount = 0;

  function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        // 스킵 파일 확인
        if (skipFiles.includes(relativePath)) {
          console.log(`⏭️  ${relativePath} (스킵)`);
          skipCount++;
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const converted = convertToHandler(content, entry.name);

          if (converted === null) {
            console.log(`⏭️  ${relativePath} (이미 CommonJS)`);
            skipCount++;
          } else {
            fs.writeFileSync(fullPath, converted, 'utf-8');
            console.log(`✅ ${relativePath}`);
            successCount++;
          }
        } catch (error) {
          console.error(`❌ ${relativePath}:`, error.message);
        }
      }
    }
  }

  processDirectory(apiDir);

  console.log(`\n🎉 변환 완료!`);
  console.log(`   변환: ${successCount}개`);
  console.log(`   스킵: ${skipCount}개`);
}

convertAllFiles().catch(console.error);
