#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendFolders = ['api', 'workers', 'scripts', 'server'];
const backendFiles = [
  'utils/database.js', 'utils/database.ts', 'utils/notification.ts',
  'utils/notifications.ts', 'utils/booking-state-machine.ts', 'utils/payment.ts',
  'utils/pms-integration.ts', 'utils/pms-integrations.ts', 'utils/rentcar-api.ts',
  'utils/rentcar-price-calculator.ts', 'utils/test-lock-db-integration.ts',
  'utils/test-lock.ts', 'utils/jwt.ts'
];
const tempSuffix = '.backend-temp';

console.log('🔧 Preparing frontend-only build...');

backendFolders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  const tempPath = folderPath + tempSuffix;
  if (fs.existsSync(folderPath)) {
    console.log(`   Hiding ${folder}/`);
    try {
      if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true });
      fs.renameSync(folderPath, tempPath);
    } catch (err) { console.error(`   ⚠️  ${err.message}`); }
  }
});

backendFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const tempPath = filePath + tempSuffix;
  if (fs.existsSync(filePath)) {
    console.log(`   Hiding ${file}`);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      fs.renameSync(filePath, tempPath);
    } catch (err) { console.error(`   ⚠️  ${err.message}`); }
  }
});

console.log('\n📦 Building frontend...');
try {
  execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
  console.log('✅ Build completed!');
} catch (err) {
  console.error('❌ Build failed');
  process.exitCode = 1;
}

console.log('\n🔄 Restoring...');
backendFolders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  const tempPath = folderPath + tempSuffix;
  if (fs.existsSync(tempPath)) {
    try {
      if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true, force: true });
      fs.renameSync(tempPath, folderPath);
    } catch (err) { console.error(`   ⚠️  ${err.message}`); }
  }
});

backendFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const tempPath = filePath + tempSuffix;
  if (fs.existsSync(tempPath)) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
    } catch (err) { console.error(`   ⚠️  ${err.message}`); }
  }
});

console.log('✅ Complete!');
process.exit(process.exitCode || 0);
