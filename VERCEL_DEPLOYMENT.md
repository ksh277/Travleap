# Vercel 배포 가이드

## 🚨 중요: Vercel 환경 변수 설정 필수!

배포 후 데이터가 안 나온다면 **Vercel에 환경 변수를 설정하지 않아서**입니다.

---

## ⚙️ Vercel 환경 변수 설정 방법

### 1단계: Vercel 대시보드 접속

```
https://vercel.com/dashboard
```

### 2단계: 프로젝트 선택

- Travleap 프로젝트 클릭
- 상단 메뉴에서 **Settings** 클릭

### 3단계: Environment Variables 메뉴

- 왼쪽 사이드바에서 **Environment Variables** 클릭

### 4단계: 환경 변수 추가

다음 3개 변수를 **하나씩** 추가:

#### 변수 1: VITE_PLANETSCALE_HOST
```
Name: VITE_PLANETSCALE_HOST
Value: aws.connect.psdb.cloud
Environment: Production, Preview, Development (전부 체크)
```

#### 변수 2: VITE_PLANETSCALE_USERNAME
```
Name: VITE_PLANETSCALE_USERNAME
Value: your_planetscale_username (⚠️ .env 파일에서 복사)
Environment: Production, Preview, Development (전부 체크)
```

#### 변수 3: VITE_PLANETSCALE_PASSWORD
```
Name: VITE_PLANETSCALE_PASSWORD
Value: your_planetscale_password (⚠️ .env 파일에서 복사)
Environment: Production, Preview, Development (전부 체크)
```

### 5단계: 재배포

환경 변수 추가 후 **반드시 재배포** 필요:

1. Vercel 대시보드에서 **Deployments** 탭 클릭
2. 가장 최근 배포 찾기
3. 오른쪽 **...** 메뉴 클릭
4. **Redeploy** 클릭
5. **Redeploy** 버튼 다시 클릭 (확인)

---

## 📁 Vercel Serverless Functions 구조

```
api/
├── db.js       → /api/db 엔드포인트
├── auth.js     → /api/auth 엔드포인트
└── health.js   → /api/health 엔드포인트
```

---

## ✅ 배포 확인 방법

### 1. Health Check
```
https://your-site.vercel.app/api/health
```

**정상 응답:**
```json
{
  "success": true,
  "message": "Database connected",
  "data": [{"test": "1"}]
}
```

### 2. 데이터 조회 테스트
```
https://your-site.vercel.app/api/db?action=query

POST Body:
{
  "sql": "SELECT COUNT(*) as count FROM listings"
}
```

**정상 응답:**
```json
{
  "success": true,
  "data": [{"count": "14"}]
}
```

---

## 🐛 문제 해결

### 문제 1: 환경 변수 에러
```
Error: Missing environment variables
```

**해결:**
- Vercel 대시보드에서 환경 변수 3개 확인
- 재배포 실행

### 문제 2: Database connection failed
```
DatabaseError: Connection failed
```

**해결:**
- PlanetScale 비밀번호가 만료되었을 수 있음
- `.env` 파일에서 최신 정보 확인
- Vercel 환경 변수 업데이트

### 문제 3: 404 Not Found on /api/db
```
404: NOT_FOUND
```

**해결:**
- `vercel.json` 파일 확인
- `api/` 폴더에 `.js` 파일 확인
- 재배포

---

## 📊 현재 API 엔드포인트

### 1. `/api/health` (GET)
- DB 연결 상태 확인

### 2. `/api/db` (POST)
- `?action=select` - SELECT 쿼리
- `?action=insert` - INSERT 쿼리
- `?action=update` - UPDATE 쿼리
- `?action=delete` - DELETE 쿼리
- `?action=query` - 커스텀 SQL 쿼리

### 3. `/api/auth` (POST)
- `?action=login` - 로그인
- `?action=register` - 회원가입
- `?action=social-login` - 소셜 로그인

---

## 🔒 보안 주의사항

### ⚠️ 환경 변수를 GitHub에 푸시하지 마세요!

`.env` 파일은 `.gitignore`에 포함되어 있습니다.

### ✅ Vercel에만 환경 변수 설정

- GitHub에는 코드만
- Vercel에는 환경 변수
- 분리 관리!

---

## 🚀 배포 워크플로우

```
1. 로컬에서 개발
   └─ .env 파일 사용

2. GitHub에 푸시
   └─ .env는 제외됨 (.gitignore)

3. Vercel 자동 배포
   └─ Vercel 환경 변수 사용

4. 환경 변수 없으면
   └─ API 작동 안 함!
```

---

## 📞 빠른 체크리스트

배포 후 데이터가 안 나올 때:

- [ ] Vercel 환경 변수 3개 설정했나요?
- [ ] 환경 변수에 오타 없나요?
- [ ] Production, Preview, Development 전부 체크했나요?
- [ ] 재배포 했나요?
- [ ] `/api/health` 접속해서 DB 연결 확인했나요?

**모두 체크했는데도 안 되면:**
- Vercel 로그 확인: Deployments > 최근 배포 > Runtime Logs
- 에러 메시지 확인

---

## 💡 참고

- 로컬 개발: `npm run dev` (server.cjs 사용)
- Vercel 배포: Serverless Functions (api/*.js 사용)
- 둘 다 동일한 DB 연결 (PlanetScale)

**로컬에서 되는데 배포에서 안 되면 → 100% 환경 변수 문제!**
