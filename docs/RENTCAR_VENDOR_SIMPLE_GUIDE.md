# 🚗 렌트카 업체 계정 시스템 - 쉬운 설명서

> **문제**: "업체명도 모르는데 어떻게 계정을 만들지?"
> **해결**: 3가지 방법 제공 (상황에 맞게 선택)

---

## 🎯 상황별 해결 방법

### 상황 1: 업체가 지금 당장 계정을 원함 (업체명 모름)
**→ 관리자가 임시 계정 만들어주기**

### 상황 2: 업체 정보를 다 알고 있음
**→ 관리자가 DB에 직접 등록**

### 상황 3: 업체가 스스로 신청하게 하고 싶음
**→ 웹 신청 페이지 안내**

---

## 방법 1: 임시 계정 (업체명 모를 때) ⭐ 가장 빠름

### 언제 사용?
```
전화: "안녕하세요, 렌트카 업체인데 계정 만들고 싶어요"
당신: "업체명이 어떻게 되시나요?"
전화: "아직 정하지 못했어요..."

→ 이때 사용!
```

### 어떻게?

#### A. 브라우저 콘솔에서 (가장 빠름)
```javascript
// 1. PlanetScale 대시보드 접속
// 2. Console 탭 열기
// 3. 아래 SQL 실행

-- 임시 계정 생성 (업체명: "임시 렌트카 업체")
INSERT INTO users (
  user_id, email, password_hash, name, role,
  preferred_language, preferred_currency,
  is_active, email_verified, created_at, updated_at
) VALUES (
  CONCAT('vendor_', UNIX_TIMESTAMP()),
  'newvendor@example.com',  -- ← 이메일만 바꾸면 됨
  'hashed_temp123',
  '임시 렌트카 업체',
  'vendor',
  'ko', 'KRW',
  true, true,
  NOW(), NOW()
);

SET @user_id = LAST_INSERT_ID();

INSERT INTO rentcar_vendors (
  name, contact_email, contact_person,
  is_active, is_verified, user_id,
  created_at, updated_at
) VALUES (
  '임시 렌트카 업체',
  'newvendor@example.com',
  '담당자명',
  false,  -- 비활성 (정보 입력 후 활성화)
  false,
  @user_id,
  NOW(), NOW()
);
```

**결과**:
```
✅ 이메일: newvendor@example.com
✅ 비밀번호: temp123
✅ 업체명: 임시 렌트카 업체
✅ 차량: 0대 (나중에 추가)
```

**업체에게 전달**:
```
안녕하세요!
계정이 생성되었습니다.

📧 이메일: newvendor@example.com
🔑 비밀번호: temp123

1. http://yourdomain.com/login 접속
2. 위 정보로 로그인
3. 업체 정보 수정 (담당자에게 요청)
4. 차량 등록 (담당자에게 요청)

감사합니다!
```

---

## 방법 2: 완전한 계정 (업체 정보 다 알 때)

### 언제 사용?
```
전화: "안녕하세요, 신안렌트카입니다"
당신: "네, 업체명, 전화번호, 주소 알려주세요"
전화: "010-1234-5678, 전라남도 신안군..."

→ 정보를 다 받았을 때 사용!
```

### 어떻게?

#### A. SQL 파일 실행 (권장)
```bash
# 1. database/create-vendor-account.sql 파일 열기
# 2. 업체 정보 수정:

INSERT INTO users (
  email,
  name,
  phone,
  ...
) VALUES (
  'shinanrentcar@test.com',  -- ← 업체 이메일
  '신안렌트카',               -- ← 업체명
  '010-1234-5678',           -- ← 전화번호
  ...
);

INSERT INTO rentcar_vendors (
  name,
  contact_email,
  contact_phone,
  contact_person,
  address,
  ...
) VALUES (
  '신안렌트카',               -- ← 업체명
  'shinanrentcar@test.com',  -- ← 이메일
  '010-1234-5678',           -- ← 전화번호
  '홍길동',                   -- ← 담당자명
  '전라남도 신안군 압해읍',   -- ← 주소
  ...
);

# 3. PlanetScale Console에서 실행
```

**결과**:
```
✅ 이메일: shinanrentcar@test.com
✅ 비밀번호: test123
✅ 업체명: 신안렌트카
✅ 담당자: 홍길동
✅ 전화: 010-1234-5678
✅ 주소: 전라남도 신안군 압해읍
✅ 차량: 3대 (K5, 쏘나타, 카니발) ← 테스트용
```

#### B. Node.js 스크립트 (자동화)
```bash
# 1. database/quick-vendor-create.js 파일 열기
# 2. 업체 정보 수정 (line 30-50)
# 3. 터미널에서 실행
node database/quick-vendor-create.js
```

---

## 방법 3: 업체가 웹에서 직접 신청

### 언제 사용?
```
당신: "업체 등록은 웹사이트에서 직접 하실 수 있습니다"
업체: "네, 알겠습니다"

→ 업체가 스스로 신청하게 할 때!
```

### 어떻게?

#### A. 업체에게 URL 안내
```
안녕하세요!
렌트카 업체 등록은 아래 페이지에서 가능합니다.

🔗 URL: http://yourdomain.com/vendor/register

필요한 정보:
- 업체명
- 사업자등록번호 (선택)
- 담당자 이름
- 연락처 이메일
- 전화번호
- 주소 (선택)
- 로그인용 이메일
- 비밀번호

등록 후 관리자 승인이 완료되면
이메일로 알림을 드립니다.

감사합니다!
```

#### B. 업체 신청 프로세스
```
1. /vendor/register 접속
   ↓
2. 업체 정보 입력
   - 업체명: 신안렌트카
   - 담당자: 홍길동
   - 연락처: 010-1234-5678
   - 이메일: contact@shinan.com
   ↓
3. 계정 정보 설정
   - 로그인 이메일: shinanrentcar@login.com
   - 비밀번호: (안전한 비밀번호)
   ↓
4. 등록 신청
   ↓
5. 관리자 승인 대기
   (is_active: false 상태)
   ↓
6. 관리자가 승인
   (is_active: true로 변경)
   ↓
7. 업체에게 이메일 발송
   ↓
8. 업체 로그인 가능
```

#### C. 관리자 승인 방법
```sql
-- PlanetScale Console에서

-- 1. 승인 대기 중인 업체 확인
SELECT id, name, contact_email, is_active, is_verified
FROM rentcar_vendors
WHERE is_active = false
ORDER BY created_at DESC;

-- 결과:
-- id | name | contact_email | is_active | is_verified
-- 5  | 신안렌트카 | contact@shinan.com | false | false

-- 2. 업체 승인
UPDATE rentcar_vendors
SET is_active = true, is_verified = true
WHERE id = 5;

-- 3. 사용자 계정도 활성화
UPDATE users
SET is_active = true
WHERE id = (
  SELECT user_id FROM rentcar_vendors WHERE id = 5
);

-- 완료! 이제 업체가 로그인 가능
```

---

## ⚠️ 자동 등록의 문제점

### 문제: "자동으로 차량 3대 등록되는데, 그런 차량 없으면?"

**현재 상태** (database/create-vendor-account.sql):
```sql
-- 테스트용으로 자동 등록
INSERT INTO rentcar_vehicles (...) VALUES (
  '신안렌트카', 'K5 2023년형', ...
);
INSERT INTO rentcar_vehicles (...) VALUES (
  '신안렌트카', '쏘나타 2024년형', ...
);
INSERT INTO rentcar_vehicles (...) VALUES (
  '신안렌트카', '카니발 2023년형', ...
);
```

**문제점**:
- ❌ 업체가 K5를 가지고 있지 않을 수 있음
- ❌ 쏘나타, 카니발이 없을 수도 있음
- ❌ 실제 차량과 DB가 불일치

### 해결책 1: 차량 자동 등록 제거 (권장) ⭐

**수정된 SQL**:
```sql
-- 업체만 생성, 차량은 0대
INSERT INTO rentcar_vendors (
  name,
  contact_email,
  contact_phone,
  vehicle_count,  -- 0으로 설정
  ...
) VALUES (
  '신안렌트카',
  'contact@shinan.com',
  '010-1234-5678',
  0,  -- 차량 없음
  ...
);

-- 차량 등록은 업체가 직접 하거나 관리자가 나중에 추가
```

**장점**:
- ✅ 실제 차량만 등록됨
- ✅ 데이터 정확성 보장
- ✅ 업체가 필요한 차량만 추가

### 해결책 2: 차량 등록 UI 제공

**VendorDashboardPage에 차량 추가 폼 만들기**:
```typescript
// components/VendorDashboardPage.tsx

const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
const [newVehicle, setNewVehicle] = useState({
  display_name: '',
  vehicle_class: '',
  manufacturer: '',
  model_name: '',
  model_year: 2024,
  seating_capacity: 5,
  transmission_type: '자동',
  fuel_type: '휘발유',
  daily_rate_krw: 80000,
  // ...
});

const handleAddVehicle = async () => {
  try {
    await db.execute(`
      INSERT INTO rentcar_vehicles (
        vendor_id,
        display_name,
        vehicle_class,
        manufacturer,
        model_name,
        ...
      ) VALUES (?, ?, ?, ?, ?, ...)
    `, [
      vendorInfo.id,
      newVehicle.display_name,
      newVehicle.vehicle_class,
      newVehicle.manufacturer,
      newVehicle.model_name,
      ...
    ]);

    toast.success('차량이 등록되었습니다!');
    loadVendorData(); // 새로고침
  } catch (error) {
    toast.error('차량 등록 실패');
  }
};
```

### 해결책 3: 관리자가 업체별로 차량 추가

**AdminPage에서 차량 추가**:
```
1. /admin 접속
2. 렌트카 관리 탭
3. 업체 선택 (신안렌트카)
4. 차량 추가 버튼
5. 차량 정보 입력:
   - 차량명: 실제로 가지고 있는 차량
   - 제조사: 기아
   - 모델: K5
   - 연식: 2023
   - 일일 요금: 80,000원
6. 저장
```

---

## 📋 업체 계정 생성 체크리스트

### ✅ 임시 계정 생성 시
- [ ] 이메일 중복 확인
- [ ] 임시 비밀번호 생성 (예: temp123)
- [ ] 업체명: "임시 렌트카 업체" 또는 "업체명 미정"
- [ ] is_active: false (정보 입력 후 활성화)
- [ ] vehicle_count: 0 (차량 없음)
- [ ] 업체에게 이메일/비밀번호 전달

### ✅ 완전한 계정 생성 시
- [ ] 업체명 확인
- [ ] 담당자명 확인
- [ ] 연락처 (이메일, 전화번호) 확인
- [ ] 주소 확인 (선택)
- [ ] 사업자등록번호 확인 (선택)
- [ ] is_active: true (즉시 활성화)
- [ ] vehicle_count: 0 (차량은 나중에 추가)
- [ ] 업체에게 이메일/비밀번호 전달

### ✅ 웹 신청 승인 시
- [ ] 신청 내역 확인
- [ ] 업체 정보 검증
- [ ] is_active: false → true 변경
- [ ] is_verified: false → true 변경
- [ ] 사용자 계정도 활성화
- [ ] 업체에게 승인 이메일 발송

---

## 🎯 권장 프로세스

### 상황 A: 업체가 급하게 계정 필요
```
1. 임시 계정 생성 (이메일만 받기)
   ↓
2. 이메일/비밀번호 전달
   ↓
3. 업체 로그인
   ↓
4. 관리자에게 업체 정보 제공 (전화/이메일)
   ↓
5. 관리자가 DB 직접 수정
   ↓
6. 차량 추가 (관리자가 직접 또는 업체 요청)
```

### 상황 B: 업체 정보를 다 알고 있음
```
1. SQL 파일에 업체 정보 입력
   ↓
2. PlanetScale에서 실행
   ↓
3. 이메일/비밀번호 전달
   ↓
4. 업체 로그인
   ↓
5. 차량 추가 (관리자 또는 업체)
```

### 상황 C: 업체가 스스로 신청
```
1. /vendor/register URL 안내
   ↓
2. 업체가 직접 신청
   ↓
3. 관리자 승인 대기
   ↓
4. 관리자가 검토 후 승인
   ↓
5. 업체에게 승인 이메일
   ↓
6. 업체 로그인
   ↓
7. 차량 추가 (관리자 또는 업체)
```

---

## 💡 핵심 요약

### Q1: "업체명도 모르는데 어떻게 계정 만들지?"
**A**: 임시 계정 생성 → 이메일만으로 계정 생성 → 나중에 정보 입력

### Q2: "자동으로 차량 3대 등록되는데, 그런 차량 없으면?"
**A**: **차량 자동 등록 제거** (vehicle_count: 0으로 시작)
→ 업체가 실제 보유한 차량만 추가

### Q3: "업체가 차량을 어떻게 추가하지?"
**A**: 3가지 방법
1. 관리자가 AdminPage에서 추가
2. 업체가 VendorDashboard에서 추가 (UI 개발 필요)
3. 업체가 관리자에게 요청 (이메일/전화)

### Q4: "가장 빠른 방법은?"
**A**: **임시 계정 생성 (SQL 3줄)**
```sql
INSERT INTO users (...) VALUES ('vendor_123', 'email@test.com', ...);
INSERT INTO rentcar_vendors (...) VALUES ('임시 업체', ...);
-- 완료! 이메일 전달
```

---

**작성일**: 2025-01-XX
**버전**: v1.0.0
