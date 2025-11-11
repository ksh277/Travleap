# 지도 핀포인트 주소 표시 문제 해결 보고서

## 문제 요약

**증상**: 지도 마커(핀포인트)를 클릭했을 때 InfoWindow에 "전남 신안군"만 표시되고 상세주소가 표시되지 않음

**원인**: `PartnerPage.tsx`에서 `partner.location` 필드만 사용하고 있어서 상세주소 정보를 표시하지 않음

---

## 상세 분석

### 1. API 응답 데이터 구조

**파일**: `C:\Users\ham57\Desktop\Travleap\api\partners.js` (32-33번 라인)

API는 다음 주소 관련 필드들을 반환합니다:

```javascript
SELECT
  p.business_address,    // 전체 주소 (예: "전남 신안군 지도읍 송도리 123")
  p.location,            // 간단한 위치 (예: "전남 신안군")
  p.detailed_address,    // 상세 주소 (예: "지도읍 송도리 123")
  ...
FROM partners p
```

**주소 필드 설명**:
- `location`: 시/도 + 시/군/구 (예: "전남 신안군")
- `business_address`: 전체 주소 (예: "전남 신안군 지도읍 송도리 123")
- `detailed_address`: location 이후의 상세 주소 (예: "지도읍 송도리 123")

### 2. 기존 코드의 문제점

**파일**: `C:\Users\ham57\Desktop\Travleap\components\PartnerPage.tsx`

#### 문제 1: 주소 필드 선택 (기존 109번 라인)
```typescript
location: partner.location || displayAddress,
```
- `partner.location`만 사용하여 "전남 신안군"만 표시됨
- API에서 받아온 `business_address`, `detailed_address` 필드를 무시

#### 문제 2: InfoWindow 표시 (481번 라인)
```typescript
<p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${partner.location}</p>
```
- 마커 클릭 시 InfoWindow에서도 `partner.location`만 사용
- 상세주소가 표시되지 않음

### 3. 데이터베이스 테이블 구조

**파일**: `C:\Users\ham57\Desktop\Travleap\create-tables-planetscale.js`

```sql
CREATE TABLE partners (
  ...
  business_address VARCHAR(255),
  location VARCHAR(255),
  detailed_address VARCHAR(255),
  ...
)
```

---

## 해결 방법

### 수정된 코드 (PartnerPage.tsx)

#### 1. 주소 조합 로직 추가 (78-94번 라인)

```typescript
// 주소 처리: 상세주소 우선, 없으면 business_address, 없으면 location
// detailed_address: 상세 주소 (예: "지도읍 송도리 123")
// business_address: 전체 주소 (예: "전남 신안군 지도읍 송도리 123")
// location: 간단한 위치 (예: "전남 신안군")
let fullAddress = '';
if (partner.detailed_address && partner.detailed_address.trim()) {
  // detailed_address가 있으면 location과 조합
  fullAddress = partner.location
    ? `${partner.location} ${partner.detailed_address}`
    : partner.detailed_address;
} else if (partner.business_address && partner.business_address.trim()) {
  // business_address가 있으면 그대로 사용
  fullAddress = partner.business_address;
} else {
  // 둘 다 없으면 location 사용
  fullAddress = partner.location || '신안군';
}

const partnerCard: Partner = {
  ...
  location: fullAddress,  // 기존: partner.location
  ...
};
```

#### 2. 주소 표시 우선순위

1. **우선순위 1**: `detailed_address` 있음
   - `location` + `detailed_address` 조합
   - 예: "전남 신안군" + "지도읍 송도리 123" = "전남 신안군 지도읍 송도리 123"

2. **우선순위 2**: `business_address`만 있음
   - `business_address` 그대로 사용
   - 예: "전남 신안군 증도면 대초리 456"

3. **우선순위 3**: 둘 다 없음
   - `location` 사용 (기존 동작 유지)
   - 예: "전남 신안군"

---

## 테스트

### 테스트 스크립트 실행

```bash
# 주소 조합 로직 테스트
node scripts/test-partner-address-display.cjs
```

**테스트 결과**:
```
Partner 1: 신안 투어 A
  location: 전남 신안군
  business_address: 전남 신안군 지도읍 송도리 123
  detailed_address: 지도읍 송도리 123
  → 최종 표시 주소: "전남 신안군 지도읍 송도리 123"

Partner 2: 신안 투어 B
  location: 전남 신안군
  business_address: 전남 신안군 증도면 대초리 456
  detailed_address: (없음)
  → 최종 표시 주소: "전남 신안군 증도면 대초리 456"

Partner 3: 신안 투어 C
  location: 전남 신안군
  business_address: (없음)
  detailed_address: (없음)
  → 최종 표시 주소: "전남 신안군"

Partner 4: 신안 투어 D
  location: 전남 신안군
  business_address: (없음)
  detailed_address: 홍도면 1구 789
  → 최종 표시 주소: "전남 신안군 홍도면 1구 789"
```

---

## 데이터베이스 데이터 업데이트 (필요시)

### 현재 데이터 상태 확인

만약 DB의 `business_address` 또는 `detailed_address` 필드가 비어있다면 업데이트가 필요합니다.

### 주소 데이터 업데이트 스크립트

```bash
# 주소 데이터 업데이트 (주의: 실제 DB 수정)
node scripts/update-partner-addresses.cjs --run
```

**스크립트 기능**:
1. 현재 partners 테이블의 주소 데이터 상태 확인
2. `business_address`와 `detailed_address`가 비어있는 레코드 업데이트
3. 업데이트 후 상태 확인

---

## 영향 범위

### 변경된 파일

1. **C:\Users\ham57\Desktop\Travleap\components\PartnerPage.tsx**
   - 주소 조합 로직 추가 (78-94번 라인)
   - `location` 필드에 상세주소 포함

### 영향받는 UI 컴포넌트

1. **지도 마커 InfoWindow** (481번 라인)
   - 마커 클릭 시 표시되는 주소
   - 변경 전: "전남 신안군"
   - 변경 후: "전남 신안군 지도읍 송도리 123"

2. **파트너 카드 리스트** (941번, 1189번 라인)
   - 파트너 목록에 표시되는 주소
   - 동일하게 상세주소 표시

---

## 추가 개선 사항

### 1. 주소 필드 검증

API에서 주소 필드를 반환할 때 유효성 검증:

```javascript
// api/partners.js에 추가 가능
const validateAddress = (partner) => {
  if (!partner.business_address && !partner.detailed_address) {
    console.warn(`Partner ${partner.id} has no detailed address`);
  }
  return partner;
};
```

### 2. 관리자 페이지에서 주소 입력

파트너 등록/수정 시 주소 필드를 명확하게 분리:

- `location`: 자동 선택 (시/도, 시/군/구)
- `detailed_address`: 직접 입력 (나머지 상세주소)
- `business_address`: 자동 생성 (location + detailed_address)

### 3. Geocoding API 활용

주소를 좌표로 변환하여 정확한 지도 표시:

```javascript
// 주소 → 좌표 변환
const geocodeAddress = async (address) => {
  const geocoder = new google.maps.Geocoder();
  const result = await geocoder.geocode({ address });
  return result.results[0].geometry.location;
};
```

---

## 결론

### 해결 완료

✅ **지도 핀포인트 주소 표시 문제 해결**
- 기존: "전남 신안군"만 표시
- 개선: "전남 신안군 지도읍 송도리 123" 등 상세주소 표시

### 적용 방법

1. **코드 수정 완료**: `PartnerPage.tsx` 수정됨
2. **DB 데이터 확인**: 주소 필드에 데이터가 있는지 확인
3. **필요시 업데이트**: `update-partner-addresses.cjs` 스크립트 실행

### 테스트 체크리스트

- [ ] 개발 환경에서 파트너 페이지 접속
- [ ] 지도에서 마커 클릭
- [ ] InfoWindow에 상세주소가 표시되는지 확인
- [ ] 파트너 카드 목록에서 주소 확인
- [ ] 다양한 주소 데이터 케이스 테스트

---

## 관련 파일

**수정된 파일**:
- `C:\Users\ham57\Desktop\Travleap\components\PartnerPage.tsx`

**API 파일**:
- `C:\Users\ham57\Desktop\Travleap\api\partners.js`

**테스트 스크립트**:
- `C:\Users\ham57\Desktop\Travleap\scripts\test-partner-address-display.cjs`
- `C:\Users\ham57\Desktop\Travleap\scripts\update-partner-addresses.cjs`

**데이터베이스 스키마**:
- `C:\Users\ham57\Desktop\Travleap\create-tables-planetscale.js`
- `C:\Users\ham57\Desktop\Travleap\database-schema.sql`

---

**작성일**: 2025-11-11
**작성자**: Claude Code
**버전**: 1.0
