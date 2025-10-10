# 🏗️ 실제 로컬 DB로 완벽 테스트 가이드

## ⚠️ 중요: Mock 데이터 사용 금지
- 이 가이드는 **실제 IndexedDB**를 사용합니다
- **Mock 데이터를 사용하지 않습니다**
- 모든 데이터는 실제 DB 테이블에 저장됩니다

---

## 📋 사전 준비

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. IndexedDB 확인
브라우저 개발자 도구(F12) → Application 탭 → IndexedDB → `travel_platform_db`

**필수 테이블 확인:**
- ✅ categories
- ✅ listings
- ✅ pms_configs
- ✅ room_types
- ✅ room_media
- ✅ rate_plans
- ✅ room_inventory

없으면:
```javascript
// 브라우저 콘솔에서
forceReinitDB()
```

---

## 🧪 테스트 1: PMS 숙박 상품 등록 (실제 DB)

### Step 1: 관리자 로그인
```javascript
// 브라우저 콘솔
adminLogin()
```

URL: `http://localhost:5173/admin` 으로 자동 이동

### Step 2: 상품 추가 준비
1. "상품 관리" 탭 클릭
2. "+ 상품 추가" 버튼 클릭
3. **카테고리: "숙박" 선택**
4. **"PMS 연동" 버튼 클릭** (모달 열림)

### Step 3: 테스트 데이터 로드 (하지만 실제 DB에 저장됨!)
1. **"테스트 데이터 사용"** 버튼 클릭
2. 모달에 표시되는 정보 확인:
   ```
   호텔명: 신안 비치 호텔
   위치: 전라남도 신안군 압해읍
   객실 타입: 3개

   1. Deluxe Double - 120,000 KRW
      - Queen 침대, 최대 2명
      - 재고: 8 / 10

   2. Family Suite - 250,000 KRW
      - King + Twin 침대, 최대 4명
      - 재고: 3 / 5

   3. Standard Twin - 90,000 KRW
      - Twin 침대, 최대 2명
      - 재고: 12 / 15
   ```

### Step 4: 폼에 적용
1. **"폼에 적용하기"** 버튼 클릭
2. 모달이 닫힘
3. 상품 추가 폼에 자동으로 데이터가 채워진 것 확인:

**자동으로 채워진 필드:**
- 제목: `신안 비치 호텔`
- 카테고리: `숙박`
- 위치: `전라남도 신안군 압해읍`
- 설명: `아름다운 바다 전망과 함께...`
- 이미지 2개: Unsplash URL
- 가격: `120000`
- 최대인원: `2`
- 하이라이트 (3개 자동 생성):
  ```
  Deluxe Double - 120,000원 (최대 2명)
  Family Suite - 250,000원 (최대 4명)
  Standard Twin - 90,000원 (최대 2명)
  ```

### Step 5: 추가 정보 입력 (선택사항)
필요하면 수정/추가:
- 주소: "신안군 압해읍 해변로 123"
- 좌표: "34.8225,126.3214"
- 태그: "해변", "가족여행", "신혼여행"
- 편의시설: "WiFi", "주차장", "수영장"

### Step 6: 상품 저장 (실제 DB에!)
1. **"상품 추가"** 버튼 클릭
2. 콘솔에 로그 출력 확인:
   ```
   🏨 PMS 상품 저장 시작...
   DB에 상품 저장 중...
   ✅ DB 저장 완료: Listing ID = [숫자]
   ```
3. 토스트 메시지: **"✅ PMS 연동 숙박 상품이 등록되었습니다!"**

### Step 7: DB에 실제로 저장되었는지 확인

#### 7-1. Listings 테이블 확인
```javascript
// 브라우저 콘솔
db.findAll('listings').then(result => {
  console.table(result);
});
```

**기대 결과:**
```
id: 1 (또는 auto-increment된 숫자)
title: "신안 비치 호텔"
category: "숙박"
category_id: 2
location: "전라남도 신안군 압해읍"
price_from: 90000
price_to: 250000
images: ["https://...", "https://..."]
highlights: ["Deluxe Double - 120,000원...", ...]
is_active: true
is_published: false  // 관리자 검토 필요
created_at: "2025-10-10T..."
```

#### 7-2. PMS 설정 테이블 확인
```javascript
db.findAll('pms_configs').then(result => {
  console.table(result);
});
```

**기대 결과:**
```
id: 1
listing_id: 1  // listings 테이블의 ID
vendor: "cloudbeds"
hotel_id: "test_hotel_001"
webhook_enabled: false
polling_enabled: true
polling_interval_seconds: 300
is_active: true
```

#### 7-3. 객실 타입 테이블 확인
```javascript
db.findAll('room_types').then(result => {
  console.table(result);
  console.log(`총 ${result.length}개 객실 타입`);
});
```

**기대 결과: 3개 rows**
```
Row 1:
  id: 1
  listing_id: 1
  pms_vendor: "cloudbeds"
  pms_room_type_id: "deluxe_double"
  room_type_name: "Deluxe Double"
  max_occupancy: 2
  bed_type: "Queen"
  amenities: ["WiFi", "에어컨", ...]

Row 2:
  id: 2
  pms_room_type_id: "family_suite"
  room_type_name: "Family Suite"
  max_occupancy: 4
  bed_type: "King + Twin"

Row 3:
  id: 3
  pms_room_type_id: "standard_twin"
  room_type_name: "Standard Twin"
  max_occupancy: 2
  bed_type: "Twin"
```

#### 7-4. 객실 이미지 테이블 확인
```javascript
db.findAll('room_media').then(result => {
  console.table(result);
  console.log(`총 ${result.length}개 이미지`);
});
```

**기대 결과: 3개 rows** (각 객실당 1개 이미지)

#### 7-5. 요금 플랜 테이블 확인
```javascript
db.findAll('rate_plans').then(result => {
  console.table(result);
});
```

**기대 결과: 3개 rows**
```
Row 1:
  room_type_id: 1
  pms_rate_plan_id: "rate_deluxe_double"
  rate_plan_name: "Standard Rate"
  base_price: 120000
  currency: "KRW"
  is_refundable: true

Row 2:
  room_type_id: 2
  base_price: 250000

Row 3:
  room_type_id: 3
  base_price: 90000
```

#### 7-6. 재고 테이블 확인 (30일분)
```javascript
db.findAll('room_inventory').then(result => {
  console.log(`총 ${result.length}개 재고 레코드`);
  console.table(result.slice(0, 10)); // 처음 10개만 표시
});
```

**기대 결과: 90개 rows** (3개 객실 × 30일)
```
총 90개 재고 레코드

Row 1:
  room_type_id: 1
  date: "2025-10-10"
  available: 8
  total: 10

Row 2:
  room_type_id: 1
  date: "2025-10-11"
  available: 8
  total: 10

... (30일치)

Row 31:
  room_type_id: 2
  date: "2025-10-10"
  available: 3
  total: 5

... (90개까지)
```

---

## 🧪 테스트 2: 카테고리 페이지에서 상품 확인

### Step 1: 숙박 카테고리 페이지 접속
```
http://localhost:5173/category/accommodation
```

또는
```
http://localhost:5173/category/stay
```

### Step 2: API 요청 확인
브라우저 개발자 도구 → Network 탭 → `listings` 요청 확인

**Request URL:**
```
/api/listings?category=stay&page=1&limit=20&sortBy=popular
```

**Response 확인:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "신안 비치 호텔",
      "category": "숙박",
      "price_from": 90000,
      "price_to": 250000,
      "location": "전라남도 신안군 압해읍",
      "images": ["https://..."],
      "highlights": [
        "Deluxe Double - 120,000원 (최대 2명)",
        "Family Suite - 250,000원 (최대 4명)",
        "Standard Twin - 90,000원 (최대 2명)"
      ],
      ...
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### Step 3: AccommodationCard 표시 확인

**카드 구조:**
```
┌─────────────────────────────────────┐
│  [호텔 이미지]                       │
│  🟢 실시간 예약                      │
│                                     │
├─────────────────────────────────────┤
│  신안 비치 호텔                      │
│  📍 전라남도 신안군 압해읍            │
│                                     │
│  ⭐ 0.0 (0개 리뷰)                  │
│                                     │
│  ┌───────────────────────────┐     │
│  │ 객실 타입                  │     │
│  │ Deluxe Double - 120,000원  │     │
│  │ (최대 2명)                 │     │
│  │ Family Suite - 250,000원   │     │
│  │ (최대 4명)                 │     │
│  └───────────────────────────┘     │
│                                     │
│  ₩90,000 ~ ₩250,000                │
│  1박 기준                           │
│                                     │
│  [WiFi] [에어컨] [TV]              │
│                                     │
└─────────────────────────────────────┘
```

**필수 확인사항:**
- ✅ 이미지 로드됨 (Unsplash)
- ✅ "실시간 예약" 초록 배지 표시
- ✅ 호텔명 정확
- ✅ 위치 정확
- ✅ 객실 타입 2개 표시 (3개 중 처음 2개)
- ✅ 가격 범위: ₩90,000 ~ ₩250,000
- ✅ "1박 기준" 표시

### Step 4: 인터랙션 테스트
1. **하트 아이콘 클릭**
   - 빨간색으로 변경
   - 토스트: "즐겨찾기에 추가되었습니다"
   - 다시 클릭 → 원래대로
   - 토스트: "즐겨찾기에서 제거되었습니다"

2. **카드 클릭**
   - URL 변경: `/accommodation/1` (실제 ID)
   - AccommodationDetailPage로 이동

---

## 🧪 테스트 3: 상세 페이지 확인

### Step 1: URL 직접 접속 또는 카드 클릭
```
http://localhost:5173/accommodation/1
```
(ID는 DB에 저장된 실제 숫자)

### Step 2: DB에서 데이터 로드되는지 확인
브라우저 콘솔에서 Network 탭 확인 또는:

```javascript
// 상세 정보 직접 조회
db.findOne('listings', { id: 1 }).then(console.log);
```

### Step 3: 페이지 구성 확인

#### 이미지 갤러리
- ✅ 메인 이미지 (Unsplash)
- ✅ 좌/우 화살표 (이미지 2개)
- ✅ 하단 썸네일 (2개)
- ✅ 이미지 번호: "1 / 2"

#### 호텔 정보 섹션
```
신안 비치 호텔
📍 전라남도 신안군 압해읍
⭐ 0.0 (0)
🟢 실시간 예약

아름다운 바다 전망과 함께 편안한 휴식을 즐길 수 있는 신안 대표 호텔입니다.
```

#### 객실 선택 섹션
```
객실 선택

┌──────────────────────────────────┐
│ Deluxe Double                    │
│ 👥 최대 2명                       │
│                     ₩120,000     │
│                     1박 기준     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Family Suite                     │
│ 👥 최대 4명                       │
│                     ₩250,000     │
│                     1박 기준     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Standard Twin                    │
│ 👥 최대 2명                       │
│                     ₩90,000      │
│                     1박 기준     │
└──────────────────────────────────┘
```

**객실 클릭 시:**
- 선택한 객실: 파란색 테두리 (`border-blue-500 bg-blue-50`)
- 다른 객실: 회색 테두리 (`border-gray-200`)

#### 편의시설 섹션
```
편의시설

📶 무료 Wi-Fi    ❄️ 에어컨    📺 TV    ☕ 조식 제공
```

#### 예약 사이드바 (우측, sticky)
```
┌─────────────────────┐
│ 1박 기준             │
│ ₩90,000 ~           │
│                     │
│ ──────────────────  │
│                     │
│ 체크인              │
│ [📅 날짜 선택]      │
│                     │
│ 체크아웃            │
│ [📅 날짜 선택]      │
│                     │
│ 인원                │
│ [-] 2명 [+]        │
│                     │
│ [  예약하기  ]      │
│                     │
│ 실시간 예약 -       │
│ 즉시 확정됩니다     │
└─────────────────────┘
```

### Step 4: 객실 타입이 어떻게 파싱되는지 확인

**데이터 흐름:**
1. DB `listings` 테이블의 `highlights` 컬럼:
   ```json
   [
     "Deluxe Double - 120,000원 (최대 2명)",
     "Family Suite - 250,000원 (최대 4명)",
     "Standard Twin - 90,000원 (최대 2명)"
   ]
   ```

2. AccommodationDetailPage에서 파싱:
   ```typescript
   const roomTypes = listing.highlights
     ?.filter(h => h.includes('원'))
     .map(h => {
       const match = h.match(/(.+?)\s*-\s*([0-9,]+)원\s*\(최대\s*(\d+)명\)/);
       return {
         name: match[1],      // "Deluxe Double"
         price: parseInt(...), // 120000
         occupancy: `최대 ${match[3]}명` // "최대 2명"
       };
     });
   ```

3. 화면에 표시:
   ```tsx
   {roomTypes.map((room, idx) => (
     <div className={selected ? 'border-blue-500' : 'border-gray-200'}>
       <h3>{room.name}</h3>
       <span>{room.occupancy}</span>
       <div>{formatPrice(room.price)}</div>
       <div>1박 기준</div>
     </div>
   ))}
   ```

### Step 5: 인터랙션 전체 테스트

#### 5-1. 객실 선택
```
1. Deluxe Double 클릭
   → 파란색 테두리
   → selectedRoom = "Deluxe Double"

2. Family Suite 클릭
   → Deluxe Double 회색으로 돌아옴
   → Family Suite 파란색
   → selectedRoom = "Family Suite"
```

#### 5-2. 날짜 선택
```
1. 체크인 필드 클릭
   → Popover 달력 오픈
   → 오늘 이전 날짜 비활성화 (disabled)

2. 내일 날짜 클릭
   → checkIn = new Date(tomorrow)
   → "2025년 10월 11일" 표시

3. 체크아웃 필드 클릭
   → Popover 달력 오픈
   → 체크인(내일) 이전 날짜 비활성화

4. 3일 후 클릭
   → checkOut = new Date(3일 후)
   → "2025년 10월 13일" 표시
```

#### 5-3. 인원 조정
```
1. '+' 버튼 클릭
   → guests: 2 → 3
   → "3명" 표시

2. '+' 버튼 10번 클릭
   → guests: 3 → 10 (max)
   → "10명" 표시
   → 더 이상 증가 안 됨

3. '-' 버튼 5번 클릭
   → guests: 10 → 5

4. '-' 버튼 10번 클릭
   → guests: 5 → 1 (min)
   → 더 이상 감소 안 됨
```

#### 5-4. 예약 버튼 테스트
```
시나리오 1: 객실 미선택
  - checkIn: O
  - checkOut: O
  - selectedRoom: X
  → "객실 타입을 선택해주세요" 토스트

시나리오 2: 날짜 미선택
  - checkIn: X
  - checkOut: X
  - selectedRoom: O
  → "체크인/체크아웃 날짜를 선택해주세요" 토스트

시나리오 3: 모두 선택
  - selectedRoom: "Family Suite"
  - checkIn: 2025-10-11
  - checkOut: 2025-10-13
  - guests: 2
  → "예약 페이지로 이동합니다..." 토스트
  → (추후 예약 페이지 구현 시 실제 이동)
```

---

## 🧪 테스트 4: 추가 상품 등록 (복수 호텔)

### 같은 방법으로 2개 더 등록

#### 호텔 2: 신안 리조트
```javascript
// PMS 모달에서 "테스트 데이터 사용" 대신
// 직접 입력해서 다른 호텔 등록

제목: 신안 리조트
카테고리: 숙박
위치: 전라남도 신안군 자은면
설명: 한적한 섬마을의 프라이빗 리조트
이미지: [Unsplash URL]
가격: 150000
하이라이트:
  - Ocean View Suite - 150,000원 (최대 2명)
  - Garden Villa - 200,000원 (최대 4명)
```

#### 호텔 3: 신안 게스트하우스
```javascript
제목: 신안 게스트하우스
카테고리: 숙박
위치: 전라남도 신안군 증도면
설명: 저렴하고 아늑한 게스트하우스
이미지: [Unsplash URL]
가격: 50000
하이라이트:
  - Dormitory - 50,000원 (최대 6명)
  - Private Room - 80,000원 (최대 2명)
```

### 카테고리 페이지에서 3개 확인
```
http://localhost:5173/category/accommodation
```

**기대 결과:**
```
총 3개 상품

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ 신안 비치 호텔      │  │ 신안 리조트        │  │ 신안 게스트하우스  │
│ ₩90,000~₩250,000  │  │ ₩150,000~₩200,000 │  │ ₩50,000~₩80,000   │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## 🧪 테스트 5: 필터 및 정렬

### 가격 필터
```
1. 가격 슬라이더: 0 ~ 100,000
   → 신안 게스트하우스만 표시

2. 가격 슬라이더: 100,000 ~ 300,000
   → 신안 비치 호텔, 신안 리조트 표시
```

### 정렬
```
1. 정렬: 가격 낮은순
   → 순서: 게스트하우스 → 비치 호텔 → 리조트

2. 정렬: 가격 높은순
   → 순서: 비치 호텔 → 리조트 → 게스트하우스

3. 정렬: 최신순
   → 등록 순서대로
```

---

## 🧪 테스트 6: DB 데이터 무결성 검증

### Foreign Key 확인
```javascript
// room_types의 listing_id가 실제 listings에 존재하는지
db.findAll('room_types').then(async (rooms) => {
  for (let room of rooms) {
    const listing = await db.findOne('listings', { id: room.listing_id });
    if (!listing) {
      console.error(`❌ Orphan room_type: ${room.id}, listing_id: ${room.listing_id}`);
    } else {
      console.log(`✅ room_type ${room.id} → listing "${listing.title}"`);
    }
  }
});
```

### 재고 날짜 범위 확인
```javascript
db.findAll('room_inventory').then(inventory => {
  const dates = inventory.map(i => i.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  console.log(`재고 날짜 범위: ${minDate} ~ ${maxDate}`);
  console.log(`총 ${dates.length}개 레코드`);

  // 30일인지 확인
  const daysDiff = (new Date(maxDate) - new Date(minDate)) / (1000 * 60 * 60 * 24);
  console.log(`날짜 차이: ${daysDiff}일`);
});
```

### 가격 일관성 확인
```javascript
// listings의 price_from/to와 room_types의 실제 가격 일치 확인
db.findAll('listings').then(async (listings) => {
  for (let listing of listings) {
    const ratePlans = await db.query(`
      SELECT rp.base_price
      FROM rate_plans rp
      JOIN room_types rt ON rp.room_type_id = rt.id
      WHERE rt.listing_id = ${listing.id}
    `);

    const prices = ratePlans.map(rp => rp.base_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (listing.price_from !== minPrice || listing.price_to !== maxPrice) {
      console.error(`❌ ${listing.title}: DB(${listing.price_from}~${listing.price_to}) vs 실제(${minPrice}~${maxPrice})`);
    } else {
      console.log(`✅ ${listing.title}: 가격 일치 (${minPrice}~${maxPrice})`);
    }
  }
});
```

---

## 🐛 트러블슈팅 (실제 DB 기준)

### 문제 1: "상품이 카테고리 페이지에 안 보여요"

#### 진단:
```javascript
// 1. DB에 데이터 있는지 확인
db.findAll('listings').then(r => console.log(`총 ${r.length}개 상품`));

// 2. 카테고리 필드 확인
db.findAll('listings').then(r => {
  r.forEach(item => {
    console.log(`${item.title}: category="${item.category}", category_id=${item.category_id}`);
  });
});

// 3. is_active, is_published 확인
db.findAll('listings').then(r => {
  r.forEach(item => {
    console.log(`${item.title}: active=${item.is_active}, published=${item.is_published}`);
  });
});
```

#### 해결:
```javascript
// is_published가 false인 경우 → true로 변경
db.update('listings', { id: 1 }, { is_published: true });
```

### 문제 2: "객실 타입이 안 보여요"

#### 진단:
```javascript
// highlights 데이터 확인
db.findOne('listings', { id: 1 }).then(listing => {
  console.log('Highlights:', listing.highlights);

  // 파싱 테스트
  const rooms = listing.highlights?.filter(h => h.includes('원'));
  console.log('파싱된 객실:', rooms);
});
```

#### 해결:
```javascript
// highlights 형식이 잘못된 경우
db.update('listings', { id: 1 }, {
  highlights: [
    "Deluxe Double - 120,000원 (최대 2명)",
    "Family Suite - 250,000원 (최대 4명)",
    "Standard Twin - 90,000원 (최대 2명)"
  ]
});
```

### 문제 3: "PMS 데이터가 DB에 안 들어가요"

#### 진단:
```javascript
// 각 테이블별로 확인
const tables = ['listings', 'pms_configs', 'room_types', 'room_media', 'rate_plans', 'room_inventory'];

for (let table of tables) {
  db.findAll(table).then(r => {
    console.log(`${table}: ${r.length}개 레코드`);
  });
}
```

#### 해결:
1. 콘솔 에러 메시지 확인
2. `saveProductToDB` 함수 호출 로그 확인
3. DB 제약조건 에러 확인 (Foreign key, Not null)

---

## ✅ 최종 검증 체크리스트

### DB 데이터
- [ ] listings 테이블: 3개 이상 호텔
- [ ] pms_configs 테이블: 각 호텔당 1개
- [ ] room_types 테이블: 호텔당 2~3개
- [ ] room_media 테이블: 각 객실당 1개 이상
- [ ] rate_plans 테이블: 각 객실당 1개
- [ ] room_inventory 테이블: 각 객실당 30일분

### UI 표시
- [ ] 카테고리 페이지: AccommodationCard 스타일
- [ ] 객실 타입 2개 표시
- [ ] 가격 범위 정확
- [ ] 상세 페이지: 3개 객실 선택 카드
- [ ] 예약 폼 동작

### 기능
- [ ] 객실 선택 (파란색 테두리)
- [ ] 날짜 선택 (달력)
- [ ] 인원 조정 (+/-)
- [ ] 유효성 검사 (토스트)
- [ ] 필터/정렬 동작

---

## 🎯 다음 단계 (실제 운영 준비)

### 1. 실제 PMS API 연동
- CloudBeds API Key 발급
- `utils/pms/connector.ts` 실제 API 호출
- Webhook 설정

### 2. 결제 연동
- PG사 선택 (토스페이먼츠, 아임포트 등)
- 예약 → 결제 플로우 구현
- 취소/환불 로직

### 3. 실시간 재고 관리
- Polling (5분마다 동기화)
- Webhook 이벤트 처리
- Cache TTL 설정

### 4. 보안
- API Key 암호화 (현재는 빈 문자열)
- HTTPS 필수
- CORS 설정

### 5. 성능
- 이미지 CDN
- DB 인덱스 최적화
- 서버 사이드 렌더링 (SSR)

---

## 📞 지원

문제 발생 시:
1. 브라우저 콘솔 에러 확인
2. Network 탭에서 API 요청/응답 확인
3. IndexedDB에서 실제 데이터 확인
4. 이 가이드의 트러블슈팅 섹션 참고

**IndexedDB 초기화가 필요한 경우:**
```javascript
forceReinitDB()
```

**모든 데이터 삭제 후 재시작:**
1. Application 탭 → IndexedDB → `travel_platform_db` 우클릭 → Delete database
2. 페이지 새로고침
3. `forceReinitDB()` 실행
