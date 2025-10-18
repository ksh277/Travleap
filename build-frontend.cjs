#!/usr/bin/env node
/**
 * Frontend-only build script
 * Temporarily renames backend folders to prevent Vite from scanning them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendFolders = [
  'utils',
  'api',
  'workers',
  'scripts',
  'server'
];

const tempSuffix = '.backend-temp';

console.log('🔧 Preparing frontend-only build...');

// Step 1: Rename backend folders
backendFolders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  const tempPath = folderPath + tempSuffix;

  if (fs.existsSync(folderPath)) {
    console.log(`   Hiding ${folder}/ → ${folder}${tempSuffix}/`);
    try {
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
      fs.renameSync(folderPath, tempPath);
    } catch (err) {
      console.error(`   ⚠️  Could not rename ${folder}:`, err.message);
    }
  }
});

// Step 2: Run Vite build
console.log('\n📦 Building frontend with Vite...');
try {
  execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exitCode = 1;
}

// Step 3: Restore backend folders
console.log('\n🔄 Restoring backend folders...');
backendFolders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  const tempPath = folderPath + tempSuffix;

  if (fs.existsSync(tempPath)) {
    console.log(`   Restoring ${folder}${tempSuffix}/ → ${folder}/`);
    try {
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
      fs.renameSync(tempPath, folderPath);
    } catch (err) {
      console.error(`   ⚠️  Could not restore ${folder}:`, err.message);
    }
  }
});

console.log('\n✅ Frontend build process complete!');
process.exit(process.exitCode || 0);
