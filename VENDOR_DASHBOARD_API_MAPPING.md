# VendorDashboardPageEnhanced DB → API 완벽 매핑

## 📊 현재 상태 분석

**파일:** `components/VendorDashboardPageEnhanced.tsx`
**총 DB 호출 수:** 18개
**변경해야 할 함수:** 6개

---

## 🔍 함수별 DB 호출 상세 분석

### 1. `loadVendorData()` - 라인 178-254
**역할:** 페이지 로드 시 업체 정보, 차량 목록, 예약 목록, 매출 통계 조회

#### 현재 DB 호출:
```typescript
// Line 184: 업체 정보 조회
const vendorResult = await db.query(`
  SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1
`, [user.id]);

// Line 197: 차량 목록 조회
const vehiclesResult = await db.query(`
  SELECT * FROM rentcar_vehicles
  WHERE vendor_id = ?
  ORDER BY created_at DESC
`, [vendor.id]);

// Line 205: 예약 목록 조회
const bookingsResult = await db.query(`
  SELECT
    b.id,
    b.listing_id as vehicle_id,
    l.title as vehicle_name,
    JSON_UNQUOTE(JSON_EXTRACT(b.customer_info, '$.name')) as customer_name,
    JSON_UNQUOTE(JSON_EXTRACT(b.customer_info, '$.phone')) as customer_phone,
    b.start_date as pickup_date,
    b.end_date as dropoff_date,
    b.total_amount,
    b.status,
    b.created_at
  FROM bookings b
  INNER JOIN listings l ON b.listing_id = l.id
  WHERE l.partner_id = ?
    AND l.category_id = (SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1)
  ORDER BY b.created_at DESC
  LIMIT 50
`, [vendor.id]);

// Line 228: 매출 통계 조회
const revenueResult = await db.query(`
  SELECT
    DATE(b.created_at) as date,
    SUM(b.total_amount) as revenue
  FROM bookings b
  INNER JOIN listings l ON b.listing_id = l.id
  WHERE l.partner_id = ?
    AND l.category_id = (SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1)
    AND b.status IN ('confirmed', 'completed')
    AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  GROUP BY DATE(b.created_at)
  ORDER BY date ASC
`, [vendor.id]);
```

#### 변경 후 API 호출:
```typescript
// API 1: 업체 정보
const vendorResponse = await fetch(`/api/vendor/info?userId=${user.id}`);
const vendorData = await vendorResponse.json();
const vendor = vendorData.data;

// API 2: 차량 목록
const vehiclesResponse = await fetch(`/api/vendor/vehicles?userId=${user.id}`);
const vehiclesData = await vehiclesResponse.json();
const vehicles = vehiclesData.data;

// API 3: 예약 목록
const bookingsResponse = await fetch(`/api/vendor/bookings?userId=${user.id}`);
const bookingsData = await bookingsResponse.json();
const bookings = bookingsData.data;

// API 4: 매출 통계
const revenueResponse = await fetch(`/api/vendor/revenue?userId=${user.id}`);
const revenueData = await revenueResponse.json();
const revenue = revenueData.data;
```

**검증 포인트:**
- ✅ user.id가 정확히 전달되는가?
- ✅ API 응답의 data 속성을 정확히 추출하는가?
- ✅ 에러 핸들링이 동일하게 작동하는가?
- ✅ 로딩 상태가 제대로 설정되는가?

---

### 2. `handleSaveVehicle()` - 라인 355-510
**역할:** 차량 등록/수정 (신규 등록과 수정을 모두 처리)

#### 현재 DB 호출 (수정 모드):
```typescript
// Line 374: rentcar_vehicles 업데이트
await db.execute(`
  UPDATE rentcar_vehicles
  SET display_name = ?, vehicle_class = ?, seating_capacity = ?,
      transmission_type = ?, fuel_type = ?, daily_rate_krw = ?,
      weekly_rate_krw = ?, monthly_rate_krw = ?, mileage_limit_km = ?,
      excess_mileage_fee_krw = ?, is_available = ?, images = ?,
      insurance_included = ?, insurance_options = ?, available_options = ?,
      pickup_location = ?, dropoff_location = ?, min_rental_days = ?,
      max_rental_days = ?, instant_booking = ?,
      updated_at = NOW()
  WHERE id = ? AND vendor_id = ?
`, [...params]);

// Line 411: category_id 조회
const categoryResult = await db.query(`SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`);

// Line 414: listings 업데이트
await db.execute(`
  UPDATE listings
  SET title = ?, short_description = ?, description_md = ?,
      price_from = ?, price_to = ?, max_capacity = ?,
      images = ?, is_published = ?, updated_at = NOW()
  WHERE partner_id = ? AND category_id = ?
    AND title = (SELECT display_name FROM rentcar_vehicles WHERE id = ?)
`, [...params]);
```

#### 현재 DB 호출 (등록 모드):
```typescript
// Line 444: rentcar_vehicles 삽입
await db.execute(`
  INSERT INTO rentcar_vehicles (...)
  VALUES (...)
`, [...params]);

// Line 478: category_id 조회
const categoryResult = await db.query(`SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`);

// Line 481: listings 삽입
await db.execute(`
  INSERT INTO listings (...)
  VALUES (...)
`, [...params]);
```

#### 변경 후 API 호출:
```typescript
// 수정 모드
if (isEditingVehicle && editingVehicleId) {
  const response = await fetch(`/api/vendor/vehicles/${editingVehicleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id.toString()
    },
    body: JSON.stringify({
      userId: user.id,
      display_name: vehicleForm.display_name,
      vehicle_class: vehicleForm.vehicle_class,
      seating_capacity: vehicleForm.seating_capacity,
      transmission_type: vehicleForm.transmission_type,
      fuel_type: vehicleForm.fuel_type,
      daily_rate_krw: vehicleForm.daily_rate_krw,
      weekly_rate_krw: vehicleForm.weekly_rate_krw,
      monthly_rate_krw: vehicleForm.monthly_rate_krw,
      mileage_limit_km: vehicleForm.mileage_limit_km,
      excess_mileage_fee_krw: vehicleForm.excess_mileage_fee_krw,
      is_available: vehicleForm.is_available,
      image_urls: vehicleForm.image_urls,
      insurance_included: vehicleForm.insurance_included,
      insurance_options: vehicleForm.insurance_options,
      available_options: vehicleForm.available_options,
      pickup_location: vehicleForm.pickup_location,
      dropoff_location: vehicleForm.dropoff_location,
      min_rental_days: vehicleForm.min_rental_days,
      max_rental_days: vehicleForm.max_rental_days,
      instant_booking: vehicleForm.instant_booking
    })
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message);
  }
} else {
  // 등록 모드
  const response = await fetch('/api/vendor/vehicles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id.toString()
    },
    body: JSON.stringify({
      userId: user.id,
      // ... 동일한 필드들
    })
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message);
  }
}
```

**검증 포인트:**
- ✅ isEditingVehicle 상태에 따라 POST/PUT이 올바르게 선택되는가?
- ✅ 모든 필드가 빠짐없이 전달되는가?
- ✅ user.id가 헤더와 body 모두에 전달되는가?
- ✅ 성공 후 toast 메시지가 표시되는가?
- ✅ loadVendorData()가 호출되어 목록이 갱신되는가?

---

### 3. `handleDeleteVehicle()` - 라인 512-535
**역할:** 차량 삭제 (rentcar_vehicles + listings 양쪽 삭제)

#### 현재 DB 호출:
```typescript
// Line 518: rentcar_vehicles 삭제
await db.execute(`
  DELETE FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?
`, [vehicleId, vendorInfo?.id]);

// Line 523: listings 삭제
await db.execute(`
  DELETE FROM listings
  WHERE partner_id = ? AND title = ? AND category_id = (SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1)
`, [vendorInfo?.id, vehicleInfo.display_name]);
```

#### 변경 후 API 호출:
```typescript
const response = await fetch(`/api/vendor/vehicles/${vehicleId}?userId=${user.id}`, {
  method: 'DELETE'
});

const result = await response.json();
if (!result.success) {
  throw new Error(result.message);
}
```

**검증 포인트:**
- ✅ vehicleId가 올바르게 전달되는가?
- ✅ user.id가 query parameter로 전달되는가?
- ✅ confirm 대화상자가 표시되는가?
- ✅ 삭제 후 목록이 갱신되는가?

---

### 4. `toggleVehicleAvailability()` - 라인 537-559
**역할:** 차량 예약 가능/불가 상태 토글

#### 현재 DB 호출:
```typescript
// Line 539: rentcar_vehicles 업데이트
await db.execute(`
  UPDATE rentcar_vehicles
  SET is_available = ?, updated_at = NOW()
  WHERE id = ? AND vendor_id = ?
`, [currentStatus ? 0 : 1, vehicleId, vendorInfo?.id]);

// Line 546: listings 업데이트
await db.execute(`
  UPDATE listings l
  INNER JOIN rentcar_vehicles rv ON l.title = rv.display_name
  SET l.is_published = ?
  WHERE rv.id = ? AND l.partner_id = ?
`, [currentStatus ? 0 : 1, vehicleId, vendorInfo?.id]);
```

#### 변경 후 API 호출:
```typescript
const response = await fetch(`/api/vendor/vehicles/${vehicleId}/availability`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': user.id.toString()
  },
  body: JSON.stringify({
    userId: user.id,
    is_available: !currentStatus
  })
});

const result = await response.json();
if (!result.success) {
  throw new Error(result.message);
}
```

**검증 포인트:**
- ✅ currentStatus가 올바르게 반전되는가 (!currentStatus)?
- ✅ Switch 컴포넌트가 즉시 반영되는가?
- ✅ toast 메시지가 상태에 맞게 표시되는가?

---

### 5. `handleCSVUpload()` - 라인 562-677
**역할:** CSV 파일로 차량 대량 등록

#### 현재 DB 호출 (각 차량마다 2개씩):
```typescript
// Line 613: rentcar_vehicles 삽입
await db.execute(`
  INSERT INTO rentcar_vehicles (...)
  VALUES (...)
`, [...params]);

// Line 636: category_id 조회
const categoryResult = await db.query(`SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`);

// Line 639: listings 삽입
await db.execute(`
  INSERT INTO listings (...)
  VALUES (...)
`, [...params]);
```

#### 변경 후 API 호출:
```typescript
// 각 차량마다 POST API 호출
for (const line of dataLines) {
  const values = line.split(',');

  const vehicleData = {
    display_name: values[0] || '',
    vehicle_class: values[4] || '중형',
    seating_capacity: parseInt(values[5]) || 5,
    transmission_type: values[6] || '자동',
    fuel_type: values[7] || '가솔린',
    daily_rate_krw: parseInt(values[8]) || 50000,
    weekly_rate_krw: parseInt(values[9]) || 300000,
    monthly_rate_krw: parseInt(values[10]) || 1000000,
    mileage_limit_km: parseInt(values[11]) || 200,
    excess_mileage_fee_krw: parseInt(values[12]) || 100
  };

  if (!vehicleData.display_name.trim()) {
    errorCount++;
    continue;
  }

  try {
    const response = await fetch('/api/vendor/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id.toString()
      },
      body: JSON.stringify({
        userId: user.id,
        ...vehicleData,
        is_available: true,
        image_urls: [],
        insurance_included: true,
        insurance_options: '자차보험, 대인배상, 대물배상',
        available_options: 'GPS, 블랙박스',
        pickup_location: '신안군 렌트카 본점',
        dropoff_location: '신안군 렌트카 본점',
        min_rental_days: 1,
        max_rental_days: 30,
        instant_booking: true
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    successCount++;
  } catch (err) {
    console.error('차량 등록 실패:', err);
    errorCount++;
  }
}
```

**검증 포인트:**
- ✅ CSV 파싱이 정확한가?
- ✅ 각 차량이 순차적으로 등록되는가?
- ✅ successCount와 errorCount가 정확한가?
- ✅ 최종 toast 메시지가 표시되는가?
- ✅ file input이 초기화되는가?

---

### 6. `handleSaveInfo()` - 라인 763-796
**역할:** 업체 정보 수정

#### 현재 DB 호출:
```typescript
// Line 767: rentcar_vendors 업데이트
await db.execute(`
  UPDATE rentcar_vendors
  SET name = ?, contact_person = ?, contact_email = ?, contact_phone = ?, address = ?
  WHERE id = ?
`, [
  editedInfo.name,
  editedInfo.contact_person,
  editedInfo.contact_email,
  editedInfo.contact_phone,
  editedInfo.address,
  vendorInfo.id
]);
```

#### 변경 후 API 호출:
```typescript
const response = await fetch(`/api/vendors/${vendorInfo.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': user.id.toString()
  },
  body: JSON.stringify({
    userId: user.id,
    business_name: editedInfo.name,
    contact_person: editedInfo.contact_person,
    contact_email: editedInfo.contact_email,
    contact_phone: editedInfo.contact_phone,
    address: editedInfo.address
  })
});

const result = await response.json();
if (!result.success) {
  throw new Error(result.message);
}
```

**검증 포인트:**
- ✅ vendorInfo.id가 올바르게 전달되는가?
- ✅ 필드명이 API와 일치하는가 (name → business_name)?
- ✅ 업데이트 후 vendorInfo 상태가 갱신되는가?
- ✅ isEditingInfo 상태가 false로 변경되는가?

---

## 🔄 변경 전후 비교

### Before (직접 DB 호출):
```typescript
import { db } from '../utils/database-cloud';  // ❌ 위험!

const data = await db.query('SELECT ...', [params]);  // ❌ 브라우저에서 작동 안 함
```

### After (API 호출):
```typescript
// ✅ database-cloud import 제거

const response = await fetch('/api/vendor/vehicles');  // ✅ 안전
const data = await response.json();  // ✅ 작동함
```

---

## ✅ 최종 검증 체크리스트

### 코드 레벨:
- [ ] `import { db } from '../utils/database-cloud'` 라인 삭제
- [ ] 모든 `db.query()` 호출을 `fetch()` API 호출로 변경
- [ ] 모든 `db.execute()` 호출을 `fetch()` API 호출로 변경
- [ ] user.id가 모든 API 호출에 포함되는지 확인
- [ ] API 응답의 `.data` 속성을 정확히 추출하는지 확인
- [ ] 에러 핸들링이 모든 fetch에 있는지 확인

### 기능 레벨:
- [ ] 페이지 로드 시 데이터가 표시되는가?
- [ ] 차량 등록이 작동하는가?
- [ ] 차량 수정이 작동하는가?
- [ ] 차량 삭제가 작동하는가?
- [ ] 예약 가능/불가 토글이 작동하는가?
- [ ] CSV 업로드가 작동하는가?
- [ ] 업체 정보 수정이 작동하는가?
- [ ] 예약 목록이 표시되는가?
- [ ] 매출 차트가 표시되는가?

### UI/UX 레벨:
- [ ] 로딩 스피너가 표시되는가?
- [ ] 성공 toast 메시지가 표시되는가?
- [ ] 에러 toast 메시지가 표시되는가?
- [ ] 폼이 초기화되는가?
- [ ] 목록이 자동 갱신되는가?

---

## 🚀 다음 단계

1. VendorDashboardPageEnhanced.tsx 수정 완료
2. 동일한 방식으로 나머지 10개 파일 수정
3. 전체 시스템 통합 테스트
4. 최종 검증 보고서 작성

---

**작성 일시:** 2025-10-16
**작성자:** Claude Code
**목적:** 완벽한 DB → API 마이그레이션을 위한 상세 가이드
