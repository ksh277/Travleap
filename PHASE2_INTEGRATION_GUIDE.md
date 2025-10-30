# Phase 2: 숙박 캘린더 재고 관리 - 통합 가이드

> **작성일**: 2025-10-31
> **상태**: ✅ 독립 개발 완료, 통합 대기 중
> **중요**: 기존 결제/예약 시스템 **전혀 수정하지 않음**

---

## 📋 목차

1. [완성된 파일 목록](#완성된-파일-목록)
2. [데이터베이스 스키마 실행 방법](#데이터베이스-스키마-실행-방법)
3. [기존 시스템에 통합하는 방법](#기존-시스템에-통합하는-방법)
4. [테스트 방법](#테스트-방법)
5. [주의사항](#주의사항)

---

## ✅ 완성된 파일 목록

### 1. 데이터베이스 스키마
- ✅ `database/add-accommodation-calendar-inventory.sql`
  - 새 테이블: `room_availability`, `pricing_rules`, `room_inventory_locks`
  - 기존 테이블 수정 없음

### 2. API 엔드포인트 (4개)
- ✅ `api/admin/accommodation/init-calendar.js` - 재고 초기화
- ✅ `api/accommodation/availability.js` - 예약 가능 여부 조회
- ✅ `api/accommodation/calendar/[roomId].js` - 월별 캘린더 데이터
- ✅ `api/admin/accommodation/inventory.js` - 관리자 재고 관리

### 3. 프론트엔드 컴포넌트 (2개)
- ✅ `components/accommodation/CalendarPicker.tsx` - 날짜 선택기
- ✅ `components/admin/AccommodationInventoryManager.tsx` - 재고 관리 대시보드

---

## 🗄️ 데이터베이스 스키마 실행 방법

### PlanetScale 콘솔에서 실행

1. **PlanetScale 대시보드** 접속
   ```
   https://app.planetscale.com
   ```

2. **Travleap 데이터베이스** 선택

3. **Branches > main > Console** 이동

4. **SQL 탭** 클릭

5. `database/add-accommodation-calendar-inventory.sql` 파일 내용 복사 후 실행

6. 실행 확인:
   ```sql
   SHOW TABLES LIKE 'room_%';
   SELECT COUNT(*) FROM room_availability;
   ```

### 테이블 구조 확인
```sql
DESCRIBE room_availability;
DESCRIBE pricing_rules;
DESCRIBE room_inventory_locks;
```

---

## 🔗 기존 시스템에 통합하는 방법

### ⚠️ 중요: 통합은 PG사 심사 완료 후 진행하세요!

---

### 통합 1: 숙박 상세 페이지에 캘린더 추가

**파일**: `components/pages/HotelDetailPage.tsx`

**위치**: 객실 정보 표시 부분

**방법**:

#### Step 1: Import 추가 (파일 상단)
```tsx
import CalendarPicker from '../accommodation/CalendarPicker';
```

#### Step 2: 캘린더 컴포넌트 추가

객실 예약 섹션에 캘린더 추가:

```tsx
{/* 기존 객실 정보 표시 */}
<div className="mt-6">
  <h3 className="text-xl font-semibold mb-4">날짜 선택</h3>
  <CalendarPicker
    roomId={room.id}
    onDateSelect={(checkin, checkout, totalPrice, nights) => {
      // 예약 데이터 설정
      setBookingData({
        room_id: room.id,
        checkin_date: format(checkin, 'yyyy-MM-dd'),
        checkout_date: format(checkout, 'yyyy-MM-dd'),
        total_price_krw: totalPrice,
        nights: nights
      });
      // 예약 폼으로 이동 또는 모달 오픈
    }}
    minStayNights={room.min_stay_nights || 1}
  />
</div>
```

---

### 통합 2: 관리자 페이지에 재고 관리 탭 추가

**파일**: `components/admin/AccommodationManagement.tsx`

**위치**: 기존 탭 목록에 "재고 관리" 탭 추가

**방법**:

#### Step 1: Import 추가 (파일 상단)
```tsx
import AccommodationInventoryManager from './AccommodationInventoryManager';
```

#### Step 2: TabsList에 탭 추가

현재 코드:
```tsx
<TabsList className="grid grid-cols-3 w-full max-w-3xl">
  <TabsTrigger value="partners">업체 관리</TabsTrigger>
  <TabsTrigger value="rooms">객실 관리</TabsTrigger>
  <TabsTrigger value="bookings">예약 관리</TabsTrigger>
</TabsList>
```

수정 후:
```tsx
<TabsList className="grid grid-cols-4 w-full max-w-4xl">
  <TabsTrigger value="partners">업체 관리</TabsTrigger>
  <TabsTrigger value="rooms">객실 관리</TabsTrigger>
  <TabsTrigger value="bookings">예약 관리</TabsTrigger>
  <TabsTrigger value="inventory">재고 관리</TabsTrigger>
</TabsList>
```

**변경 사항**:
- `grid-cols-3` → `grid-cols-4`
- `max-w-3xl` → `max-w-4xl`
- 새 탭 추가: `<TabsTrigger value="inventory">재고 관리</TabsTrigger>`

#### Step 3: TabsContent 추가

기존 TabsContent 아래에 추가:
```tsx
{/* 기존 partners, rooms, bookings TabsContent */}

<TabsContent value="inventory">
  <AccommodationInventoryManager />
</TabsContent>
```

---

### 통합 3: 예약 생성 시 재고 차감 로직 추가

**파일**: `api/accommodation/book.js` (또는 숙박 예약 API)

**방법**:

#### 예약 생성 전 재고 확인
```javascript
// 기존 예약 생성 로직 위에 추가

// 1. 예약 가능 여부 확인
const availCheck = await connection.execute(
  `SELECT date, available_rooms
   FROM room_availability
   WHERE room_id = ?
     AND date >= ?
     AND date < ?
     AND is_available = TRUE`,
  [room_id, checkin_date, checkout_date]
);

const dates = availCheck.rows || [];
const nights = /* 숙박일수 계산 */;

if (dates.length !== nights) {
  return res.status(400).json({
    success: false,
    error: '선택한 기간의 재고 정보가 없습니다.'
  });
}

// 재고 부족 확인
const hasNoStock = dates.some(d => d.available_rooms < 1);
if (hasNoStock) {
  return res.status(409).json({
    success: false,
    error: '선택하신 기간에 예약 가능한 객실이 없습니다.'
  });
}

// 2. 예약 생성
const bookingResult = await connection.execute(
  `INSERT INTO bookings (...)
   VALUES (...)`,
  [...]
);

// 3. 재고 차감
for (const dateData of dates) {
  await connection.execute(
    `UPDATE room_availability
     SET available_rooms = available_rooms - 1,
         booked_rooms = booked_rooms + 1,
         updated_at = NOW()
     WHERE room_id = ?
       AND date = ?`,
    [room_id, dateData.date]
  );
}
```

#### 예약 취소 시 재고 복구
```javascript
// 예약 취소 API

// 취소된 예약의 날짜 범위 가져오기
const booking = await connection.execute(
  `SELECT room_id, checkin_date, checkout_date
   FROM bookings
   WHERE id = ?`,
  [booking_id]
);

// 재고 복구
await connection.execute(
  `UPDATE room_availability
   SET available_rooms = available_rooms + 1,
       booked_rooms = booked_rooms - 1,
       updated_at = NOW()
   WHERE room_id = ?
     AND date >= ?
     AND date < ?`,
  [booking.room_id, booking.checkin_date, booking.checkout_date]
);
```

---

## 🧪 테스트 방법

### 1. 데이터베이스 테스트
```sql
-- 테이블 존재 확인
SHOW TABLES LIKE 'room_%';

-- 테이블 구조 확인
DESCRIBE room_availability;

-- 외래키 제약 조건 확인
SHOW CREATE TABLE room_availability;
```

### 2. API 테스트 (Postman/Thunder Client)

#### 재고 초기화
```http
POST /api/admin/accommodation/init-calendar
Content-Type: application/json

{
  "room_id": 1,
  "start_date": "2025-11-01",
  "end_date": "2025-11-30",
  "total_rooms": 10,
  "base_price_krw": 100000
}
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "room_id": 1,
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "total_days": 30,
    "inserted": 30,
    "skipped": 0
  },
  "message": "캘린더가 초기화되었습니다. (30일 생성)"
}
```

#### 예약 가능 여부 조회
```http
GET /api/accommodation/availability?room_id=1&checkin_date=2025-11-01&checkout_date=2025-11-03
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "room": {
      "id": 1,
      "name": "디럭스 트윈",
      "type": "deluxe",
      "max_occupancy": 2
    },
    "availability": {
      "is_available": true,
      "unavailable_reason": null,
      "available_rooms": 10,
      "nights": 2,
      "total_price_krw": 200000,
      "average_price_per_night_krw": 100000
    },
    "dates": [
      {
        "date": "2025-11-01",
        "available_rooms": 10,
        "price_krw": 100000,
        "is_special": false,
        "is_holiday": false,
        "is_weekend": false
      },
      {
        "date": "2025-11-02",
        "available_rooms": 10,
        "price_krw": 100000,
        "is_special": false,
        "is_holiday": false,
        "is_weekend": false
      }
    ]
  }
}
```

#### 월별 캘린더 조회
```http
GET /api/accommodation/calendar/1?year=2025&month=11
```

#### 관리자 재고 관리
```http
GET /api/admin/accommodation/inventory?room_id=1&start_date=2025-11-01&end_date=2025-11-30

PATCH /api/admin/accommodation/inventory
Content-Type: application/json

{
  "room_id": 1,
  "start_date": "2025-11-15",
  "end_date": "2025-11-17",
  "updates": {
    "special_price_krw": 80000
  }
}
```

#### 판매 중지
```http
POST /api/admin/accommodation/inventory
Content-Type: application/json

{
  "room_id": 1,
  "start_date": "2025-11-20",
  "end_date": "2025-11-22",
  "action": "close",
  "close_out_reason": "객실 수리 공사"
}
```

### 3. 프론트엔드 테스트

#### 캘린더 선택기 테스트
1. 숙박 상세 페이지 접속
2. 캘린더에서 체크인 날짜 선택
3. 체크아웃 날짜 선택 (최소 1박)
4. 총 금액 계산 확인
5. "예약 진행" 버튼 클릭

#### 관리자 재고 관리 테스트
1. 관리자로 로그인
2. 숙박 관리 > 재고 관리 탭 클릭
3. "재고 초기화" 버튼으로 1년치 재고 생성
4. 월별 재고 현황 확인
5. "일괄 수정"으로 특정 기간 가격 변경
6. "판매 관리"로 특정 기간 판매 중지

---

## ⚠️ 주의사항

### 1. PG사 심사 중에는 통합하지 마세요!

**현재 상태**:
- ✅ 모든 파일 독립적으로 완성
- ❌ 기존 시스템에 연결 안됨

**통합 시기**:
- PG사 심사 **완료 후**
- 결제 시스템 **안정화 후**

### 2. 재고 초기화 필수

**통합 전 반드시 수행**:
1. 관리자 페이지에서 각 객실별로 재고 초기화
2. 최소 1년치 재고 생성 권장
3. 기본 가격 설정

**초기화 없이는**:
- 캘린더에 데이터 없음
- 예약 불가능

### 3. 기존 예약 시스템과의 연동

**중요**: 기존에 `bookings` 테이블을 사용 중이라면:
- 예약 생성 시 `room_availability` 재고 차감 로직 추가 필수
- 예약 취소 시 재고 복구 로직 추가 필수
- 그렇지 않으면 **재고가 차감되지 않아 이중 예약 발생**

### 4. 의존성 패키지 확인

사용된 패키지:
- `react-day-picker` - 캘린더 UI (이미 설치되어 있어야 함)
- `date-fns` - 날짜 계산
- `lucide-react` - 아이콘

설치 확인:
```bash
npm list react-day-picker date-fns lucide-react
```

### 5. 성능 고려사항

**대량의 재고 데이터**:
- `room_availability` 테이블은 (객실 수 × 365일) 만큼 증가
- 객실 100개 × 1년 = 36,500 rows
- 인덱스가 중요: `UNIQUE KEY unique_room_date (room_id, date)`

**쿼리 최적화**:
```sql
-- 느린 쿼리 (인덱스 미사용)
SELECT * FROM room_availability WHERE date BETWEEN '2025-11-01' AND '2025-11-30';

-- 빠른 쿼리 (인덱스 사용)
SELECT * FROM room_availability
WHERE room_id = 1 AND date BETWEEN '2025-11-01' AND '2025-11-30';
```

---

## 📊 Phase 2 완료 체크리스트

### 개발 완료
- [x] DB 스키마 생성
- [x] API 4개 생성
- [x] 프론트엔드 컴포넌트 2개 생성
- [x] 통합 가이드 문서 작성

### 통합 대기 (PG사 심사 후)
- [ ] 데이터베이스 스키마 실행
- [ ] 숙박 상세 페이지에 캘린더 추가
- [ ] 관리자 페이지에 재고 관리 탭 추가
- [ ] 모든 객실 재고 초기화 (1년치)
- [ ] 예약 생성/취소 API에 재고 로직 추가
- [ ] API 테스트
- [ ] E2E 테스트
- [ ] 프로덕션 배포

---

## 🎯 통합 후 사용자 시나리오

### 사용자
1. 숙박 상세 페이지 접속
2. 캘린더에서 체크인/체크아웃 날짜 선택
3. 총 금액 확인 (동적 가격 계산)
4. "예약 진행" 버튼 클릭
5. 예약 정보 입력 후 결제
6. 예약 완료 시 재고 자동 차감

### 업체 (선택사항)
1. 업체 페이지 로그인
2. 내 객실 재고 현황 확인
3. 특정 기간 가격 조정
4. 수리/청소 기간 판매 중지

### 관리자
1. 관리자 페이지 > 숙박 관리 > 재고 관리
2. 새 객실 등록 시 재고 초기화 (1년치)
3. 월별 재고 현황 모니터링
4. 성수기 기간 가격 일괄 인상 (예: 7-8월 +30%)
5. 특정 기간 특가 설정 (예: 비수기 -20%)
6. 유지보수 기간 판매 중지

---

## 📝 다음 단계: Phase 3

Phase 2 통합 완료 후:
- **Phase 3: 여행 - 전체 시스템 구축** 시작
- `DEVELOPMENT_ROADMAP.md` 참고

---

**작성자**: Claude
**최종 업데이트**: 2025-10-31
**버전**: 1.0
**상태**: 독립 개발 완료, 통합 대기 중
