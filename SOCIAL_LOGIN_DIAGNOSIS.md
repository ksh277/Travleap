# 소셜 로그인 실패 근본 원인 분석

## 발견된 문제

### 🔴 치명적 문제: dist 폴더에 플레이스홀더 OAuth 클라이언트 ID가 빌드됨

**dist/assets/index-D4mF0xCw.js 파일 내용:**
```javascript
const t="your_google_oauth_client_id"   // Google 플레이스홀더
const t="your_kakao_app_key"            // Kakao 플레이스홀더
const t="your_naver_client_id"          // Naver 플레이스홀더
```

**결과:**
- Google: `client_id="your_google_oauth_client_id"` → 400 에러
- Kakao: `app_key="your_kakao_app_key"` → KOE101 에러
- Naver: `client_id="your_naver_client_id"` → "client info invalid" 에러

## 왜 이런 일이 발생했나?

### 1. `.env.local` 파일 문제 (최우선 원인)

**파일 내용 확인:**
```bash
.env.local (Oct 31 생성):
VITE_GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
VITE_KAKAO_APP_KEY=your_kakao_app_key
VITE_NAVER_CLIENT_ID=your_naver_client_id
```

Vite 빌드 시 환경변수 우선순위:
1. `.env.local` ← **가장 높은 우선순위**
2. `.env`
3. `.env.example`

→ 실제 `.env` 파일에 진짜 클라이언트 ID가 있어도, `.env.local`의 플레이스홀더가 사용됨!

### 2. `.env` 파일의 추가 문제

```bash
VITE_NAVER_CLIENT_ID=          ← 비어있음!
```

→ `.env.local`을 삭제해도 Naver는 여전히 빈 값으로 빌드됨

### 3. Vercel 빌드 비활성화 (Nov 7)

**package.json 변경사항:**
```json
// 이전: "build": "node build-frontend.cjs"
// 이후: "build": "echo 'Using pre-built dist folder'"
```

→ Vercel이 자동으로 빌드하지 않고 git에 커밋된 dist 폴더 사용
→ Nov 8 19:23에 로컬에서 빌드된 dist가 배포됨
→ 로컬 .env.local의 플레이스홀더가 그대로 프로덕션에 배포됨!

## 타임라인

1. **Oct 31**: `.env.local` 생성 (플레이스홀더 값)
2. **Nov 6**: OAuth callback API 시스템 구현 (api/auth/callback/*)
3. **Nov 7 21:06**: dist 폴더를 git에 추가 (commit f0fdde3)
4. **Nov 7 22:33**: Vercel 빌드 비활성화 (commit a2ec6e2)
5. **Nov 8 19:23**: dist 폴더 재빌드 (.env.local의 플레이스홀더 사용)
6. **Nov 8**: dist 커밋 및 푸시 (commit 0ace79b)
7. **현재**: Vercel에 플레이스홀더 클라이언트 ID가 배포된 상태

## 해결 방법

### 방법 1: 즉시 수정 (빠른 해결)

```bash
# 1. .env.local 삭제 (플레이스홀더 제거)
rm .env.local

# 2. .env 파일에 Naver Client ID 추가
# VITE_NAVER_CLIENT_ID=진짜_네이버_클라이언트_ID

# 3. dist 폴더 재빌드
npm run build:vite

# 4. Git 커밋 및 푸시
git add dist/
git commit -m "fix: Rebuild dist with real OAuth client IDs"
git push
```

### 방법 2: 표준 방법 (권장)

```bash
# 1. Vercel 빌드 재활성화
# package.json에서 "build": "node build-frontend.cjs" 복원

# 2. dist 폴더를 git에서 제거
echo "dist/" >> .gitignore
git rm -r --cached dist/
git commit -m "fix: Remove dist from git, let Vercel build"

# 3. Vercel 대시보드에서 환경 변수 설정
# VITE_GOOGLE_OAUTH_CLIENT_ID=진짜_구글_클라이언트_ID
# VITE_KAKAO_APP_KEY=진짜_카카오_앱_키
# VITE_NAVER_CLIENT_ID=진짜_네이버_클라이언트_ID

# 4. Vercel에서 자동으로 빌드하도록 설정
git push
```

## 검증 완료 사항

✅ 현재 .env 파일의 Google, Kakao 클라이언트 ID는 정상
✅ OAuth 콜백 파일들(api/auth/callback/*)은 정상 작동 (Nov 6 생성)
✅ 사용자 정보 프록시 엔드포인트(api/auth/google/user-info 등) 정상
✅ 네이버 개발자 센터 설정은 정상 (사용자 확인)
✅ API 라우팅 설정 정상 (vercel.json)

## 결론

소셜 로그인 실패의 100% 원인은:
**dist 폴더가 .env.local의 플레이스홀더 값으로 빌드되어 Vercel에 배포됨**

코드나 API, OAuth 설정에는 문제가 없습니다.
오직 빌드 시 잘못된 환경변수 파일(.env.local)이 사용된 것이 유일한 문제입니다.
