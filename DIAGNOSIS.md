# 이미지 업로드 문제 - 근본 원인 분석

## 📊 진단 결과

### ✅ 확인된 것들
1. **Service Worker**: 없음
2. **PWA**: 없음
3. **AdminPage 코드**: ✅ 올바르게 수정됨 (`/api/upload-image` 호출)
4. **빌드**: ✅ 성공 (`index-CEzV8NVg.js` 생성)
5. **Git Push**: ✅ 완료
6. **Vercel Blob Token**: ✅ 설정됨

### 🔴 발견된 문제

#### **근본 원인: `index.html` 캐시 정책 누락**

**현재 vercel.json:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [{"key": "Cache-Control", "value": "no-store, must-revalidate"}]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]
    }
  ]
}
```

**문제점:**
- ❌ `/index.html`의 캐시 정책이 **없음**
- ❌ 브라우저가 `index.html`을 캐시함
- ❌ 오래된 `index.html`이 오래된 JS 파일 hash 참조
- ❌ 새 빌드가 배포되어도 브라우저가 오래된 JS 로드

## 🔄 동작 원리 (문제 발생)

```
[새 빌드 배포]
1. Vite 빌드 → index-NEW_HASH.js 생성
2. index.html → <script src="/assets/index-NEW_HASH.js">
3. Vercel 배포 완료

[사용자 브라우저]
1. 브라우저가 캐시된 index.html 로드 (오래됨)
   → <script src="/assets/index-OLD_HASH.js">
2. Vercel CDN에서 index-OLD_HASH.js 반환 (1년 캐시)
3. ❌ AdminPage 구버전 코드 실행
4. ❌ blob URL 생성
```

## 💡 해결 방법

### **Option 1: index.html에 no-cache 추가** (추천)

```json
{
  "headers": [
    {
      "source": "/(index.html)?",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**효과:**
- ✅ `index.html`이 항상 최신 버전 로드
- ✅ 새 빌드 시 새 JS hash 로드
- ✅ assets는 여전히 1년 캐시 (hash 기반이므로 안전)

### **Option 2: Vercel 환경변수로 빌드 ID 추가**

```json
// vite.config.ts
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || Date.now())
  }
})
```

```tsx
// App.tsx
console.log('Build ID:', __BUILD_ID__);
```

### **Option 3: Query string 버전 추가**

```html
<!-- index.html -->
<script type="module" src="/main.tsx?v=BUILD_ID"></script>
```

## 🎯 권장 조치

1. **즉시**: `vercel.json`에 index.html 캐시 정책 추가
2. **배포**: Git push → Vercel 자동 배포
3. **검증**:
   - 새 브라우저에서 테스트
   - Network 탭에서 index.html이 200 (from server) 확인
   - 새 JS hash 로드 확인

## 📈 예상 결과

**수정 후:**
```
[새 빌드 배포]
1. Vite 빌드 → index-NEW_HASH.js
2. index.html 업데이트
3. Vercel 배포

[사용자 브라우저]
1. index.html 요청 → Cache-Control: max-age=0
   → ✅ 서버에서 최신 index.html 로드
2. <script src="/assets/index-NEW_HASH.js">
   → ✅ 새 JS 파일 로드
3. ✅ AdminPage 새 코드 실행
4. ✅ /api/upload-image 호출
5. ✅ Vercel Blob Storage에 업로드
6. ✅ HTTPS URL 저장
7. ✅ 모든 기기에서 이미지 보임
```

## 🔍 검증 방법

### 브라우저 DevTools에서:
1. Network 탭 열기
2. Disable cache 체크
3. Hard refresh (Ctrl+Shift+R)
4. index.html 확인:
   - ❌ Status: 200 (from disk cache) → 문제
   - ✅ Status: 200 → 해결
5. JS 파일 hash 확인:
   - index-CEzV8NVg.js (옛날) vs index-NEW.js (새것)

### 콘솔 로그 확인:
```
✅ 새 코드:
🚀 [NEW CODE v2.0] handleImageUpload 시작
📤 업로드할 파일: 1개
📡 /api/upload-image 호출...
✅ 성공: image.jpg
   URL: https://xxx.public.blob.vercel-storage.com/...

❌ 구버전 (또는 로그 없음)
```

---

## 결론

**문제:** index.html 캐시로 인해 구버전 JS 로드
**해결:** index.html에 `Cache-Control: max-age=0` 추가
**소요시간:** 5분 (설정 변경 + 배포)
**효과:** 영구적 해결
