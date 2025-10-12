# 로그인 계정 정보

## ✅ 테스트 완료 (2025-10-13)

모든 계정이 PlanetScale DB에서 정상 작동 확인됨

---

## 1. 관리자 계정 (Admin)

### 테스트 관리자
- **이메일**: `admin@test.com`
- **비밀번호**: `admin123`
- **권한**: admin

### 시스템 관리자
- **이메일**: `admin@shinan.com`
- **비밀번호**: `admin123`
- **권한**: admin

### 매니저
- **이메일**: `manager@shinan.com`
- **비밀번호**: `manager123`
- **권한**: admin

---

## 2. 일반 사용자 (User)

- **이메일**: `user@test.com`
- **비밀번호**: `user123`
- **권한**: user

---

## 3. 렌트카 업체 (Vendor)

- **이메일**: `vendor@test.com`
- **비밀번호**: `vendor123`
- **권한**: partner

---

## 로그인 후 이동 경로

- **admin** → `/admin` (관리자 페이지)
- **partner** → `/vendor/dashboard` (업체 대시보드)
- **user** → `/` (홈페이지)

---

## 보안

- 모든 비밀번호는 bcrypt로 해시됨
- 해시 포맷: `$2b$10$...`
- DB: PlanetScale (travleap)
