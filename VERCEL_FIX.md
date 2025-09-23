# Vercel 권한 오류 해결 가이드

Vercel에서 `Permission denied` 오류가 발생할 때의 해결 방법입니다.

## 🚨 문제
```
sh: line 1: /vercel/path0/node_modules/.bin/vite: Permission denied
Error: Command "npm run build" exited with 126
```

## ✅ 해결 방법

### 방법 1: Framework Preset 변경 (추천)

1. **Vercel 프로젝트 삭제** (기존 프로젝트가 있다면)
2. **새 프로젝트 생성**
3. **Framework Preset: "Other"** 선택 ⚠️ (Vite 대신)
4. **Build Settings 수동 설정**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 방법 2: Build Command 직접 지정

Vercel 프로젝트 설정에서:
- **Build Command**: `node ./node_modules/vite/bin/vite.js build`
- **Output Directory**: `dist`

### 방법 3: 환경 변수로 Node 버전 고정

Environment Variables에 추가:
```
NODE_VERSION = 18.17.0
```

## 🔧 현재 프로젝트 설정

현재 `package.json`의 빌드 스크립트:
```json
{
  "scripts": {
    "build": "node ./node_modules/vite/bin/vite.js build"
  },
  "engines": {
    "node": "18.x"
  }
}
```

이 설정으로 권한 문제 없이 빌드가 가능합니다.

## 🎯 권장 배포 과정

1. **Framework Preset**: "Other" 선택
2. **환경 변수 설정**:
   ```
   VITE_GOOGLE_MAPS_API_KEY = your_api_key
   VITE_SUPABASE_URL = your_supabase_url
   VITE_SUPABASE_ANON_KEY = your_supabase_key
   ```
3. **Deploy 클릭**

이제 권한 오류 없이 정상 배포됩니다! ✅