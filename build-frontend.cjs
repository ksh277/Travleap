#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendFolders = ['workers', 'scripts', 'server'];

// Backend-only files to hide (NOT used by frontend)
const backendFiles = [
  'utils/database.js',
  'utils/database.ts',
  'utils/notifications.ts',
  'utils/booking-state-machine.ts',
  'utils/payment.ts',
  'utils/pms-integration.ts',
  'utils/rentcar-price-calculator.ts',
  'utils/test-lock-db-integration.ts',
  'utils/jwt.ts'
];

// Files used by frontend but need to be replaced with stubs
const stubReplacements = {
  'utils/rentcar-api.ts': 'utils/rentcar-api-stub.ts',
  'utils/pms-integrations.ts': 'utils/pms-integrations-stub.ts',
  'utils/test-lock.ts': 'utils/test-lock-stub.ts',
  'utils/notification.ts': 'utils/notification-stub.ts'
};

const tempSuffix = '.backend-temp';

console.log('🔧 Preparing frontend-only build...');

// Hide backend folders
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

// Hide backend-only files
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

// Replace files with stubs
Object.entries(stubReplacements).forEach(([original, stub]) => {
  const originalPath = path.join(__dirname, original);
  const stubPath = path.join(__dirname, stub);
  const tempPath = originalPath + tempSuffix;
  
  if (fs.existsSync(originalPath)) {
    console.log(`   Replacing ${original} with stub`);
    try {
      // Backup original
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      fs.renameSync(originalPath, tempPath);
      
      // Copy stub to original location
      if (fs.existsSync(stubPath)) {
        fs.copyFileSync(stubPath, originalPath);
      } else {
        console.error(`   ⚠️  Stub not found: ${stub}`);
      }
    } catch (err) { console.error(`   ⚠️  ${err.message}`); }
  }
});

console.log('\n📦 Building frontend...');
try {
  execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
  console.log('✅ Build completed!');

  // Copy api/ directory to dist/api/ for Vercel deployment
  console.log('\n📦 Copying api/ to dist/api/...');
  const apiSource = path.join(__dirname, 'api');
  const apiDest = path.join(__dirname, 'dist', 'api');

  if (fs.existsSync(apiSource)) {
    // Create dist/api if it doesn't exist
    if (!fs.existsSync(apiDest)) {
      fs.mkdirSync(apiDest, { recursive: true });
    }

    // Copy all .js files from api/ to dist/api/
    function copyRecursive(src, dest) {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyRecursive(srcPath, destPath);
        } else if (entry.name.endsWith('.js')) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`   Copied ${srcPath} → ${destPath}`);
        }
      }
    }

    copyRecursive(apiSource, apiDest);
    console.log('✅ API files copied to dist/api/');
  }

  // Copy utils/ to dist/utils/ (needed by api/)
  console.log('\n📦 Copying utils/ to dist/utils/...');
  const utilsSource = path.join(__dirname, 'utils');
  const utilsDest = path.join(__dirname, 'dist', 'utils');

  if (fs.existsSync(utilsSource)) {
    if (!fs.existsSync(utilsDest)) {
      fs.mkdirSync(utilsDest, { recursive: true });
    }

    // Copy necessary utils files
    const utilsFiles = ['cors-middleware.js'];
    for (const file of utilsFiles) {
      const srcPath = path.join(utilsSource, file);
      const destPath = path.join(utilsDest, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`   Copied ${file}`);
      }
    }
    console.log('✅ Utils files copied to dist/utils/');
  }

} catch (err) {
  console.error('❌ Build failed');
  process.exitCode = 1;
}

console.log('\n🔄 Restoring...');

// Restore folders
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

// Restore files
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

// Restore stub-replaced files
Object.keys(stubReplacements).forEach(original => {
  const originalPath = path.join(__dirname, original);
  const tempPath = originalPath + tempSuffix;
  if (fs.existsSync(tempPath)) {
    try {
      if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
      fs.renameSync(tempPath, originalPath);
    } catch (err) { console.error(`   ⚠️  ${err.message}`); }
  }
});

console.log('✅ Complete!');
process.exit(process.exitCode || 0);
