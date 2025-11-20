# 이미지 업로드 문제 진단 체크리스트

## 🚨 **가능한 원인 분석**

### ❗ **가능성 1: 배포가 아직 완료되지 않음** (가장 높음)
**증상:** 모바일에서 여전히 blob URL이 생성됨
**원인:** Vercel이 새 코드를 아직 배포하지 않음 (push 후 2-5분 소요)
**해결:**
1. GitHub에서 Actions 탭 확인
2. Vercel 대시보드에서 배포 상태 확인
3. 5분 정도 기다린 후 재시도

---

### ❗ **가능성 2: 브라우저 캐시 문제** (높음)
**증상:** 모바일 브라우저가 오래된 JS 파일 사용
**원인:** 브라우저가 이전 버전의 AdminPage.tsx 캐시
**해결:**
```
모바일에서:
1. Chrome: 설정 → 개인정보 보호 → 인터넷 사용 기록 삭제 → 캐시된 이미지 및 파일
2. Safari: 설정 → Safari → 방문 기록 및 웹사이트 데이터 지우기
3. 또는 시크릿 모드로 접속
```

---

### ❗ **가능성 3: 인증 토큰 없음** (중간)
**증상:** API 호출이 401 Unauthorized 반환
**원인:** AdminPage.tsx 1128번 줄에서 `localStorage.getItem('token')`이 null
**코드:**
```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,  // token이 null이면 "Bearer null"
},
```

**확인 방법:**
1. 모바일 브라우저에서 개발자 도구 열기 (Chrome Remote Debugging)
2. Console 탭에서 입력: `localStorage.getItem('token')`
3. null이면 → 로그인 필요

---

### ❗ **가능성 4: Vercel 환경변수 누락** (중간)
**증상:** API가 500 에러 반환, "Vercel Blob 업로드 실패" 메시지
**원인:** `BLOB_READ_WRITE_TOKEN`이 Vercel 프로덕션에 설정되지 않음
**로컬 .env:** ✅ 있음 (확인 완료)
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_Sz7jnwkAJIx1GylF_...
```

**Vercel 프로덕션:** ❓ 확인 필요

**해결:**
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. `BLOB_READ_WRITE_TOKEN` 변수가 있는지 확인
3. 없으면 추가:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: `vercel_blob_rw_Sz7jnwkAJIx1GylF_2RBmD9kMU2v8QbN6UxYvj8KSD2jwWz`
   - Environment: Production
4. 재배포 필요

---

### ❗ **가능성 5: API 호출 자체가 실패** (낮음)
**증상:** Toast 에러 메시지가 보임, 콘솔에 에러
**원인:** 네트워크 문제, CORS, API 버그

---

## 📋 **사용자가 확인해야 할 것들**

### **단계 1: 배포 확인**
- [ ] GitHub → Actions 탭에서 최신 커밋 (925977f) 배포 완료 확인
- [ ] 또는 5분 기다린 후 재시도

### **단계 2: 브라우저 캐시 삭제**
- [ ] 모바일 브라우저 캐시 완전 삭제
- [ ] 또는 시크릿/프라이빗 모드로 테스트

### **단계 3: 에러 메시지 확인**
이미지 업로드 시 어떤 Toast 메시지가 보이나요?
- [ ] "X개의 이미지를 업로드하는 중..." → "✅ X개의 이미지가 업로드되었습니다." (성공)
- [ ] "❌ X개의 이미지 업로드에 실패했습니다." (실패)
- [ ] 아무 메시지도 안 보임 (코드가 안 바뀜)

### **단계 4: 브라우저 콘솔 확인** (중요!)
모바일에서 개발자 도구를 열어주세요:
```
1. Chrome 모바일:
   - chrome://inspect 에서 USB 디버깅
   - 또는 데스크톱 Chrome → 우클릭 → 검사

2. Safari 모바일:
   - Mac Safari → 개발자 → [기기 이름] → 페이지
```

Console에서 확인:
- [ ] `localStorage.getItem('token')` → 값이 있나요?
- [ ] 이미지 업로드 시 에러 메시지가 있나요?
- [ ] "✅ Uploaded [파일명] to: [URL]" 로그가 보이나요?

### **단계 5: 네트워크 탭 확인**
Network 탭에서:
- [ ] `/api/upload-image` 요청이 보이나요?
- [ ] 요청의 Status Code는? (200=성공, 401=인증실패, 500=서버에러)
- [ ] Response에 무엇이 있나요?

---

## 🔧 **즉시 시도할 해결책**

### **해결책 A: 시크릿 모드 테스트** (가장 빠름)
```
1. 모바일 브라우저 시크릿/프라이빗 모드로 사이트 접속
2. AdminPage 로그인
3. 이미지 업로드 시도
4. 작동하면 → 캐시 문제 확인
```

### **해결책 B: Vercel 환경변수 확인** (가장 중요)
```
1. Vercel.com 로그인
2. travleap 프로젝트 선택
3. Settings → Environment Variables
4. BLOB_READ_WRITE_TOKEN 확인
5. 없으면 추가 후 Redeploy
```

### **해결책 C: 배포 대기**
```
1. GitHub → Actions 탭에서 배포 완료 확인
2. 완료되면 5분 후 재시도
```

---

## 🎯 **다음 단계**

사용자님께서 확인해주실 것:
1. ⏱️ **push한 지 얼마나 지났나요?** (5분 이내면 배포 대기)
2. 🔄 **시크릿 모드에서 테스트해보셨나요?**
3. 🔐 **AdminPage에 로그인되어 있나요?** (우측 상단에 로그아웃 버튼 보이나요?)
4. ⚠️ **어떤 Toast 메시지가 보였나요?**
5. 🔍 **브라우저 콘솔에 에러가 있나요?**

위 정보를 제공해주시면 정확한 원인을 파악할 수 있습니다!
