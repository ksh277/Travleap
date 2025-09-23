#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️ Starting Travelap build process...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`🟢 Node.js version: ${process.version}`);

// Vite 경로 찾기
const vitePath = join(__dirname, 'node_modules', '.bin', 'vite');
const viteCmd = process.platform === 'win32' ? `${vitePath}.cmd` : vitePath;

// 환경 변수 설정
process.env.NODE_ENV = 'production';

console.log(`🔨 Running: ${viteCmd} build`);

// Vite build 실행
const child = spawn('node', [join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully!');
  } else {
    console.error(`❌ Build failed with exit code ${code}`);
    process.exit(code);
  }
});

child.on('error', (error) => {
  console.error(`❌ Build error: ${error.message}`);
  process.exit(1);
});