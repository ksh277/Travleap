# 🚗 렌트카 재고 관리 시스템 개선 방안

## 📋 현재 문제점

### 업체 요구사항
- **차종별 재고 관리**: "소나타" 10대처럼 **종류로** 차량을 등록하고 싶음
- **날짜별 가용 수량**: 날짜가 지나면 재고가 자동으로 다시 돌아와야 함
- **간편한 관리**: 차량마다 개별 등록하기 번거로움

### 현재 시스템 상태
**데이터베이스**: ✅ **이미 완벽하게 설계되어 있음**
```sql
-- rentcar_availability_rules 테이블 (database/rentcar-system-upgrade.sql:434)
CREATE TABLE rentcar_availability_rules (
    vehicle_id BIGINT,           -- 차종 ID
    location_id BIGINT,          -- 지점 ID
    valid_from DATE,             -- 기간 시작
    valid_to DATE,               -- 기간 끝

    -- 📦 재고 관리
    total_quantity INT,          -- 총 보유 대수 (예: 10대)
    available_quantity INT,      -- 예약 가능 대수 (예: 8대)
    reserved_quantity INT,       -- 예약된 대수 (예: 2대)

    is_blackout BOOLEAN,         -- 예약 불가 기간
    ...
);
```

**API 구현**: ❌ **구현되지 않음**
```javascript
// pages/api/rentcar/bookings.js:99
// TODO: 차량 가용성 체크 (rentcar_availability_rules, rentcar_bookings 테이블)
// 현재는 간단하게 활성화된 차량이면 예약 가능하다고 가정
```

---

## 🎯 해결 방안

### 방식 1: 차종 풀 방식 (업체 요구사항 ✅)

#### 개념
- **차종을 하나만 등록** (예: "소나타")
- **수량을 설정** (예: 10대)
- **날짜별 재고 관리**

#### 예시
```
차종: 소나타 (vehicle_id = 123)
총 보유: 10대
지점: 제주공항 (location_id = 1)

┌─────────────┬────────┬─────────┬──────────┐
│   날짜      │ 총대수 │ 예약됨  │ 가용대수 │
├─────────────┼────────┼─────────┼──────────┤
│ 2025-11-05  │   10   │   2     │    8     │
│ 2025-11-06  │   10   │   3     │    7     │
│ 2025-11-07  │   10   │   3     │    7     │ <- 11/5 예약 2대 반납됨
│ 2025-11-08  │   10   │   1     │    9     │ <- 11/6 예약 3대 중 2대 반납됨
└─────────────┴────────┴─────────┴──────────┘
```

#### 장점
- ✅ 관리 간편 (차종만 등록, 수량만 입력)
- ✅ 날짜 지나면 자동으로 재고 복구
- ✅ 업체 요구사항과 정확히 일치
- ✅ 숙박 시스템 (accommodation_calendar_inventory)과 동일한 방식

#### 단점
- ❌ 개별 차량 추적 불가 (차량 번호, 주행거리 등)
- ❌ 차량별 사고 이력 관리 어려움

---

### 방식 2: 하이브리드 방식 (현재 시스템 유지 + 재고 관리)

#### 개념
- **개별 차량도 등록 가능** (예: 소나타 12가3456)
- **차종 풀도 사용 가능** (예: 소나타 일반 10대)
- **차량 타입 구분**: `inventory_managed` 플래그

#### 차량 등록 예시
```sql
-- 개별 차량 (고급 차량, 특수 차량)
INSERT INTO rentcar_vehicles (
    vehicle_name,
    vehicle_number,
    inventory_managed
) VALUES
('포르쉐 911', '12가3456', FALSE),  -- 개별 관리
('벤츠 S클래스', '34나5678', FALSE); -- 개별 관리

-- 차종 풀 (일반 차량)
INSERT INTO rentcar_vehicles (
    vehicle_name,
    inventory_managed
) VALUES
('소나타', TRUE),     -- 재고 관리 (수량: availability_rules에서)
('K5', TRUE),         -- 재고 관리
('아반떼', TRUE);     -- 재고 관리
```

#### 예약 로직
```javascript
if (vehicle.inventory_managed) {
    // 방식 1: 재고 체크
    const available = await checkAvailabilityRules(vehicle_id, pickup_date, dropoff_date);
    if (available.available_quantity < 1) {
        throw new Error('예약 가능한 차량이 없습니다');
    }
    // 재고 차감
    await decrementAvailability(vehicle_id, pickup_date, dropoff_date, 1);
} else {
    // 방식 2: 개별 차량 중복 예약 체크
    const isBooked = await checkVehicleBooking(vehicle_id, pickup_date, dropoff_date);
    if (isBooked) {
        throw new Error('해당 차량은 이미 예약되었습니다');
    }
}
```

#### 장점
- ✅ 유연성: 업체가 방식 선택 가능
- ✅ 고급 차량은 개별 관리, 일반 차량은 재고 관리
- ✅ 기존 데이터 호환

#### 단점
- ⚠️ 구현 복잡도 증가
- ⚠️ UI에서 차량 타입 구분 필요

---

## 🚀 권장 해결책

### **방식 1 채택** (차종 풀 방식)

**이유**:
1. 업체 요구사항과 정확히 일치
2. 숙박 시스템 (accommodation_calendar_inventory)과 동일한 패턴
3. 구현 난이도 낮음
4. 대부분의 렌트카 업체가 원하는 방식

**구현 순서**:

### Phase 1: 재고 관리 API 구현 (1일)

#### 1.1 가용성 체크 함수
```javascript
// utils/rentcar-inventory.js
async function checkAvailability(connection, vehicle_id, location_id, pickup_date, dropoff_date) {
    // 1. 해당 기간의 availability_rules 조회
    const query = `
        SELECT
            ar.available_quantity,
            ar.reserved_quantity,
            ar.is_blackout
        FROM rentcar_availability_rules ar
        WHERE ar.vehicle_id = ?
          AND ar.location_id = ?
          AND ar.valid_from <= ?
          AND ar.valid_to >= ?
          AND ar.is_blackout = FALSE
        ORDER BY ar.valid_from
        LIMIT 1
    `;

    const result = await connection.execute(query, [
        vehicle_id,
        location_id,
        pickup_date,
        dropoff_date
    ]);

    if (!result.rows || result.rows.length === 0) {
        return { available: false, reason: '해당 기간에 예약 가능한 차량이 없습니다' };
    }

    const availability = result.rows[0];

    if (availability.available_quantity < 1) {
        return { available: false, reason: '예약 가능한 차량이 모두 소진되었습니다' };
    }

    return {
        available: true,
        available_quantity: availability.available_quantity,
        total_quantity: availability.available_quantity + availability.reserved_quantity
    };
}
```

#### 1.2 재고 차감 함수 (예약 생성 시)
```javascript
async function decrementAvailability(connection, vehicle_id, location_id, pickup_date, dropoff_date, quantity = 1) {
    // 트랜잭션 내에서 실행되어야 함 (FOR UPDATE 락)
    const query = `
        UPDATE rentcar_availability_rules
        SET
            available_quantity = available_quantity - ?,
            reserved_quantity = reserved_quantity + ?
        WHERE vehicle_id = ?
          AND location_id = ?
          AND valid_from <= ?
          AND valid_to >= ?
          AND available_quantity >= ?
    `;

    const result = await connection.execute(query, [
        quantity,
        quantity,
        vehicle_id,
        location_id,
        pickup_date,
        dropoff_date,
        quantity  // 재고 부족 시 UPDATE 0건
    ]);

    if (result.rowsAffected === 0) {
        throw new Error('재고 부족: 예약 가능한 차량이 없습니다');
    }
}
```

#### 1.3 재고 복구 함수 (예약 취소 / 반납 시)
```javascript
async function incrementAvailability(connection, vehicle_id, location_id, pickup_date, dropoff_date, quantity = 1) {
    const query = `
        UPDATE rentcar_availability_rules
        SET
            available_quantity = available_quantity + ?,
            reserved_quantity = reserved_quantity - ?
        WHERE vehicle_id = ?
          AND location_id = ?
          AND valid_from <= ?
          AND valid_to >= ?
    `;

    await connection.execute(query, [
        quantity,
        quantity,
        vehicle_id,
        location_id,
        pickup_date,
        dropoff_date
    ]);
}
```

---

### Phase 2: 예약 API 수정 (0.5일)

#### pages/api/rentcar/bookings.js 수정
```javascript
// 99번째 줄 TODO 제거하고 실제 구현

const { checkAvailability, decrementAvailability } = require('../../../utils/rentcar-inventory');

// 트랜잭션 내에서 (이미 있음)
try {
    // 차량 정보 조회 (기존 코드)
    const vehicleResult = await connection.execute(vehicleQuery, [vehicle_id]);
    const vehicle = vehicleResult.rows[0];

    // ✅ 재고 체크 추가
    const availability = await checkAvailability(
        connection,
        vehicle_id,
        pickup_location_id,
        pickup_datetime.split('T')[0],  // 날짜만 추출
        dropoff_datetime.split('T')[0]
    );

    if (!availability.available) {
        await connection.execute('ROLLBACK');
        return res.status(400).json({
            success: false,
            error: availability.reason
        });
    }

    // 가격 계산... (기존 코드)

    // 예약 생성... (기존 코드)

    // ✅ 재고 차감 추가
    await decrementAvailability(
        connection,
        vehicle_id,
        pickup_location_id,
        pickup_datetime.split('T')[0],
        dropoff_datetime.split('T')[0],
        1  // 1대
    );

    await connection.execute('COMMIT');

} catch (error) {
    await connection.execute('ROLLBACK');
    throw error;
}
```

---

### Phase 3: 취소/환불 API 수정 (0.5일)

#### 예약 취소 시 재고 복구
```javascript
// pages/api/rentcar/bookings/[id]/cancel.js (생성 필요)

const { incrementAvailability } = require('../../../../utils/rentcar-inventory');

async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;  // 예약 ID

    const connection = connect({ url: process.env.DATABASE_URL });
    await connection.execute('START TRANSACTION');

    try {
        // 예약 정보 조회
        const booking = await connection.execute(
            'SELECT * FROM rentcar_bookings WHERE id = ? FOR UPDATE',
            [id]
        );

        if (booking.rows[0].status === 'cancelled') {
            throw new Error('이미 취소된 예약입니다');
        }

        // 예약 상태 변경
        await connection.execute(
            'UPDATE rentcar_bookings SET status = ?, cancelled_at = NOW() WHERE id = ?',
            ['cancelled', id]
        );

        // ✅ 재고 복구
        await incrementAvailability(
            connection,
            booking.rows[0].vehicle_id,
            booking.rows[0].pickup_location_id,
            booking.rows[0].pickup_date,
            booking.rows[0].dropoff_date,
            1
        );

        await connection.execute('COMMIT');

        return res.status(200).json({ success: true });

    } catch (error) {
        await connection.execute('ROLLBACK');
        return res.status(500).json({ error: error.message });
    }
}
```

---

### Phase 4: 벤더 대시보드 - 재고 설정 UI (1일)

#### 재고 관리 탭 추가
```javascript
// components/RentcarVendorDashboard.tsx

const [inventoryTab, setInventoryTab] = useState('calendar');

// 재고 캘린더 UI
<div className="inventory-calendar">
    <h3>차량 재고 관리</h3>

    {/* 차종 선택 */}
    <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
        <option value="">차종 선택</option>
        <option value="1">소나타 (10대)</option>
        <option value="2">K5 (8대)</option>
    </select>

    {/* 캘린더 그리드 */}
    <div className="calendar-grid">
        {dates.map(date => (
            <div key={date} className="date-cell">
                <div className="date">{date}</div>
                <div className="total">총: 10대</div>
                <div className="available">가용: 7대</div>
                <div className="reserved">예약: 3대</div>
                <button onClick={() => openEditModal(date)}>수정</button>
            </div>
        ))}
    </div>

    {/* 재고 수정 모달 */}
    <Modal open={editModalOpen}>
        <h4>{selectedDate} 재고 설정</h4>
        <label>
            총 보유 대수:
            <input type="number" value={totalQuantity} onChange={...} />
        </label>
        <label>
            예약 가능 대수:
            <input type="number" value={availableQuantity} onChange={...} />
        </label>
        <label>
            <input type="checkbox" checked={isBlackout} onChange={...} />
            예약 불가 기간 (정비, 휴무 등)
        </label>
        <button onClick={saveInventory}>저장</button>
    </Modal>
</div>
```

#### API 엔드포인트
```javascript
// pages/api/vendor/rentcar/inventory.js

POST /api/vendor/rentcar/inventory
{
    "vehicle_id": 1,
    "location_id": 1,
    "valid_from": "2025-11-05",
    "valid_to": "2025-12-31",
    "total_quantity": 10,
    "available_quantity": 10,  // 초기값 = total_quantity
    "is_blackout": false
}

// INSERT or UPDATE INTO rentcar_availability_rules
```

---

## 📊 구현 일정

| Phase | 작업 내용 | 소요 시간 | 담당 |
|-------|----------|----------|------|
| Phase 1 | 재고 관리 유틸 함수 | 1일 | Backend |
| Phase 2 | 예약 API 수정 | 0.5일 | Backend |
| Phase 3 | 취소/환불 API 수정 | 0.5일 | Backend |
| Phase 4 | 벤더 대시보드 UI | 1일 | Frontend |
| **합계** | | **3일** | |

---

## 🧪 테스트 시나리오

### 시나리오 1: 정상 예약
1. 소나타 10대 등록 (11/5~11/30 기간)
2. 11/10~11/15 예약 2대 생성
3. ✅ available_quantity: 10 → 8
4. ✅ reserved_quantity: 0 → 2

### 시나리오 2: 재고 부족
1. 소나타 10대 중 9대 예약됨 (available: 1)
2. 2대 예약 시도
3. ❌ "예약 가능한 차량이 모두 소진되었습니다" 에러

### 시나리오 3: 날짜별 재고 차이
1. 소나타 10대
2. 11/5~11/7 예약 3대
3. 11/8~11/10 조회 → available: 10 (11/7 반납으로 복구)

### 시나리오 4: 예약 취소
1. 소나타 10대 중 5대 예약 (available: 5)
2. 2대 취소
3. ✅ available_quantity: 5 → 7
4. ✅ reserved_quantity: 5 → 3

---

## 🎯 최종 결론

### 권장 방식: **차종 풀 방식 (방식 1)**

**근거**:
1. ✅ 업체 요구사항과 100% 일치
2. ✅ 데이터베이스 스키마 이미 완성
3. ✅ 숙박 시스템과 동일한 검증된 패턴
4. ✅ 구현 난이도 낮음 (3일)
5. ✅ 유지보수 간편

**차량 개별 관리가 필요한 경우**:
- 고급 차량 (벤츠, 포르쉐 등)
- 특수 차량 (캠핑카, 전기차 등)
→ 나중에 하이브리드 방식으로 확장 가능

---

**작성일**: 2025-11-05
**검토 필요**: 렌트카 벤더 피드백 확인 후 최종 결정
