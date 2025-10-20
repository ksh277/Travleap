# 상품 추가 템플릿 사용법

## 주소 검색 자동화 템플릿 (추천!)

`add-product-with-address.ts`를 사용하면 **주소만 입력해도 자동으로 좌표를 찾아서 저장**합니다.

### 사용 방법

1. **템플릿 복사**
```bash
cp scripts/templates/add-product-with-address.ts scripts/add-my-hotel.ts
```

2. **상품 정보 수정** (scripts/add-my-hotel.ts 파일 열기)

```typescript
const productsData = [
  {
    title: '내 호텔 이름',
    category_id: 1857, // 숙박:1857, 액티비티:1855, 렌트카:1858

    // 주소 검색 (간단하게 입력!)
    location_search: '신안군 증도면',    // 이것만 입력하면 OK!

    // 상세 주소 (선택사항)
    address_detail: '중도 월령리 123',  // 필요하면 추가

    price_from: 80000,
    price_to: 220000,

    // ... 나머지 정보
  }
];
```

3. **실행**
```bash
npx tsx scripts/add-my-hotel.ts
```

4. **결과**
```
🔍 주소 검색: "신안군 증도면"
   ✅ 주소 발견:
      전라남도 신안군 증도면
      좌표: 34.9876, 126.1234

💾 데이터베이스에 저장 중...
   ✅ 저장 완료! (ID: 32)
   📍 위치: 전라남도 신안군 증도면 중도 월령리 123
   🗺️  좌표: 34.9876,126.1234
   🛒 장바구니: 활성화
   ⚡ 즉시 예약: 가능
```

### 자동으로 설정되는 것들

- ✅ **좌표 자동 검색**: 카카오 API로 위도/경도 자동 저장
- ✅ **장바구니 활성화**: cart_enabled = true
- ✅ **즉시 예약 가능**: instant_booking = true
- ✅ **리뷰 카운트**: 0으로 초기화 (리뷰 작성 시 자동 증가)
- ✅ **상세페이지 지도**: 좌표가 저장되어 자동으로 지도 표시

## 카테고리 ID

```
숙박 (stay):       1857
액티비티:          1855
렌트카:            1858
레저:              1859
쇼핑:              1860
맛집:              1861
문화관광:          1862
```

## 예시

### 숙박업소 추가
```typescript
{
  title: '신안 증도 게스트하우스',
  category_id: 1857,
  location_search: '신안군 증도면',
  address_detail: '대초리 456',
  price_from: 50000,
  price_to: 100000,
  // ...
}
```

### 맛집 추가
```typescript
{
  title: '신안 전통 젓갈 전문점',
  category_id: 1861,
  location_search: '신안군 지도읍',
  address_detail: '지도시장 내',
  price_from: 10000,
  price_to: 30000,
  // ...
}
```

### 관광지 추가
```typescript
{
  title: '증도 태평염전',
  category_id: 1862,
  location_search: '신안군 증도면 태평염전',
  price_from: 0,  // 무료 관광지
  // ...
}
```

## 주의사항

- 카카오 API 키가 `.env` 파일에 설정되어 있어야 합니다
  ```
  VITE_KAKAO_APP_KEY=your_kakao_api_key
  ```
- `location_search`는 최대한 정확하게 입력 (예: "신안군 증도면")
- 검색 결과가 여러 개면 첫 번째 결과가 자동 선택됩니다
- 좌표가 없으면 상세페이지 지도가 표시되지 않을 수 있습니다

## 문제 해결

### 주소 검색이 안 될 때
```bash
# 주소가 맞는지 직접 테스트
npx tsx scripts/utils/kakao-address.ts "검색할 주소"
```

### 카카오 API 키가 없을 때
1. https://developers.kakao.com/ 접속
2. 앱 생성
3. JavaScript 키 복사
4. `.env` 파일에 `VITE_KAKAO_APP_KEY=복사한키` 추가
