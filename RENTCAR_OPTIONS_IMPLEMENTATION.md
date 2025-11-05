# 🚗 렌트카 옵션 시스템 구현 가이드

## 📋 요구사항 분석

### 사용자 요구사항
1. **벤더 대시보드**: 옵션 관리 탭 추가
   - 업체가 옵션 등록 (GPS, 차일드시트, 보험 등)
   - 각 차량에 어떤 옵션 제공할지 설정

2. **차량 상세페이지**: 옵션 선택 UI
   - 사용자가 옵션 선택 가능
   - 선택한 옵션 가격이 총 금액에 추가
   - 선택하지 않아도 예약 가능

3. **결제**: 옵션 포함 결제
   - 옵션 가격 합산
   - 예약 정보에 옵션 저장

---

## ✅ 이미 완료된 것

### 데이터베이스 스키마 (rentcar-system-upgrade.sql)
```sql
CREATE TABLE rentcar_extras (
    id BIGINT PRIMARY KEY,
    vendor_id BIGINT,              -- 업체 ID

    -- 옵션 정보
    extra_code VARCHAR(50),        -- 옵션 코드 (GPS, CHILD_SEAT)
    name VARCHAR(200),             -- 옵션 이름 (GPS 내비게이션)
    description TEXT,              -- 상세 설명
    category ENUM(                 -- 카테고리
        'equipment',               -- 장비 (GPS, 블랙박스)
        'service',                 -- 서비스 (픽업/드롭오프)
        'driver',                  -- 운전자 (추가 운전자)
        'insurance',               -- 보험 (자차, 대물)
        'misc'                     -- 기타
    ),

    -- 가격
    price_type ENUM(               -- 가격 타입
        'per_day',                 -- 일당
        'per_rental',              -- 예약당
        'per_hour',                -- 시간당
        'per_item'                 -- 개당
    ),
    price_krw INT,                 -- 가격

    -- 수량 제한
    max_quantity INT DEFAULT 1,     -- 최대 주문 수량
    max_per_booking INT DEFAULT 1,  -- 예약당 최대 수량

    -- 재고 관리
    has_inventory BOOLEAN,          -- 재고 관리 여부
    current_stock INT,              -- 현재 재고

    -- 상태
    is_active BOOLEAN,              -- 활성화 여부
    is_popular BOOLEAN,             -- 인기 옵션 여부

    -- 이미지
    image_url VARCHAR(500)          -- 옵션 이미지
);
```

### 예약 테이블 (rentcar_bookings)
```sql
extras JSON COMMENT '선택 옵션 [{extra_id, quantity, price}]',
extras_price_krw INT DEFAULT 0,
```

---

## 🚀 구현 계획

### Phase 1: 벤더 대시보드 - 옵션 관리 (1.5일)

#### 1.1 API 생성
**파일**: `pages/api/vendor/rentcar/extras.js`

```javascript
const { connect } = require('@planetscale/database');
const { withSecureCors } = require('../../../../utils/cors-middleware');
const { withAuth } = require('../../../../utils/auth-middleware');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });
  const vendorId = req.user.vendorId; // JWT에서 추출

  // GET: 옵션 목록 조회
  if (req.method === 'GET') {
    const result = await connection.execute(`
      SELECT * FROM rentcar_extras
      WHERE vendor_id = ?
      ORDER BY category, display_order, name
    `, [vendorId]);

    return res.status(200).json({
      success: true,
      extras: result.rows || []
    });
  }

  // POST: 옵션 등록
  if (req.method === 'POST') {
    const {
      extra_code,
      name,
      description,
      category,
      price_type,
      price_krw,
      max_quantity,
      has_inventory,
      current_stock,
      image_url
    } = req.body;

    // 필수 검증
    if (!extra_code || !name || !price_krw || !category || !price_type) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      });
    }

    const result = await connection.execute(`
      INSERT INTO rentcar_extras (
        vendor_id, extra_code, name, description, category,
        price_type, price_krw, max_quantity,
        has_inventory, current_stock, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      vendorId, extra_code, name, description, category,
      price_type, price_krw, max_quantity || 1,
      has_inventory || false, current_stock || 0, image_url
    ]);

    return res.status(201).json({
      success: true,
      extra_id: result.insertId
    });
  }

  // PUT: 옵션 수정
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;

    const result = await connection.execute(`
      UPDATE rentcar_extras
      SET name = ?, description = ?, category = ?,
          price_type = ?, price_krw = ?, max_quantity = ?,
          has_inventory = ?, current_stock = ?, image_url = ?,
          is_active = ?
      WHERE id = ? AND vendor_id = ?
    `, [
      updates.name, updates.description, updates.category,
      updates.price_type, updates.price_krw, updates.max_quantity,
      updates.has_inventory, updates.current_stock, updates.image_url,
      updates.is_active,
      id, vendorId
    ]);

    return res.status(200).json({ success: true });
  }

  // DELETE: 옵션 삭제
  if (req.method === 'DELETE') {
    const { id } = req.query;

    await connection.execute(`
      DELETE FROM rentcar_extras
      WHERE id = ? AND vendor_id = ?
    `, [id, vendorId]);

    return res.status(200).json({ success: true });
  }
}

module.exports = withSecureCors(
  withAuth(handler, { requireAuth: true })
);
```

#### 1.2 벤더 대시보드 UI
**파일**: `components/RentcarVendorDashboard.tsx`

```tsx
// TabType에 'extras' 추가
type TabType = 'voucher' | 'check-in' | 'check-out' | 'today' | 'refunds' | 'blocks' | 'extras';

// State 추가
const [extras, setExtras] = useState([]);
const [extraForm, setExtraForm] = useState({
  extra_code: '',
  name: '',
  description: '',
  category: 'equipment',
  price_type: 'per_day',
  price_krw: 0,
  max_quantity: 1,
  has_inventory: false,
  current_stock: 0,
  image_url: ''
});

// 옵션 목록 조회
const fetchExtras = async () => {
  const response = await fetch('/api/vendor/rentcar/extras', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });
  const data = await response.json();
  if (data.success) {
    setExtras(data.extras);
  }
};

// 옵션 등록
const handleCreateExtra = async () => {
  const response = await fetch('/api/vendor/rentcar/extras', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(extraForm)
  });

  if (response.ok) {
    toast.success('옵션이 등록되었습니다.');
    fetchExtras();
    // 폼 초기화
  }
};

// JSX 추가
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    {/* 기존 탭들... */}
    <TabsTrigger value="extras">옵션 관리</TabsTrigger>
  </TabsList>

  <TabsContent value="extras">
    <Card>
      <CardHeader>
        <CardTitle>추가 옵션 관리</CardTitle>
        <CardDescription>
          차량 대여 시 제공할 추가 옵션을 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 옵션 등록 폼 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label>옵션 코드</Label>
            <Input
              placeholder="GPS"
              value={extraForm.extra_code}
              onChange={(e) => setExtraForm({...extraForm, extra_code: e.target.value})}
            />
          </div>
          <div>
            <Label>옵션 이름</Label>
            <Input
              placeholder="GPS 내비게이션"
              value={extraForm.name}
              onChange={(e) => setExtraForm({...extraForm, name: e.target.value})}
            />
          </div>
          <div>
            <Label>카테고리</Label>
            <Select
              value={extraForm.category}
              onValueChange={(value) => setExtraForm({...extraForm, category: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipment">장비</SelectItem>
                <SelectItem value="service">서비스</SelectItem>
                <SelectItem value="driver">운전자</SelectItem>
                <SelectItem value="insurance">보험</SelectItem>
                <SelectItem value="misc">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>가격 타입</Label>
            <Select
              value={extraForm.price_type}
              onValueChange={(value) => setExtraForm({...extraForm, price_type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_day">일당</SelectItem>
                <SelectItem value="per_rental">예약당</SelectItem>
                <SelectItem value="per_hour">시간당</SelectItem>
                <SelectItem value="per_item">개당</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>가격 (원)</Label>
            <Input
              type="number"
              value={extraForm.price_krw}
              onChange={(e) => setExtraForm({...extraForm, price_krw: parseInt(e.target.value)})}
            />
          </div>
          <div>
            <Label>최대 수량</Label>
            <Input
              type="number"
              value={extraForm.max_quantity}
              onChange={(e) => setExtraForm({...extraForm, max_quantity: parseInt(e.target.value)})}
            />
          </div>
          <div className="col-span-2">
            <Label>설명</Label>
            <Textarea
              value={extraForm.description}
              onChange={(e) => setExtraForm({...extraForm, description: e.target.value})}
            />
          </div>
          <div className="col-span-2">
            <Button onClick={handleCreateExtra}>
              옵션 등록
            </Button>
          </div>
        </div>

        {/* 옵션 목록 */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>타입</TableHead>
              <TableHead>최대수량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {extras.map(extra => (
              <TableRow key={extra.id}>
                <TableCell>{extra.name}</TableCell>
                <TableCell>
                  <Badge>{
                    extra.category === 'equipment' ? '장비' :
                    extra.category === 'service' ? '서비스' :
                    extra.category === 'insurance' ? '보험' :
                    extra.category
                  }</Badge>
                </TableCell>
                <TableCell>{extra.price_krw.toLocaleString()}원</TableCell>
                <TableCell>
                  {extra.price_type === 'per_day' ? '일당' :
                   extra.price_type === 'per_rental' ? '예약당' :
                   extra.price_type === 'per_hour' ? '시간당' : '개당'}
                </TableCell>
                <TableCell>{extra.max_quantity}</TableCell>
                <TableCell>
                  <Badge variant={extra.is_active ? 'default' : 'secondary'}>
                    {extra.is_active ? '활성' : '비활성'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => handleEditExtra(extra)}>
                    수정
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteExtra(extra.id)}>
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

### Phase 2: 차량별 옵션 조회 API (0.5일)

**파일**: `pages/api/rentcar/vehicles/[id]/extras.js`

```javascript
// GET: 특정 차량에 제공 가능한 옵션 목록
async function handler(req, res) {
  const { id } = req.query; // vehicle_id
  const connection = connect({ url: process.env.DATABASE_URL });

  // 차량의 vendor_id 조회
  const vehicleResult = await connection.execute(`
    SELECT vendor_id FROM rentcar_vehicles WHERE id = ?
  `, [id]);

  if (!vehicleResult.rows || vehicleResult.rows.length === 0) {
    return res.status(404).json({ success: false, error: '차량을 찾을 수 없습니다.' });
  }

  const vendorId = vehicleResult.rows[0].vendor_id;

  // 해당 업체의 활성화된 옵션 조회
  const extrasResult = await connection.execute(`
    SELECT * FROM rentcar_extras
    WHERE vendor_id = ? AND is_active = 1
    ORDER BY is_popular DESC, category, display_order, name
  `, [vendorId]);

  return res.status(200).json({
    success: true,
    extras: extrasResult.rows || []
  });
}
```

---

### Phase 3: 차량 상세페이지 - 옵션 선택 UI (1일)

**파일**: `components/pages/RentcarVehicleDetailPage.tsx`

```tsx
// State 추가
const [availableExtras, setAvailableExtras] = useState([]);
const [selectedExtras, setSelectedExtras] = useState([]); // [{extra_id, quantity, price}]
const [totalExtrasPrice, setTotalExtrasPrice] = useState(0);

// 옵션 목록 조회
useEffect(() => {
  const fetchExtras = async () => {
    const response = await fetch(`/api/rentcar/vehicles/${vehicleId}/extras`);
    const data = await response.json();
    if (data.success) {
      setAvailableExtras(data.extras);
    }
  };
  fetchExtras();
}, [vehicleId]);

// 옵션 선택/해제
const handleExtraToggle = (extra, quantity = 1) => {
  const existing = selectedExtras.find(e => e.extra_id === extra.id);

  if (existing) {
    // 이미 선택됨 → 제거
    setSelectedExtras(selectedExtras.filter(e => e.extra_id !== extra.id));
  } else {
    // 새로 선택 → 추가
    setSelectedExtras([...selectedExtras, {
      extra_id: extra.id,
      quantity: quantity,
      price: extra.price_krw,
      name: extra.name,
      price_type: extra.price_type
    }]);
  }
};

// 총 옵션 가격 계산
useEffect(() => {
  const rentalDays = calculateDays(pickupDate, dropoffDate);

  let total = 0;
  selectedExtras.forEach(extra => {
    if (extra.price_type === 'per_day') {
      total += extra.price * extra.quantity * rentalDays;
    } else if (extra.price_type === 'per_rental') {
      total += extra.price * extra.quantity;
    }
  });

  setTotalExtrasPrice(total);
}, [selectedExtras, pickupDate, dropoffDate]);

// JSX 추가
<div className="mt-6">
  <h3 className="text-lg font-semibold mb-4">추가 옵션</h3>

  {availableExtras.length === 0 ? (
    <p className="text-gray-500">제공 가능한 옵션이 없습니다.</p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {availableExtras.map(extra => {
        const isSelected = selectedExtras.some(e => e.extra_id === extra.id);

        return (
          <div
            key={extra.id}
            className={`border rounded-lg p-4 cursor-pointer ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => handleExtraToggle(extra)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">{extra.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{extra.description}</p>
                <div className="mt-2">
                  <Badge variant="secondary">{
                    extra.category === 'equipment' ? '장비' :
                    extra.category === 'service' ? '서비스' :
                    extra.category === 'insurance' ? '보험' :
                    extra.category
                  }</Badge>
                </div>
              </div>
              <div className="ml-4 text-right">
                <p className="font-semibold text-blue-600">
                  {extra.price_krw.toLocaleString()}원
                </p>
                <p className="text-xs text-gray-500">
                  {extra.price_type === 'per_day' ? '/ 일' :
                   extra.price_type === 'per_rental' ? '/ 예약' :
                   extra.price_type === 'per_hour' ? '/ 시간' : '/ 개'}
                </p>
              </div>
            </div>

            {isSelected && (
              <div className="mt-3 pt-3 border-t">
                <Label>수량</Label>
                <Input
                  type="number"
                  min="1"
                  max={extra.max_quantity}
                  value={selectedExtras.find(e => e.extra_id === extra.id)?.quantity || 1}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value);
                    setSelectedExtras(selectedExtras.map(e =>
                      e.extra_id === extra.id ? {...e, quantity: newQuantity} : e
                    ));
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>

{/* 가격 요약에 옵션 추가 */}
<div className="mt-6 bg-gray-50 rounded-lg p-4">
  <h4 className="font-semibold mb-3">가격 요약</h4>
  <div className="space-y-2">
    <div className="flex justify-between">
      <span>차량 대여료</span>
      <span>{basePrice.toLocaleString()}원</span>
    </div>

    {selectedExtras.length > 0 && (
      <>
        <div className="border-t pt-2">
          <p className="text-sm font-medium mb-2">추가 옵션:</p>
          {selectedExtras.map(extra => (
            <div key={extra.extra_id} className="flex justify-between text-sm text-gray-600">
              <span>{extra.name} x {extra.quantity}</span>
              <span>
                {(extra.price * extra.quantity * (extra.price_type === 'per_day' ? rentalDays : 1)).toLocaleString()}원
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          <span>옵션 합계</span>
          <span>{totalExtrasPrice.toLocaleString()}원</span>
        </div>
      </>
    )}

    <div className="border-t pt-2 flex justify-between font-bold text-lg">
      <span>총 금액</span>
      <span className="text-blue-600">
        {(basePrice + totalExtrasPrice).toLocaleString()}원
      </span>
    </div>
  </div>
</div>
```

---

### Phase 4: 예약 API 수정 (0.5일)

**파일**: `pages/api/rentcar/bookings.js`

```javascript
// POST 요청 body에 extras 추가
const {
  selected_extras = [] // [{extra_id, quantity}]
} = req.body;

// 옵션 가격 계산
let extrasFee = 0;
let extrasDetails = [];

if (selected_extras.length > 0) {
  const extraIds = selected_extras.map(e => e.extra_id);

  const extrasQuery = `
    SELECT id, name, price_krw, price_type, max_quantity
    FROM rentcar_extras
    WHERE id IN (${extraIds.map(() => '?').join(',')})
      AND is_active = 1
  `;

  const extrasResult = await connection.execute(extrasQuery, extraIds);

  if (extrasResult.rows && extrasResult.rows.length > 0) {
    extrasResult.rows.forEach(extra => {
      const selectedExtra = selected_extras.find(e => e.extra_id === extra.id);
      const quantity = Math.min(selectedExtra.quantity, extra.max_quantity);

      let extraCost = 0;
      if (extra.price_type === 'per_day') {
        extraCost = extra.price_krw * quantity * totalDays;
      } else if (extra.price_type === 'per_rental') {
        extraCost = extra.price_krw * quantity;
      }

      extrasFee += extraCost;
      extrasDetails.push({
        extra_id: extra.id,
        name: extra.name,
        quantity: quantity,
        price: extra.price_krw,
        price_type: extra.price_type,
        total_cost: extraCost
      });
    });
  }
}

// 서버 계산 총 금액에 옵션 추가
const serverCalculatedTotal = basePrice + insuranceFee + extrasFee;

// 예약 생성 시 extras 저장
await connection.execute(`
  INSERT INTO rentcar_bookings (
    ...,
    extras,
    extras_price_krw,
    ...
  ) VALUES (?, ?, ...)
`, [
  ...,
  JSON.stringify(extrasDetails),
  extrasFee,
  ...
]);
```

---

## 📊 작업 일정

| Phase | 작업 내용 | 소요 시간 |
|-------|----------|----------|
| Phase 1 | 벤더 대시보드 - 옵션 관리 탭 | 1.5일 |
| Phase 2 | 차량별 옵션 조회 API | 0.5일 |
| Phase 3 | 차량 상세페이지 - 옵션 선택 UI | 1일 |
| Phase 4 | 예약 API 수정 | 0.5일 |
| **합계** | | **3.5일** |

---

## 🧪 테스트 시나리오

### 시나리오 1: 옵션 등록
1. 벤더 로그인
2. 옵션 관리 탭 이동
3. GPS 옵션 등록 (일당 10,000원)
4. ✅ rentcar_extras 테이블에 저장

### 시나리오 2: 옵션 선택 예약
1. 사용자가 차량 상세페이지 접속
2. GPS 옵션 선택 (3일 대여)
3. 가격 계산: 차량비 150,000 + GPS 30,000 = 180,000원
4. 예약 생성
5. ✅ rentcar_bookings.extras에 JSON 저장
6. ✅ rentcar_bookings.extras_price_krw = 30,000

### 시나리오 3: 옵션 없이 예약
1. 사용자가 옵션 선택하지 않음
2. 예약 생성
3. ✅ extras = [], extras_price_krw = 0

---

## 💡 옵션 예시

### 장비 (equipment)
- GPS 내비게이션 (10,000원/일)
- 블랙박스 (5,000원/일)
- 차량용 Wi-Fi (15,000원/일)
- 스노우체인 (예약당 10,000원)

### 서비스 (service)
- 공항 픽업 서비스 (예약당 30,000원)
- 호텔 배달 서비스 (예약당 20,000원)

### 운전자 (driver)
- 추가 운전자 등록 (예약당 10,000원)
- 25세 미만 운전자 (일당 10,000원)

### 보험 (insurance)
- 자차 보험 (일당 15,000원)
- 대물 보험 (일당 10,000원)
- 완전 무사고 보험 (일당 20,000원)

### 기타 (misc)
- 차일드 시트 (일당 5,000원)
- 유아용 카시트 (일당 5,000원)

---

## ✅ 완료 체크리스트

### 백엔드
- [ ] 벤더 옵션 관리 API (`/api/vendor/rentcar/extras`)
- [ ] 차량별 옵션 조회 API (`/api/rentcar/vehicles/[id]/extras`)
- [ ] 예약 API에 옵션 포함 로직 추가

### 프론트엔드
- [ ] 벤더 대시보드 - 옵션 관리 탭 UI
- [ ] 차량 상세페이지 - 옵션 선택 UI
- [ ] 가격 요약에 옵션 포함 표시

### 데이터베이스
- [x] rentcar_extras 테이블 (이미 존재)
- [x] rentcar_bookings.extras 필드 (이미 존재)

---

**작성일**: 2025-11-05
**예상 완료일**: 2025-11-09 (3.5일)
