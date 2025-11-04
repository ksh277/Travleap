# 카테고리 API 연동 문제 분석 및 수정 계획

## 📋 종합 분석 결과

### ✅ 좋은 소식: API는 완전히 구현되어 있음!

모든 카테고리 API가 이미 완벽하게 구현되어 있습니다:

1. **투어** - `/api/tour/packages` ✅
2. **관광지** - `/api/attractions/list` ✅
3. **체험** - `/api/experience/list` ✅
4. **이벤트** - `/api/events/list` ✅

각 API는 다음 기능을 제공:
- GET 목록 (필터링, 검색, 정렬, 페이징)
- GET 상세 (`?id=123` 쿼리 파라미터)
- JSON 필드 자동 파싱
- listings/partners 테이블 JOIN
- 예약/티켓 통계

---

## ❌ 문제: 프론트엔드가 API를 잘못 호출함

### 1. 투어 (TourPackageDetailPage.tsx)

**현재 코드**:
```typescript
const response = await fetch(`/api/tour/packages/${id}`);
// 응답 기대: result.data.package, result.data.availableSchedules
```

**문제점**:
- ❌ 경로 불일치: `/api/tour/packages/${id}` (존재하지 않음)
- ❌ 응답 구조 불일치

**백엔드 실제 API**:
```
GET /api/tour/packages?id=123
응답: { success: true, package: {...} }
```

**수정 필요**:
```typescript
const response = await fetch(`/api/tour/packages?id=${id}`);
const result = await response.json();
if (result.success && result.package) {
  setPackageData(result.package);
}
```

---

### 2. 관광지 (AttractionDetailPage.tsx)

**현재 코드**:
```typescript
const response = await fetch(`/api/tourist/list?limit=1`);
const result = await response.json();
if (result.success) {
  setAttraction(result.data[0]); // 첫 번째 항목만!
}
```

**문제점**:
- ❌ 잘못된 경로: `/api/tourist/list` (존재하지 않음)
- ❌ `id` 파라미터 무시
- ❌ 항상 첫 번째 항목만 표시

**백엔드 실제 API**:
```
GET /api/attractions/list?id=123
응답: { success: true, attraction: {...} }
```

**수정 필요**:
```typescript
const response = await fetch(`/api/attractions/list?id=${id}`);
const result = await response.json();
if (result.success && result.attraction) {
  setAttraction(result.attraction);
}
```

---

### 3. 체험 (ExperienceDetailPage.tsx)

**현재 코드**:
```typescript
const expResponse = await fetch(`/api/experience/list?limit=1`);
const expResult = await expResponse.json();

const slotResponse = await fetch(`/api/experience/slots/${id}`);
const slotResult = await slotResponse.json();
```

**문제점**:
- ❌ `id` 파라미터 무시
- ❌ `/api/experience/slots/${id}` API 존재하지 않음

**백엔드 실제 API**:
```
GET /api/experience/list?id=123
응답: { success: true, experience: {...} }
```

**수정 필요**:
```typescript
const response = await fetch(`/api/experience/list?id=${id}`);
const result = await response.json();
if (result.success && result.experience) {
  setExperience(result.experience);
}
```

---

### 4. 이벤트 (EventDetailPage.tsx)

**현재 코드**:
```typescript
const response = await fetch(`/api/event/list?limit=1`);
```

**문제점**:
- ❌ 잘못된 경로: `/api/event/list` (실제는 `/api/events/list`)
- ❌ `id` 파라미터 무시

**백엔드 실제 API**:
```
GET /api/events/list?id=123
응답: { success: true, event: {...} }
```

**수정 필요**:
```typescript
const response = await fetch(`/api/events/list?id=${id}`);
const result = await response.json();
if (result.success && result.event) {
  setEvent(result.event);
}
```

---

## 🔧 수정 계획

### 우선순위 1: API 호출 수정 (즉시 가능)

각 DetailPage 컴포넌트 수정:

1. **TourPackageDetailPage.tsx** (Line 104)
   - Before: `/api/tour/packages/${id}`
   - After: `/api/tour/packages?id=${id}`
   - 응답 구조: `result.package` (not `result.data.package`)

2. **AttractionDetailPage.tsx** (Line 70)
   - Before: `/api/tourist/list?limit=1`
   - After: `/api/attractions/list?id=${id}`
   - 응답 구조: `result.attraction` (not `result.data[0]`)

3. **ExperienceDetailPage.tsx** (Line 80)
   - Before: `/api/experience/list?limit=1`
   - After: `/api/experience/list?id=${id}`
   - 응답 구조: `result.experience`

4. **EventDetailPage.tsx** (Line 61)
   - Before: `/api/event/list?limit=1`
   - After: `/api/events/list?id=${id}`
   - 응답 구조: `result.event`

### 우선순위 2: 예약/티켓 API 확인

다음 API들이 존재하는지 확인 필요:
- `/api/tour/schedules` (투어 일정)
- `/api/experience/slots` (체험 슬롯)
- `/api/attractions/tickets` (관광지 티켓)
- `/api/events/tickets` (이벤트 티켓)

### 우선순위 3: 테스트

각 카테고리별:
1. 목록 페이지 → 상세 페이지 이동
2. 데이터 로딩 확인
3. 이미지 갤러리 작동
4. 예약/구매 폼 작동
5. 가격 계산 확인

---

## 📊 예상 소요 시간

| 작업 | 예상 시간 | 난이도 |
|-----|---------|--------|
| 투어 API 수정 | 15분 | 쉬움 |
| 관광지 API 수정 | 15분 | 쉬움 |
| 체험 API 수정 | 20분 | 쉬움 |
| 이벤트 API 수정 | 15분 | 쉬움 |
| 테스트 (4개 카테고리) | 1시간 | 중간 |
| **총계** | **약 2시간** | - |

---

## 🎯 수정 후 기대 효과

✅ 모든 카테고리 상세 페이지 정상 작동
✅ 특정 상품/서비스 ID로 정확한 데이터 로드
✅ 예약/구매 플로우 완성
✅ 사용자 경험 대폭 개선

---

## 📝 참고사항

### 백엔드 API 응답 형식 (통일됨)

```json
{
  "success": true,
  "package": {...},      // 투어
  "attraction": {...},   // 관광지
  "experience": {...},   // 체험
  "event": {...}         // 이벤트
}
```

### 목록 API 응답 형식

```json
{
  "success": true,
  "packages": [...],     // 투어
  "attractions": [...],  // 관광지
  "experiences": [...],  // 체험
  "events": [...],       // 이벤트
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## ✅ 결론

**원래 예상**: API가 없어서 16시간 개발 필요
**실제 상황**: API는 완벽! 프론트엔드 수정만 2시간이면 충분

**즉시 시작 가능!** 🚀
