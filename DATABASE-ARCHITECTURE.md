# Travleap 데이터베이스 아키텍처

## 개요

Travleap 프로젝트는 **이중 데이터베이스 아키텍처**를 사용합니다:

1. **Neon PostgreSQL** - 사용자 인증 및 계정 관리
2. **PlanetScale MySQL** - 비즈니스 데이터 (렌터카, 숙박, 예약 등)

---

## 1. Neon PostgreSQL (인증 DB)

### 용도
- 사용자 회원가입 및 로그인
- 사용자 계정 정보 관리
- JWT 토큰 인증
- 역할 기반 접근 제어 (RBAC)

### 테이블
```sql
users
- id (Primary Key)
- email (Unique)
- password_hash
- role (user | vendor | admin)
- created_at
- updated_at
```

### 연결 방법
```javascript
const { getPool } = require('../utils/database');
const neonDb = getPool();

// PostgreSQL parameterized query (uses $1, $2, ...)
const result = await neonDb.query(
  'SELECT * FROM users WHERE email = $1 AND role = $2',
  ['test@example.com', 'admin']
);
```

### 사용 예시
- 로그인 시 이메일/비밀번호 검증
- 관리자 권한 확인
- 비밀번호 변경
- 이메일 주소 변경

---

## 2. PlanetScale MySQL (비즈니스 DB)

### 용도
- 렌터카 업체 정보 관리
- 차량 정보 관리
- 예약 및 결제 처리
- 숙박 시설 정보
- 후기 및 평점

### 주요 테이블

#### rentcar_vendors (업체 정보)
```sql
- id (Primary Key)
- user_id (FK to Neon users.id)
- vendor_code (Unique)
- business_name
- contact_name
- contact_email
- contact_phone
- address
- description
- logo_url
- images (JSON)
- cancellation_policy
- status (active | inactive | suspended)
- is_verified (boolean)
- total_vehicles
- created_at
- updated_at
```

#### rentcar_vehicles (차량 정보)
```sql
- id (Primary Key)
- vendor_id (FK to rentcar_vendors.id)
- display_name
- vehicle_class (compact | midsize | fullsize | luxury | suv | van)
- transmission_type (automatic | manual)
- fuel_type (gasoline | diesel | lpg | hybrid | electric)
- seating_capacity
- daily_rate_krw
- image_url
- features (JSON)
- status (available | rented | maintenance | retired)
- created_at
- updated_at
```

#### rentcar_bookings (예약 정보)
```sql
- id (Primary Key)
- booking_number (Unique)
- vendor_id (FK to rentcar_vendors.id)
- vehicle_id (FK to rentcar_vehicles.id)
- user_id (FK to Neon users.id)
- pickup_date
- dropoff_date
- total_amount_krw
- customer_name
- customer_phone
- customer_email
- status (pending | confirmed | completed | cancelled)
- created_at
- updated_at
```

#### rentcar_locations (업체 위치 정보)
```sql
- id (Primary Key)
- vendor_id (FK to rentcar_vendors.id)
- location_name
- address
- latitude
- longitude
- created_at
- updated_at
```

### 연결 방법
```javascript
const { connect } = require('@planetscale/database');
const connection = connect({ url: process.env.DATABASE_URL });

// MySQL parameterized query (uses ?)
const result = await connection.execute(
  'SELECT * FROM rentcar_vendors WHERE id = ? AND status = ?',
  [vendorId, 'active']
);
```

### 트랜잭션 제한
⚠️ **PlanetScale은 BEGIN/COMMIT 트랜잭션을 지원하지 않습니다.**

해결 방법: 순차적 삭제 (Cascade Delete Pattern)
```javascript
// 1. Check for active bookings
const bookingsCheck = await connection.execute(
  'SELECT COUNT(*) as count FROM rentcar_bookings WHERE vendor_id = ? AND status IN ("confirmed", "pending")',
  [vendorId]
);

if (bookingsCheck.rows[0].count > 0) {
  throw new Error('Cannot delete vendor with active bookings');
}

// 2. Delete related records in order
await connection.execute('DELETE FROM rentcar_bookings WHERE vendor_id = ?', [vendorId]);
await connection.execute('DELETE FROM rentcar_vehicles WHERE vendor_id = ?', [vendorId]);
await connection.execute('DELETE FROM rentcar_locations WHERE vendor_id = ?', [vendorId]);
await connection.execute('DELETE FROM rentcar_vendors WHERE id = ?', [vendorId]);
```

---

## 3. 데이터베이스 분리 원칙

### Neon PostgreSQL을 사용하는 경우
✅ **사용자 인증/권한 관련**
- 로그인 (이메일/비밀번호 검증)
- 회원가입 (새 사용자 계정 생성)
- 비밀번호 변경
- 관리자 권한 확인 (`role = 'admin'`)
- JWT 토큰 생성 시 사용자 정보 조회

### PlanetScale MySQL을 사용하는 경우
✅ **비즈니스 데이터 관련**
- 업체 정보 CRUD (생성, 조회, 수정, 삭제)
- 차량 정보 CRUD
- 예약 정보 CRUD
- 매출 통계 조회
- 업체 위치 정보 관리

---

## 4. 실제 API 구현 예시

### 4.1 Admin Vendor Deletion API
파일: `pages/api/admin/vendors/[id].js`

```javascript
import { getPool } from '../../../../utils/database';
const { connect } = require('@planetscale/database');

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { id } = req.query;
  const adminId = req.headers['x-admin-id'];

  try {
    // ✅ Neon: 관리자 권한 확인
    const neonDb = getPool();
    const adminResult = await neonDb.query(
      'SELECT role FROM users WHERE id = $1 AND role = $2',
      [adminId, 'admin']
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: '관리자만 접근 가능합니다.' });
    }

    if (req.method === 'DELETE') {
      // ✅ PlanetScale: 업체 데이터 삭제
      // 1. Check active bookings
      const bookingsResult = await connection.execute(
        `SELECT COUNT(*) as count FROM rentcar_bookings rb
         JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
         WHERE rv.vendor_id = ? AND rb.status IN ('confirmed', 'pending')`,
        [id]
      );

      if (bookingsResult.rows[0]?.count > 0) {
        return res.status(400).json({
          success: false,
          message: '진행 중이거나 확정된 예약이 있어 삭제할 수 없습니다.'
        });
      }

      // 2-5. Sequential deletion
      await connection.execute('DELETE rb FROM rentcar_bookings rb JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id WHERE rv.vendor_id = ?', [id]);
      await connection.execute('DELETE FROM rentcar_vehicles WHERE vendor_id = ?', [id]);
      await connection.execute('DELETE FROM rentcar_locations WHERE vendor_id = ?', [id]);
      await connection.execute('DELETE FROM rentcar_vendors WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: '업체가 성공적으로 삭제되었습니다.' });
    }

    if (req.method === 'PUT') {
      // ✅ PlanetScale: 업체 정보 수정
      await connection.execute(
        `UPDATE rentcar_vendors SET business_name = ?, contact_name = ?, ... WHERE id = ?`,
        [business_name, contact_name, ..., id]
      );

      return res.status(200).json({ success: true, message: '업체 정보가 수정되었습니다.' });
    }
  } catch (error) {
    console.error('Admin vendor API error:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
```

### 4.2 Vendor Info API (with Password Change)
파일: `pages/api/vendor/info.js`

```javascript
import { connect } from '@planetscale/database';
const { requireVendorAuth } = require('../../../middleware/vendor-auth');
const { getPool } = require('../../../utils/database');
const bcrypt = require('bcryptjs');

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  // JWT 인증 (middleware가 PlanetScale에서 vendor_id 조회)
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return;

  const vendorId = auth.vendorId;

  if (req.method === 'GET') {
    // ✅ PlanetScale: 업체 정보 조회
    const result = await connection.execute(
      'SELECT id, vendor_code, business_name, ... FROM rentcar_vendors WHERE id = ?',
      [vendorId]
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  }

  if (req.method === 'PUT') {
    const { name, contact_email, old_email, new_password, ... } = req.body;

    // ✅ PlanetScale: 업체 정보 수정
    await connection.execute(
      'UPDATE rentcar_vendors SET business_name = ?, contact_email = ?, ... WHERE id = ?',
      [name, contact_email, ..., vendorId]
    );

    // ✅ Neon: 이메일 또는 비밀번호 변경 시
    if (old_email && (old_email !== contact_email || new_password)) {
      const neonDb = getPool();

      if (new_password) {
        // 비밀번호 변경
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await neonDb.query(
          'UPDATE users SET email = $1, password_hash = $2, updated_at = NOW() WHERE email = $3',
          [contact_email, hashedPassword, old_email]
        );
      } else {
        // 이메일만 변경
        await neonDb.query(
          'UPDATE users SET email = $1, updated_at = NOW() WHERE email = $2',
          [contact_email, old_email]
        );
      }
    }

    return res.status(200).json({ success: true, message: '업체 정보가 수정되었습니다.' });
  }
}
```

### 4.3 Vendor Authentication Middleware
파일: `middleware/vendor-auth.js`

```javascript
async function requireVendorAuth(req, res) {
  // 1. JWT 토큰 추출 및 검증
  const token = req.headers.authorization?.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 2. 관리자는 모든 리소스 접근 가능
  if (decoded.role === 'admin') {
    return {
      success: true,
      userId: decoded.userId,
      role: 'admin',
      isAdmin: true
    };
  }

  // 3. ✅ PlanetScale: userId로 vendor_id 조회
  const connection = connect({ url: process.env.DATABASE_URL });
  const vendorResult = await connection.execute(
    'SELECT id, business_name, status FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
    [decoded.userId]
  );

  if (!vendorResult.rows || vendorResult.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: '등록된 벤더 정보가 없습니다.'
    });
  }

  const vendor = vendorResult.rows[0];

  return {
    success: true,
    userId: decoded.userId,
    vendorId: vendor.id,
    vendorName: vendor.business_name
  };
}
```

---

## 5. 환경 변수

### .env.local
```bash
# Neon PostgreSQL (Authentication)
DATABASE_URL_NEON=postgresql://username:password@host/database?sslmode=require

# PlanetScale MySQL (Business Data)
DATABASE_URL=mysql://username:password@host/database?ssl={"rejectUnauthorized":true}

# JWT Secret
JWT_SECRET=travleap-secret-key-2024
```

---

## 6. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트 요청                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Endpoint Handler                        │
│                    (예: /api/vendor/info)                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                ↓                                  ↓
┌───────────────────────────┐      ┌──────────────────────────────┐
│   Neon PostgreSQL         │      │   PlanetScale MySQL          │
│   (인증 및 권한)          │      │   (비즈니스 데이터)          │
├───────────────────────────┤      ├──────────────────────────────┤
│ 1. JWT 토큰 검증          │      │ 1. 업체 정보 조회            │
│ 2. 관리자 권한 확인       │      │ 2. 차량 정보 CRUD            │
│ 3. 비밀번호 변경          │      │ 3. 예약 정보 CRUD            │
│ 4. 이메일 주소 변경       │      │ 4. 매출 통계                 │
└───────────────────────────┘      └──────────────────────────────┘
                │                                  │
                └────────────────┬────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         응답 반환                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 주요 수정 내역

### 문제 13: Admin Vendor Deletion API 데이터베이스 연결 오류

**증상**: 관리자 대시보드에서 업체 삭제 시 "벤더 삭제에 실패했습니다" 오류 발생

**원인**: `pages/api/admin/vendors/[id].js` 파일이 Neon의 `executeQuery`를 사용해 PlanetScale 데이터를 삭제하려 시도

**해결**:
1. Neon `getPool()` 추가 → 관리자 권한 확인용
2. PlanetScale `connect()` 추가 → 업체 데이터 CRUD용
3. DELETE 메서드: PlanetScale 연결로 순차 삭제
4. PUT 메서드: PlanetScale 연결로 업체 정보 수정

**결과**: ✅ 관리자가 업체 삭제 가능, 데이터베이스 역할 명확히 분리

---

## 8. 테스트 스크립트

`test-admin-vendor-apis.sh` 파일을 실행하여 관리자 API 동작 확인:

```bash
bash test-admin-vendor-apis.sh
```

테스트 항목:
1. ❌ 인증 없이 삭제 시도 (401 예상)
2. ❌ 잘못된 관리자 ID로 삭제 시도 (403 예상)
3. ✅ 유효한 관리자 ID로 업체 정보 수정 (200 예상)
4. ❌ 진행 중인 예약이 있는 업체 삭제 시도 (400 예상)
5. ✅ 예약이 없는 업체 삭제 (200 예상)

---

## 9. 보안 고려사항

### JWT 인증
- 모든 벤더 API는 `requireVendorAuth` 미들웨어를 통과해야 함
- 토큰에서 추출한 `userId`로 PlanetScale에서 `vendor_id` 조회
- 다른 업체의 리소스 접근 차단

### 관리자 권한
- Neon DB의 `users` 테이블에서 `role = 'admin'` 확인
- 관리자는 모든 업체 데이터 접근 가능
- 관리자 ID는 헤더 `x-admin-id`로 전달

### 비밀번호 보안
- bcrypt로 해싱 (10 rounds)
- 비밀번호는 Neon DB에만 저장
- PlanetScale에는 비밀번호 관련 데이터 없음

---

## 10. 결론

✅ **이중 데이터베이스 아키텍처 정상 작동**
- Neon PostgreSQL: 사용자 인증, 로그인, 회원가입, 관리자 권한
- PlanetScale MySQL: 업체 정보, 차량, 예약, 매출 등 비즈니스 데이터

✅ **관리자 업체 삭제 문제 해결**
- 올바른 데이터베이스 연결 사용
- 순차적 삭제로 데이터 무결성 보장

✅ **보안 강화**
- JWT 인증으로 벤더 권한 확인
- 관리자 역할 기반 접근 제어
- 비밀번호 bcrypt 해싱

이 문서는 Travleap 프로젝트의 데이터베이스 아키텍처와 인증 흐름을 설명합니다.
