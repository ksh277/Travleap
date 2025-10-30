# Phase 1: 렌트카 사고 신고 시스템 - 통합 가이드

> **작성일**: 2025-10-31
> **상태**: ✅ 독립 개발 완료, 통합 대기 중
> **중요**: 기존 결제/예약 시스템 **전혀 수정하지 않음**

---

## 📋 목차

1. [완성된 파일 목록](#완성된-파일-목록)
2. [데이터베이스 스키마 실행 방법](#데이터베이스-스키마-실행-방법)
3. [기존 시스템에 통합하는 방법](#기존-시스템에-통합하는-방법)
4. [라우터 설정](#라우터-설정)
5. [테스트 방법](#테스트-방법)
6. [주의사항](#주의사항)

---

## ✅ 완성된 파일 목록

### 1. 데이터베이스 스키마
- ✅ `database/add-accident-report-system.sql`
  - 새 테이블: `accident_reports`
  - 기존 테이블 수정 없음

### 2. API 엔드포인트 (4개)
- ✅ `api/rentcar/accident/report.js` - 사고 신고 접수
- ✅ `api/rentcar/accident/[reportId].js` - 사고 조회/수정
- ✅ `api/rentcar/accident/list.js` - 사고 목록
- ✅ `api/admin/rentcar/accidents.js` - 관리자 사고 관리

### 3. 프론트엔드 컴포넌트 (4개)
- ✅ `components/rentcar/AccidentReportButton.tsx` - 긴급 신고 버튼
- ✅ `components/rentcar/AccidentReportForm.tsx` - 사고 신고 폼
- ✅ `components/rentcar/AccidentReportDetail.tsx` - 사고 상세 페이지
- ✅ `components/admin/AccidentManagement.tsx` - 관리자 대시보드

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

5. `database/add-accident-report-system.sql` 파일 내용 복사 후 실행

6. 실행 확인:
   ```sql
   SHOW TABLES LIKE 'accident_reports';
   SELECT COUNT(*) FROM accident_reports;
   ```

### 테이블 구조 확인
```sql
DESCRIBE accident_reports;
```

---

## 🔗 기존 시스템에 통합하는 방법

### ⚠️ 중요: 통합은 PG사 심사 완료 후 진행하세요!

---

### 통합 1: 예약 페이지에 사고 신고 버튼 추가

**파일**: `components/RentcarBookingsPage.tsx`

**위치**: "이용 중" 상태의 예약 카드에 버튼 추가

**방법**:

#### Step 1: Import 추가 (파일 상단)
```tsx
// 기존 import 아래에 추가
import AccidentReportButton from './rentcar/AccidentReportButton';
```

#### Step 2: 예약 카드 내부에 버튼 추가

현재 `RentcarBookingsPage.tsx`의 예약 카드 JSX를 찾아서:

```tsx
{/* 기존 코드 */}
{booking.status === 'picked_up' && (
  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-green-800 font-medium">차량 이용 중입니다</p>

    {/* 여기에 추가! */}
    <div className="mt-3">
      <AccidentReportButton
        bookingId={booking.id}
        vehicleId={booking.vehicle.id}
        vendorId={booking.vendor.id}
        userId={user?.id || 0}
        bookingNumber={booking.booking_number}
        vehicleName={booking.vehicle.display_name}
      />
    </div>
  </div>
)}
```

**정확한 위치**:
- `status === 'picked_up'` (이용 중) 상태 카드
- 기존 "차량 이용 중입니다" 메시지 **아래**
- 반납 예정 시간 표시 **위**

---

### 통합 2: 관리자 페이지에 사고 관리 탭 추가

**파일**: `components/admin/RentcarManagement.tsx`

**위치**: 기존 탭 목록에 "사고 관리" 탭 추가

**방법**:

#### Step 1: Import 추가 (파일 상단)
```tsx
import AccidentManagement from './AccidentManagement';
```

#### Step 2: TabsList에 탭 추가

현재 코드:
```tsx
<TabsList className="grid grid-cols-3 w-full max-w-3xl">
  <TabsTrigger value="vendors">벤더 관리</TabsTrigger>
  <TabsTrigger value="vehicles">차량 관리</TabsTrigger>
  <TabsTrigger value="bookings">예약 관리</TabsTrigger>
</TabsList>
```

수정 후:
```tsx
<TabsList className="grid grid-cols-4 w-full max-w-4xl">
  <TabsTrigger value="vendors">벤더 관리</TabsTrigger>
  <TabsTrigger value="vehicles">차량 관리</TabsTrigger>
  <TabsTrigger value="bookings">예약 관리</TabsTrigger>
  <TabsTrigger value="accidents">사고 관리</TabsTrigger>
</TabsList>
```

**변경 사항**:
- `grid-cols-3` → `grid-cols-4`
- `max-w-3xl` → `max-w-4xl`
- 새 탭 추가: `<TabsTrigger value="accidents">사고 관리</TabsTrigger>`

#### Step 3: TabsContent 추가

기존 TabsContent 아래에 추가:
```tsx
{/* 기존 vendors, vehicles, bookings TabsContent */}

<TabsContent value="accidents">
  <AccidentManagement />
</TabsContent>
```

---

### 통합 3: 라우터에 사고 상세 페이지 등록

**파일**: `src/App.tsx` (또는 라우터 설정 파일)

**방법**:

#### Step 1: Import 추가
```tsx
import AccidentReportDetail from './components/rentcar/AccidentReportDetail';
```

#### Step 2: Route 추가

기존 렌트카 관련 라우트 근처에 추가:
```tsx
<Route path="/rentcar/accident/:reportId" element={<AccidentReportDetail />} />
```

**예시 (전체 컨텍스트)**:
```tsx
{/* 기존 렌트카 라우트 */}
<Route path="/rentcar/:id" element={<RentcarVehicleDetailPage />} />
<Route path="/rentcar/vendor/:vendorId" element={<RentcarVendorDetailPage />} />
<Route path="/rentcar/bookings" element={<RentcarBookingsPage />} />

{/* 새로 추가 */}
<Route path="/rentcar/accident/:reportId" element={<AccidentReportDetail />} />
```

---

### 통합 4: 마이페이지에 사고 신고 내역 표시 (선택사항)

**파일**: `components/MyPage.tsx`

**방법**:

#### Step 1: Import 추가
```tsx
import { AlertTriangle } from 'lucide-react';
```

#### Step 2: 사고 신고 내역 섹션 추가

기존 예약 내역 섹션 근처에:
```tsx
{/* 사고 신고 내역 */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      사고 신고 내역
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Button
      variant="outline"
      onClick={() => navigate('/rentcar/bookings')}
      className="w-full"
    >
      내 예약에서 사고 신고 확인
    </Button>
  </CardContent>
</Card>
```

---

## 🧪 테스트 방법

### 1. 데이터베이스 테스트
```sql
-- 테이블 존재 확인
SHOW TABLES LIKE 'accident_reports';

-- 테이블 구조 확인
DESCRIBE accident_reports;

-- 외래키 제약 조건 확인
SHOW CREATE TABLE accident_reports;
```

### 2. API 테스트 (Postman/Thunder Client)

#### 사고 신고 접수
```http
POST /api/rentcar/accident/report
Content-Type: application/json

{
  "booking_id": 1,
  "vehicle_id": 1,
  "vendor_id": 1,
  "user_id": 1,
  "accident_datetime": "2025-10-31T14:30:00",
  "accident_type": "collision",
  "severity": "minor",
  "description": "주차장에서 후진 중 기둥에 접촉했습니다.",
  "location_address": "서울시 강남구 테헤란로 123"
}
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_number": "ACC-20251031-A1B2",
    "status": "reported",
    "message": "사고 신고가 접수되었습니다."
  }
}
```

#### 사고 조회
```http
GET /api/rentcar/accident/1?user_id=1
```

#### 사고 목록
```http
GET /api/rentcar/accident/list?user_id=1
```

#### 관리자 사고 관리
```http
GET /api/admin/rentcar/accidents

PATCH /api/admin/rentcar/accidents/1
Content-Type: application/json

{
  "status": "investigating",
  "resolution_notes": "보험사에 통보 완료"
}
```

### 3. 프론트엔드 테스트

#### 사고 신고 버튼 테스트
1. 렌트카 예약 생성
2. 예약 상태를 `picked_up`으로 변경
3. 예약 목록에서 "긴급 사고 신고" 버튼 확인
4. 버튼 클릭 → 폼 오픈
5. 폼 작성 후 제출
6. 신고 상세 페이지로 이동 확인

#### 관리자 페이지 테스트
1. 관리자로 로그인
2. 렌트카 관리 > 사고 관리 탭 클릭
3. 사고 목록 표시 확인
4. 상세 보기 버튼 클릭
5. 상태 변경 버튼 클릭

---

## ⚠️ 주의사항

### 1. PG사 심사 중에는 통합하지 마세요!

**현재 상태**:
- ✅ 모든 파일 독립적으로 완성
- ❌ 기존 시스템에 연결 안됨

**통합 시기**:
- PG사 심사 **완료 후**
- 결제 시스템 **안정화 후**

### 2. 기존 파일 수정 최소화

**수정해야 할 파일 (통합 시)**:
1. `components/RentcarBookingsPage.tsx` - Import 1줄 + 버튼 추가
2. `components/admin/RentcarManagement.tsx` - Import 1줄 + 탭 추가
3. `src/App.tsx` - Import 1줄 + Route 1줄

**절대 수정하면 안되는 파일**:
- ❌ `api/payments/confirm.js`
- ❌ `api/orders.js`
- ❌ `utils/points-system.ts`
- ❌ 팝업 카테고리 관련 모든 파일

### 3. 환경 변수 확인

통합 전 확인사항:
```bash
# .env 파일에 DATABASE_URL 존재 확인
DATABASE_URL=mysql://...
```

### 4. 의존성 패키지 확인

사용된 패키지 (이미 설치되어 있어야 함):
- `react-router-dom` (라우팅)
- `lucide-react` (아이콘)
- `sonner` (토스트 알림)
- `date-fns` (날짜 포맷)
- `@planetscale/database` (DB 연결)

---

## 📊 Phase 1 완료 체크리스트

### 개발 완료
- [x] DB 스키마 생성
- [x] API 4개 생성
- [x] 프론트엔드 컴포넌트 4개 생성
- [x] 통합 가이드 문서 작성

### 통합 대기 (PG사 심사 후)
- [ ] 데이터베이스 스키마 실행
- [ ] 예약 페이지에 버튼 추가
- [ ] 관리자 페이지에 탭 추가
- [ ] 라우터 설정
- [ ] API 테스트
- [ ] E2E 테스트
- [ ] 프로덕션 배포

---

## 🎯 통합 후 사용자 시나리오

### 사용자
1. 렌트카 이용 중 사고 발생
2. "내 예약" 페이지 접속
3. "긴급 사고 신고" 버튼 클릭
4. 사고 정보 입력 (유형, 위치, 경위, 사진 등)
5. 신고 접수 완료
6. 신고번호 SMS 수신
7. 사고 신고 상세 페이지에서 진행 상황 확인

### 업체
1. 사고 알림 수신 (SMS/이메일)
2. 고객에게 연락
3. 현장 확인
4. 관리자에게 상황 보고

### 관리자
1. 관리자 페이지 > 렌트카 관리 > 사고 관리
2. 신규 사고 확인
3. 상태를 "조사 중"으로 변경
4. 보험사에 통보
5. 처리 내역 기록
6. 상태를 "처리 완료"로 변경

---

## 📝 다음 단계: Phase 2

Phase 1 통합 완료 후:
- **Phase 2: 숙박 - 캘린더 재고 관리** 시작
- `DEVELOPMENT_ROADMAP.md` 참고

---

**작성자**: Claude
**최종 업데이트**: 2025-10-31
**버전**: 1.0
**상태**: 독립 개발 완료, 통합 대기 중
