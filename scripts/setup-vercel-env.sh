#!/bin/bash

# Vercel 환경변수 자동 설정 스크립트
# 사용법: chmod +x scripts/setup-vercel-env.sh && ./scripts/setup-vercel-env.sh

echo "🚀 Vercel 환경변수 자동 설정 시작..."
echo ""

# .env 파일 존재 확인
if [ ! -f .env ]; then
  echo "❌ .env 파일을 찾을 수 없습니다."
  echo "현재 디렉토리: $(pwd)"
  exit 1
fi

echo "✅ .env 파일 발견"
echo ""

# .env에서 환경변수 읽기
source .env

# JWT_SECRET 확인
if [ -z "$JWT_SECRET" ]; then
  echo "❌ JWT_SECRET이 .env 파일에 없습니다."
  exit 1
fi

# DATABASE_URL 확인
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL이 .env 파일에 없습니다."
  exit 1
fi

echo "✅ 환경변수 로드 완료"
echo "  - JWT_SECRET: ${JWT_SECRET:0:20}... (길이: ${#JWT_SECRET})"
echo "  - DATABASE_URL: ${DATABASE_URL:0:30}..."
echo ""

# Vercel CLI 설치 확인
if ! command -v vercel &> /dev/null; then
  echo "⚠️  Vercel CLI가 설치되지 않았습니다."
  echo "설치 중... (npx vercel 사용)"
  echo ""
fi

# Vercel 로그인 확인
echo "🔐 Vercel 로그인 확인 중..."
npx vercel whoami &> /dev/null

if [ $? -ne 0 ]; then
  echo "❌ Vercel에 로그인되어 있지 않습니다."
  echo "로그인을 진행합니다..."
  npx vercel login

  if [ $? -ne 0 ]; then
    echo "❌ Vercel 로그인 실패"
    exit 1
  fi
fi

echo "✅ Vercel 로그인 완료"
echo ""

# 환경변수 추가 함수
add_env_var() {
  local var_name=$1
  local var_value=$2
  local env_type=$3

  echo "📝 $var_name을 $env_type 환경에 추가 중..."

  # 환경변수가 이미 존재하는지 확인
  existing=$(npx vercel env ls $env_type 2>&1 | grep "^$var_name")

  if [ -n "$existing" ]; then
    echo "⚠️  $var_name이 이미 $env_type 환경에 존재합니다."
    read -p "덮어쓰시겠습니까? (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "⏭️  건너뜁니다."
      return
    fi

    echo "🗑️  기존 변수 삭제 중..."
    npx vercel env rm $var_name $env_type --yes
  fi

  echo "$var_value" | npx vercel env add $var_name $env_type

  if [ $? -eq 0 ]; then
    echo "✅ $var_name 추가 완료 ($env_type)"
  else
    echo "❌ $var_name 추가 실패 ($env_type)"
    return 1
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 환경변수 설정 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Production 환경
echo "🌍 Production 환경 설정"
add_env_var "JWT_SECRET" "$JWT_SECRET" "production"
add_env_var "DATABASE_URL" "$DATABASE_URL" "production"
echo ""

# Preview 환경
echo "🔍 Preview 환경 설정"
add_env_var "JWT_SECRET" "$JWT_SECRET" "preview"
add_env_var "DATABASE_URL" "$DATABASE_URL" "preview"
echo ""

# Development 환경
echo "💻 Development 환경 설정"
add_env_var "JWT_SECRET" "$JWT_SECRET" "development"
add_env_var "DATABASE_URL" "$DATABASE_URL" "development"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 모든 환경변수 설정 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 환경변수 목록 확인
echo "📋 설정된 환경변수 확인:"
npx vercel env ls
echo ""

# 재배포 안내
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  중요: 환경변수 적용을 위해 재배포가 필요합니다"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "다음 명령어로 재배포하세요:"
echo "  npx vercel --prod"
echo ""
echo "또는 Vercel Dashboard에서:"
echo "  1. Deployments 탭 이동"
echo "  2. 최근 배포의 ... 메뉴 클릭"
echo "  3. Redeploy 선택"
echo "  4. 'Use existing Build Cache' 체크 해제"
echo "  5. Redeploy 버튼 클릭"
echo ""

read -p "지금 재배포하시겠습니까? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "🚀 재배포 시작..."
  npx vercel --prod

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 재배포 완료!"
    echo "배포된 사이트에서 로그인을 테스트해보세요."
  else
    echo ""
    echo "❌ 재배포 실패"
    echo "Vercel Dashboard에서 수동으로 재배포해주세요."
  fi
else
  echo ""
  echo "⏭️  재배포를 건너뜁니다."
  echo "나중에 수동으로 재배포해주세요."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 설정 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
