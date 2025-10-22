# 렌트카 시스템 현황 분석 및 개선 계획

작성일: 2025-10-22
작성자: Claude Code

## 📊 현재 시스템 상태 (AS-IS)

### 1. 데이터베이스 구조

#### Neon PostgreSQL (사용자 계정)
```
users 테이블:
  - id: integer (PK, auto increment)
  - username: varchar (REQUIRED) ✅
  - email: varchar (REQUIRED, UNIQUE) ✅
  - password_hash: varchar (REQUIRED) ✅
  - name: varchar (REQUIRED) ✅
  - phone: varchar (nullable) ✅
  - role: varchar (nullable, default: 'user') ✅
  - created_at: timestamp ✅
  - updated_at: timestamp ✅

현재 샘플 데이터:
  - ID: 1, Username: admin, Email: admin@shinan.com, Role: admin
  - ID: 21, Username: rentcar, Email: rentcar@vendor.com, Role: vendor
  - ID: 22, Username: testuser123, Email: testuser@example.com, Role: user
```

**✅ 현재 상태: username 컬럼 이미 존재!**
- 회원가입 시 email에서 자동 생성: `email.split('@')[0]`
- 로그인은 email로 진행
- JWT에 username 포함

#### PlanetScale MySQL (비즈니스 데이터)
```
rentcar_vendors 테이블:
  - id: int (PK)
  - vendor_code: varchar (UNIQUE, 예: TRAVLEAP_RC_001) ✅
  - name: varchar (업체명) ✅
  - contact_email: varchar (연락처 이메일) ✅
  - contact_phone: varchar ✅
  - address: text ✅
  - description: text ✅
  - pms_provider: varchar (PMS 제공자, nullable) ✅
  - pms_api_key: varchar (API 키, nullable) ✅
  - pms_api_secret: varchar (API 시크릿, nullable) ✅
  - pms_endpoint: varchar (API URL, nullable) ✅
  - pms_sync_enabled: boolean (자동 동기화, default: false) ✅
  - pms_last_sync: timestamp (마지막 동기화) ✅
  - pms_sync_interval: int (동기화 간격, 초 단위) ✅
  - is_active: boolean ✅
  - created_at: timestamp ✅
  - updated_at: timestamp ✅

현재 샘플 데이터:
  - ID: 12, Name: 트래블립렌트카, Email: rentcar@vendor.com
  - Code: TRAVLEAP_RC_001, Status: active
  - PMS: 설정 안 됨
```

**✅ 현재 상태: PMS 관련 컬럼 모두 존재!**

### 2. 인증 시스템

#### 현재 구현 (Working)
```
로그인 방식: email + password
- API: /api/auth/login (Neon DB)
- API: /api/signup (Neon DB)
- 검증: email로 users 테이블 조회
- JWT 발급: { userId, email, name, role }
```

#### 제안사항과의 차이
```
제안: username (user_id) + password 로 로그인
현재: email + password 로 로그인

차이점:
1. 로그인 입력: username vs email
2. DB 조회: WHERE username = ? vs WHERE email = ?
3. 사용자 식별: username vs email
```

**⚠️ 개선 필요: 현재는 email로 로그인, username은 자동 생성만 됨**

### 3. API 엔드포인트 현황

#### ✅ 이미 구현된 API
```
인증:
  ✅ POST /api/auth/login - Neon DB 사용
  ✅ POST /api/signup - Neon DB 사용

사용자 관리:
  ✅ GET /api/users - Neon DB에서 조회
  ✅ POST /api/users - Neon DB에 생성
  ✅ PUT /api/users - Neon DB 수정
  ✅ DELETE /api/users - Neon DB 삭제

벤더 관리:
  ✅ GET /api/vendors - PlanetScale에서 조회 (관리자용)
  ✅ PUT /api/vendors - PlanetScale + Neon 동시 업데이트 (이메일/비밀번호 변경)

벤더 대시보드:
  ✅ GET /api/vendor/vehicles?vendorId={id} - 차량 목록
  ✅ POST /api/vendor/vehicles - 차량 추가
  ✅ PUT /api/vendor/vehicles/[id] - 차량 수정
  ✅ DELETE /api/vendor/vehicles/[id] - 차량 삭제
  ✅ PUT /api/vendor/vehicles/[id]/availability - 이용가능 토글
  ✅ GET /api/vendor/bookings?vendorId={id} - 예약 목록
  ✅ GET /api/vendor/revenue?vendorId={id} - 매출 통계
  ✅ GET /api/vendor/info?userId={id} - 업체 정보 (구 API, 사용 안 함)

PMS 연동:
  ✅ GET /api/vendor/pms-config?userId={id} - PMS 설정 조회
  ✅ PUT /api/vendor/pms-config - PMS 설정 업데이트
  ❌ GET /api/vendor/pms/logs?userId={id} - 동기화 로그 (미구현)
  ❌ POST /api/vendor/pms/sync-now?userId={id} - 수동 동기화 (미구현)

대시보드 통계:
  ✅ GET /api/admin/stats - Neon users 카운트 포함
```

### 4. 프론트엔드 컴포넌트

#### ✅ 이미 구현된 UI
```
벤더 대시보드:
  ✅ VendorDashboardPageEnhanced.tsx
    - 대시보드 탭 (통계, 차트)
    - 차량 관리 탭 (목록, 추가, 수정, 삭제)
    - 예약 관리 탭 (목록, 필터링)
    - 설정 탭 (업체 정보, 이메일/비밀번호 변경)
    ✅ CSV 업로드 기능 (UI + 로직 완료)
    ✅ CSV 템플릿 다운로드

PMS 설정:
  ✅ VendorPMSSettings.tsx
    - PMS 제공자 선택
    - API 키 입력
    - 자동 동기화 설정
    - 동기화 로그 표시 (API 미구현)
    ✅ localhost:3004 제거 완료

로그인/회원가입:
  ✅ LoginPage.tsx - email로 로그인
  ✅ SignupPage.tsx - username 자동 생성
```

### 5. 권한 체크 시스템

#### 현재 구현
```
❌ 벤더 스코프 미들웨어 없음
  - 각 API에서 vendorId 파라미터로 필터링
  - 타 업체 데이터 접근 가능한 보안 취약점

예시:
  GET /api/vendor/vehicles?vendorId=12 ✅ 정상
  GET /api/vendor/vehicles?vendorId=99 ❌ 타 업체 데이터 노출 가능
```

**⚠️ 심각한 보안 이슈: JWT에서 vendorId 추출 및 검증 필요**

---

## 🎯 제안사항과 비교

### 1. 로그인 시스템 (🔴 HIGH)

| 항목 | 제안 | 현재 | 상태 |
|------|------|------|------|
| 로그인 입력 | username (user_id) | email | ⚠️ 변경 필요 |
| DB 컬럼 | username (UNIQUE) | username (있음, 사용 안 함) | ⚠️ 로직 변경 |
| 회원가입 | username 직접 입력 | email에서 자동 생성 | ⚠️ UI 변경 |
| JWT | username 포함 | email 포함 | ⚠️ 변경 필요 |

**개선 방향:**
```javascript
// 현재:
POST /api/auth/login
Body: { email: "rentcar@vendor.com", password: "..." }
→ SELECT * FROM users WHERE email = ?

// 제안:
POST /api/auth/login
Body: { username: "rentcar", password: "..." }
→ SELECT * FROM users WHERE username = ?
```

### 2. PMS 연동 (✅ 대부분 완료)

| 기능 | 제안 | 현재 | 상태 |
|------|------|------|------|
| PMS 설정 API | ✅ | ✅ 완료 | ✅ |
| 수동 동기화 | POST /api/vendor/pms/sync-now | ❌ 없음 | ⚠️ 구현 필요 |
| 동기화 로그 | GET /api/vendor/pms/logs | ❌ 없음 | ⚠️ 구현 필요 |
| 자동 스케줄러 | cron job | ❌ 없음 | 🟡 선택사항 |
| PMS 설정 UI | ✅ | ✅ 완료 | ✅ |

**현황:**
- ✅ PMS 설정 저장/조회 API 완료
- ✅ PMS 설정 UI 완료 (VendorPMSSettings.tsx)
- ❌ 실제 동기화 로직 없음
- ❌ 동기화 로그 API 없음

### 3. CSV 업로드 (✅ 완료)

| 항목 | 제안 | 현재 | 상태 |
|------|------|------|------|
| CSV 파싱 | ✅ | ✅ 완료 | ✅ |
| FormData 전송 | ✅ | ✅ 완료 | ✅ |
| 파일 입력 UI | ✅ | ✅ 완료 | ✅ |
| 템플릿 다운로드 | ✅ | ✅ 완료 | ✅ |
| 에러 처리 | ✅ | ✅ 완료 | ✅ |

**✅ 현재 완벽하게 구현됨!**
- VendorDashboardPageEnhanced.tsx의 `handleCSVUpload()` 함수
- CSV 파싱 후 각 차량을 개별 POST 요청
- 성공/실패 카운트 및 Toast 알림

### 4. 권한 체크 미들웨어 (🔴 HIGH)

| 항목 | 제안 | 현재 | 상태 |
|------|------|------|------|
| JWT 검증 | ✅ | ❌ 없음 | ⚠️ 구현 필요 |
| vendorId 검증 | ✅ | ❌ 없음 | ⚠️ 구현 필요 |
| 타 업체 차단 | ✅ | ❌ 없음 | ⚠️ 심각한 보안 이슈 |

**현재 문제:**
```javascript
// 현재: 아무나 다른 업체 데이터 접근 가능
GET /api/vendor/vehicles?vendorId=12  // 정상
GET /api/vendor/vehicles?vendorId=99  // 타 업체 데이터도 보임!

// 제안: JWT에서 vendorId 추출 및 검증
Authorization: Bearer eyJhbGc...
→ JWT에서 vendorId 추출
→ 요청 vendorId와 비교
→ 불일치 시 403 Forbidden
```

### 5. 파일 구조 정리 (🟡 MEDIUM)

| 항목 | 제안 | 현재 | 상태 |
|------|------|------|------|
| SQL 스키마 | schema.sql 통합 | phase1~10 분산 | 🟢 정리 권장 |
| 인증 경로 | /api/shared/auth.js | 여러 파일 분산 | 🟢 정리 권장 |
| utils/rentcar/ | 어댑터 패턴 | 직접 API 구현 | 🟢 선택사항 |

---

## 📋 우선순위별 작업 목록

### 🔴 HIGH - 즉시 해결 필요 (보안 이슈)

#### 1. 벤더 권한 체크 미들웨어 추가
```javascript
// 생성: /middleware/requireVendorScope.js

const jwt = require('jsonwebtoken');

module.exports = function requireVendorScope(req, res, next) {
  try {
    // 1. JWT 검증
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. role 체크
    if (decoded.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Vendor only' });
    }

    // 3. vendorId 검증 (email로 조회)
    // Neon users.email → PlanetScale rentcar_vendors.contact_email 매칭

    req.user = decoded;
    req.vendorId = vendorId; // 추출된 vendorId 저장
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
```

**적용할 API:**
- `/api/vendor/vehicles` (전체)
- `/api/vendor/bookings` (전체)
- `/api/vendor/revenue` (전체)
- `/api/vendor/pms-config` (전체)

#### 2. 로그인 시스템 개선 (선택사항)

**옵션 A: 현재 유지 (email 로그인)**
- 장점: 이미 작동 중, 변경 불필요
- 단점: username 컬럼 낭비

**옵션 B: username 로그인으로 변경**
- 장점: 제안서와 일치, username 활용
- 단점: 기존 사용자 재가입 필요

**추천: 옵션 A (현재 유지)**
- username은 표시용으로만 사용
- 로그인은 email 유지

### 🟡 MEDIUM - 기능 개선

#### 3. PMS 동기화 API 구현
```javascript
// 생성: /api/vendor/pms/sync-now.js
// 수동 동기화 트리거

// 생성: /api/vendor/pms/logs.js
// 동기화 로그 조회

// 생성: /services/pms-sync.js
// 실제 PMS API 호출 로직
```

#### 4. 자동 동기화 스케줄러 (선택사항)
```javascript
// 생성: /services/pms-scheduler.js
// setInterval 또는 node-cron 사용
// pms_sync_interval에 따라 자동 실행
```

### 🟢 LOW - 정리 작업

#### 5. SQL 스키마 통합
```sql
-- 생성: /sql/schema.sql
-- phase1~10.sql 내용 통합
-- 단일 파일로 관리

-- 테이블 순서:
-- 1. users (Neon)
-- 2. rentcar_vendors
-- 3. rentcar_vehicles
-- 4. rentcar_bookings
-- 5. rentcar_reviews
-- 6. rentcar_pms_sync_logs (추가)
```

#### 6. 인증 경로 통합
```
현재:
  /api/auth/login.js
  /api/signup.js
  /api/users.js

제안:
  /api/shared/auth.js (전체 통합)
  - POST /auth/login
  - POST /auth/signup
  - GET /auth/me
  - PUT /auth/update
```

---

## 🚀 단계별 실행 계획

### Phase 1: 보안 강화 (1-2시간)
1. ✅ 벤더 권한 미들웨어 생성
2. ✅ 전체 vendor API에 적용
3. ✅ 테스트 (타 업체 접근 차단 확인)

### Phase 2: PMS 연동 완성 (2-3시간)
1. ✅ 동기화 로그 API 구현
2. ✅ 수동 동기화 API 구현
3. ✅ 실제 PMS API 호출 로직 추가
4. ✅ 에러 핸들링 및 로깅

### Phase 3: 코드 정리 (1-2시간)
1. ✅ SQL 스키마 통합
2. ✅ 인증 경로 정리
3. ✅ 문서 업데이트

---

## 💡 결론

### ✅ 이미 잘 구현된 것
1. **사용자 인증** - Neon DB 사용, email 로그인 작동
2. **벤더 대시보드** - 4탭 구조, 모든 CRUD 작동
3. **CSV 업로드** - 프론트엔드 + 백엔드 완벽 구현
4. **PMS 설정 UI** - 저장/조회 API 포함
5. **이메일/비밀번호 변경** - Neon + PlanetScale 동시 업데이트

### ⚠️ 즉시 수정 필요
1. **권한 체크 미들웨어** - 타 업체 데이터 접근 차단
2. **JWT 검증** - 모든 vendor API에 적용

### 🟡 추가하면 좋은 것
1. **PMS 동기화 로직** - 실제 API 호출 및 로그
2. **자동 스케줄러** - 설정된 간격마다 자동 동기화
3. **파일 구조 정리** - SQL 통합, 인증 경로 정리

### 🎯 핵심 차이점
| 항목 | 제안 | 현재 | 결론 |
|------|------|------|------|
| 로그인 | username | email | **현재 유지 권장** |
| PMS 연동 | ✅ | ⚠️ 부분 구현 | **완성 필요** |
| CSV 업로드 | ✅ | ✅ 완료 | **완벽** |
| 권한 체크 | ✅ | ❌ 없음 | **즉시 구현** |
| 파일 정리 | ✅ | ⚠️ 분산 | **정리 권장** |

---

**다음 단계: 보안 강화부터 시작하는 것을 강력히 권장합니다!**
