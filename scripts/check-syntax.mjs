import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// .vercelignore에 있는 파일들
const ignoredFiles = [
  'api/admin/commission-settings.js',
  'api/bookings/create-with-lock.js',
  'api/bookings/return-inspect.js',
  'api/payments/confirm.js',
  'api/payments/webhook.js',
  'api/rentcar/payment.js',
  'api/rentcar/vendor-register.js',
  'api/rentcar/vendor-vehicles.js',
  'api/shared/activities-module.js',
  'api/shared/banners-module.js',
  'api/shared/newsletter.js',
  'api/shared/lodging.js'
];

async function checkSyntax(filePath) {
  try {
    await execAsync(`node --check "${filePath}"`, { cwd: projectRoot });
    return null;
  } catch (error) {
    return error.message;
  }
}

async function checkAllFiles() {
  console.log('🔍 JavaScript 문법 검사 중...\n');

  const apiDir = path.join(projectRoot, 'api');
  const errors = [];

  async function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.name.endsWith('.js')) {
        // 무시할 파일인지 확인
        if (ignoredFiles.includes(relativePath)) {
          continue;
        }

        const error = await checkSyntax(fullPath);
        if (error) {
          errors.push({ file: relativePath, error });
        } else {
          console.log(`✅ ${relativePath}`);
        }
      }
    }
  }

  await scanDirectory(apiDir);

  if (errors.length > 0) {
    console.log('\n❌ 문법 오류 발견:\n');
    errors.forEach(({ file, error }) => {
      console.log(`   ${file}:`);
      console.log(`   ${error}\n`);
    });
  } else {
    console.log('\n🎉 모든 파일 문법 검사 통과!');
  }
}

checkAllFiles().catch(console.error);
