@echo off
REM Vercel 환경변수 자동 설정 스크립트 (Windows)
REM 사용법: scripts\setup-vercel-env.bat

echo ========================================
echo 🚀 Vercel 환경변수 자동 설정 시작...
echo ========================================
echo.

REM .env 파일 존재 확인
if not exist ".env" (
  echo ❌ .env 파일을 찾을 수 없습니다.
  echo 현재 디렉토리: %CD%
  pause
  exit /b 1
)

echo ✅ .env 파일 발견
echo.

REM .env 파일에서 환경변수 읽기
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  set "%%A=%%B"
)

REM JWT_SECRET 확인
if "%JWT_SECRET%"=="" (
  echo ❌ JWT_SECRET이 .env 파일에 없습니다.
  pause
  exit /b 1
)

REM DATABASE_URL 확인
if "%DATABASE_URL%"=="" (
  echo ❌ DATABASE_URL이 .env 파일에 없습니다.
  pause
  exit /b 1
)

echo ✅ 환경변수 로드 완료
echo   - JWT_SECRET: (길이 확인됨)
echo   - DATABASE_URL: (길이 확인됨)
echo.

REM Vercel CLI 확인
where vercel >nul 2>nul
if %errorlevel% neq 0 (
  echo ⚠️  Vercel CLI가 설치되지 않았습니다.
  echo npx vercel을 사용합니다...
  echo.
)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔧 환경변수 설정 시작
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 🌍 Production 환경에 JWT_SECRET 추가 중...
echo %JWT_SECRET% | npx vercel env add JWT_SECRET production
if %errorlevel% equ 0 (
  echo ✅ JWT_SECRET 추가 완료 (production)
) else (
  echo ❌ JWT_SECRET 추가 실패 (production)
)

echo.
echo 🌍 Production 환경에 DATABASE_URL 추가 중...
echo %DATABASE_URL% | npx vercel env add DATABASE_URL production
if %errorlevel% equ 0 (
  echo ✅ DATABASE_URL 추가 완료 (production)
) else (
  echo ❌ DATABASE_URL 추가 실패 (production)
)

echo.
echo 🔍 Preview 환경에 JWT_SECRET 추가 중...
echo %JWT_SECRET% | npx vercel env add JWT_SECRET preview
if %errorlevel% equ 0 (
  echo ✅ JWT_SECRET 추가 완료 (preview)
) else (
  echo ❌ JWT_SECRET 추가 실패 (preview)
)

echo.
echo 🔍 Preview 환경에 DATABASE_URL 추가 중...
echo %DATABASE_URL% | npx vercel env add DATABASE_URL preview
if %errorlevel% equ 0 (
  echo ✅ DATABASE_URL 추가 완료 (preview)
) else (
  echo ❌ DATABASE_URL 추가 실패 (preview)
)

echo.
echo 💻 Development 환경에 JWT_SECRET 추가 중...
echo %JWT_SECRET% | npx vercel env add JWT_SECRET development
if %errorlevel% equ 0 (
  echo ✅ JWT_SECRET 추가 완료 (development)
) else (
  echo ❌ JWT_SECRET 추가 실패 (development)
)

echo.
echo 💻 Development 환경에 DATABASE_URL 추가 중...
echo %DATABASE_URL% | npx vercel env add DATABASE_URL development
if %errorlevel% equ 0 (
  echo ✅ DATABASE_URL 추가 완료 (development)
) else (
  echo ❌ DATABASE_URL 추가 실패 (development)
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ 모든 환경변수 설정 완료!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 📋 설정된 환경변수 확인:
npx vercel env ls
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ⚠️  중요: 환경변수 적용을 위해 재배포가 필요합니다
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 다음 명령어로 재배포하세요:
echo   npx vercel --prod
echo.
echo 또는 Vercel Dashboard에서:
echo   1. Deployments 탭 이동
echo   2. 최근 배포의 ... 메뉴 클릭
echo   3. Redeploy 선택
echo   4. 'Use existing Build Cache' 체크 해제
echo   5. Redeploy 버튼 클릭
echo.

set /p DEPLOY="지금 재배포하시겠습니까? (y/N): "
if /i "%DEPLOY%"=="y" (
  echo.
  echo 🚀 재배포 시작...
  npx vercel --prod
  if %errorlevel% equ 0 (
    echo.
    echo ✅ 재배포 완료!
    echo 배포된 사이트에서 로그인을 테스트해보세요.
  ) else (
    echo.
    echo ❌ 재배포 실패
    echo Vercel Dashboard에서 수동으로 재배포해주세요.
  )
) else (
  echo.
  echo ⏭️  재배포를 건너뜁니다.
  echo 나중에 수동으로 재배포해주세요.
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🎉 설정 완료!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
