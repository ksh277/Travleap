#!/bin/bash
set -e

echo "🏗️ Building Travelap for production..."

# Node.js 버전 확인
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# 종속성이 설치되어 있는지 확인
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# 빌드 실행
echo "🔨 Running Vite build..."
npx vite build

# 빌드 완료 확인
if [ -d "dist" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build files in dist/ directory:"
    ls -la dist/
else
    echo "❌ Build failed - dist directory not found"
    exit 1
fi