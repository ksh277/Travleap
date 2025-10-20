import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const apiDir = path.join(projectRoot, 'api');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('module.exports = async function handler(req, res) {')) {
      // 다음 줄이 }; 인지 확인
      if (i + 1 < lines.length && lines[i + 1].trim() === '};') {
        return true;
      }
    }
  }
  return false;
}

function findEmptyHandlers(dir) {
  const emptyFiles = [];

  function scan(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name.endsWith('.js')) {
        if (checkFile(fullPath)) {
          const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
          emptyFiles.push(relativePath);
        }
      }
    }
  }

  scan(dir);
  return emptyFiles;
}

const emptyHandlers = findEmptyHandlers(apiDir);

console.log('\n🔍 비어있는 handler를 가진 파일들:\n');
if (emptyHandlers.length === 0) {
  console.log('✅ 없음!');
} else {
  emptyHandlers.forEach(file => console.log(`   ❌ ${file}`));
  console.log(`\n총 ${emptyHandlers.length}개 파일`);
}
