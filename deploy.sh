#!/bin/bash

# Vercel 배포 스크립트
echo "🚀 Travelap Vercel 배포를 시작합니다..."

# 1. 의존성 설치 확인
echo "📦 의존성을 확인하고 설치합니다..."
npm install

# 2. 타입 체크
echo "🔍 TypeScript 타입을 체크합니다..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ 타입 에러가 있습니다. 수정 후 다시 시도해주세요."
    exit 1
fi

# 3. 린트 체크
echo "🔍 코드 스타일을 체크합니다..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️ 린트 경고가 있습니다. 확인해주세요."
fi

# 4. 빌드 테스트
echo "🏗️ 프로덕션 빌드를 테스트합니다..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 빌드가 실패했습니다. 오류를 수정해주세요."
    exit 1
fi

# 5. Git 상태 확인
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 변경사항을 커밋합니다..."
    git add .
    read -p "커밋 메시지를 입력하세요: " commit_message
    git commit -m "$commit_message"
fi

# 6. Git 푸시
echo "🔄 GitHub에 푸시합니다..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Git 푸시가 실패했습니다."
    exit 1
fi

echo "✅ 배포 준비가 완료되었습니다!"
echo "🌐 Vercel 대시보드에서 배포 상태를 확인하세요: https://vercel.com/dashboard"
echo ""
echo "📚 더 자세한 정보는 DEPLOYMENT.md 파일을 참고하세요."