# Vercel 배포 가이드

이 가이드는 Travelap 프로젝트를 Vercel에 배포하는 방법을 설명합니다.

## 사전 준비사항

1. **Vercel 계정**: [vercel.com](https://vercel.com)에서 계정 생성
2. **GitHub Repository**: 프로젝트가 GitHub에 푸시되어 있어야 함
3. **환경 변수**: Supabase 및 기타 서비스의 API 키들

## 1. Vercel CLI 설치 (선택사항)

```bash
npm i -g vercel
```

## 2. 환경 변수 설정

### 로컬 개발용
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_NAME=Travelap
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development
```

### Vercel 프로덕션용
Vercel 대시보드에서 다음 환경 변수들을 설정하세요:

- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anonymous Key
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API 키 (필수!)
- `VITE_APP_NAME`: Travelap
- `VITE_APP_VERSION`: 1.0.0
- `VITE_APP_ENV`: production

**중요**: Google Maps가 표시되려면 `VITE_GOOGLE_MAPS_API_KEY`가 반드시 설정되어야 합니다. 자세한 설정 방법은 `GOOGLE_MAPS_SETUP.md` 파일을 참고하세요.

## 3. GitHub 연동을 통한 배포 (추천)

### Step 1: GitHub에 코드 푸시
```bash
git add .
git commit -m "feat: Setup for Vercel deployment"
git push origin main
```

### Step 2: Vercel에서 프로젝트 가져오기
1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: 환경 변수 설정
1. 프로젝트 설정 → Environment Variables
2. 위에서 언급한 환경 변수들을 추가
3. 모든 환경(Production, Preview, Development)에 적용

### Step 4: 배포 실행
1. "Deploy" 클릭
2. 빌드 과정 확인
3. 배포 완료 후 URL 확인

## 4. CLI를 통한 배포

### Step 1: 프로젝트 연결
```bash
vercel
```

### Step 2: 환경 변수 추가
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Step 3: 배포
```bash
vercel --prod
```

## 5. 커스텀 도메인 설정 (선택사항)

1. Vercel 프로젝트 설정 → Domains
2. 원하는 도메인 추가
3. DNS 설정에서 CNAME 레코드 추가

## 6. 빌드 최적화

### Vite 설정 최적화
`vite.config.ts`에서 프로덕션 빌드 최적화:

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  }
})
```

## 7. 자동 배포 설정

GitHub 연동 시 자동으로 설정됩니다:
- **Production**: `main` 브랜치 푸시 시 자동 배포
- **Preview**: Pull Request 생성 시 미리보기 배포

## 8. 모니터링 및 로그

- **Analytics**: Vercel 대시보드에서 트래픽 확인
- **Function Logs**: 서버사이드 함수 로그 확인
- **Build Logs**: 빌드 과정의 로그 확인

## 9. 문제 해결

### 일반적인 오류들

#### 빌드 오류
```bash
# 로컬에서 빌드 테스트
npm run build
```

#### 환경 변수 오류
- 모든 `VITE_` 접두사가 있는지 확인
- Vercel 대시보드에서 환경 변수 설정 확인

#### 라우팅 오류 (404)
- `vercel.json`의 routes 설정 확인
- SPA 라우팅이 올바르게 설정되었는지 확인

### 유용한 명령어들

```bash
# 로컬 빌드 테스트
npm run build
npm run preview

# 타입 체크
npm run typecheck

# 린팅
npm run lint

# Vercel 로그 확인
vercel logs
```

## 10. 성능 최적화 권장사항

1. **이미지 최적화**: WebP 포맷 사용
2. **코드 분할**: 라우트별 lazy loading
3. **CDN 활용**: 정적 리소스 CDN 사용
4. **캐싱**: 적절한 캐시 헤더 설정

---

## 참고 링크

- [Vercel 공식 문서](https://vercel.com/docs)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)
- [React Router와 Vercel](https://vercel.com/guides/deploying-react-with-vercel)