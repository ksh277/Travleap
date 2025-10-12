# 렌트카 업체 계정 생성 기록

> **목적**: 생성된 모든 임시 계정을 기록하여 관리 및 추적
> **업데이트**: 새 계정 생성 시마다 이 파일에 추가

---

## 📋 계정 생성 로그

### 업체 #1: [업체명 미정] (예시)
- **생성일**: 2025-01-13
- **이메일**: `rentcar1@test.com`
- **비밀번호**: `temp123`
- **상태**: ⏳ 정보 입력 대기중
- **vendor_id**: (DB 저장 후 업데이트)
- **user_id**: (DB 저장 후 업데이트)
- **비고**: 최초 테스트 계정

---

### 업체 #2: [업체명 미정]
- **생성일**: YYYY-MM-DD
- **이메일**: `rentcar2@test.com`
- **비밀번호**: `temp123`
- **상태**: ⏳ 정보 입력 대기중
- **vendor_id**:
- **user_id**:
- **비고**:

---

### 업체 #3: [업체명 미정]
- **생성일**:
- **이메일**:
- **비밀번호**:
- **상태**:
- **vendor_id**:
- **user_id**:
- **비고**:

---

## 🔄 계정 상태 표시

| 상태 | 의미 |
|------|------|
| ⏳ 정보 입력 대기중 | 계정 생성됨, 업체가 아직 로그인 안 함 |
| ✅ 정보 입력 완료 | 업체가 로그인해서 실제 정보 수정 완료 |
| 🚗 차량 등록 완료 | 차량까지 등록 완료, 운영 중 |
| ⚠️ 문제 있음 | 로그인 실패, 정보 오류 등 |
| ❌ 삭제됨 | 계정 삭제 또는 비활성화 |

---

## 📊 통계 (자동 계산 불가, 수동 업데이트)

- **총 생성 계정**: 1개
- **정보 입력 완료**: 0개
- **운영 중**: 0개
- **대기 중**: 1개

---

## 🔧 빠른 생성 스크립트

새 업체 계정이 필요할 때마다 아래 SQL을 복사해서 사용하세요.

### 템플릿 (이메일만 수정)

```sql
-- 📧 이메일 수정: rentcarN@test.com → 실제 이메일
INSERT INTO users (user_id, email, password_hash, name, phone, role, preferred_language, preferred_currency, is_active, email_verified, created_at, updated_at)
VALUES (CONCAT('vendor_', UNIX_TIMESTAMP()), 'rentcarN@test.com', 'hashed_temp123', '임시업체', '010-0000-0000', 'vendor', 'ko', 'KRW', true, true, NOW(), NOW());

SET @uid = LAST_INSERT_ID();

INSERT INTO rentcar_vendors (name, contact_email, contact_phone, contact_person, business_number, address, is_active, is_verified, vehicle_count, user_id, created_at, updated_at)
VALUES ('임시 렌트카 업체', 'rentcarN@test.com', '010-0000-0000', '미정', '000-00-00000', '미정', false, false, 0, @uid, NOW(), NOW());

-- 🔍 생성된 ID 확인
SELECT
  u.id as user_id,
  u.email,
  rv.id as vendor_id,
  rv.name as vendor_name
FROM users u
LEFT JOIN rentcar_vendors rv ON rv.user_id = u.id
WHERE u.email = 'rentcarN@test.com';
```

### 실행 후 해야 할 일

1. ✅ SQL 실행 성공 확인
2. ✅ 생성된 `user_id`, `vendor_id` 복사
3. ✅ 이 문서에 기록 추가
4. ✅ 업체에게 로그인 정보 전달:
   ```
   이메일: rentcarN@test.com
   비밀번호: temp123
   사이트: https://travleap.com/login
   ```

---

## 🎯 업체에게 전달할 메시지 템플릿

```
안녕하세요!

Travleap 렌트카 업체 계정이 생성되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 로그인 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이메일: [이메일 입력]
비밀번호: temp123
사이트: https://travleap.com/login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 로그인 후 해야 할 일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 로그인 → 자동으로 업체 대시보드로 이동
2. "업체 정보" 탭 클릭
3. "정보 수정" 버튼 클릭
4. 실제 업체 정보 입력:
   - 업체명
   - 담당자
   - 연락처
   - 사업자번호
   - 주소
5. "저장" 버튼 클릭

차량 등록은 정보 입력 후 관리자에게 문의해주세요.

문의: support@travleap.com

감사합니다!
```

---

## 🔐 보안 정책

### 비밀번호
- **임시 비밀번호**: `temp123` (모든 계정 공통)
- **변경 방법**: 현재는 관리자 문의 필요
- **TODO**: 비밀번호 변경 기능 추가 예정

### 권한
- ✅ 자기 업체 정보 수정
- ✅ 자기 업체 차량 조회/삭제
- ✅ 자기 업체 예약 조회
- ❌ 다른 업체 데이터 접근 불가
- ❌ 차량 추가는 관리자 문의

### 데이터 격리
```sql
-- 모든 쿼리에 vendor_id 또는 user_id 필터링 적용
WHERE vendor_id = ?
WHERE user_id = ?
```

---

## 📅 정기 점검 체크리스트

### 매주 월요일
- [ ] 대기 중인 계정 확인
- [ ] 업체에게 정보 입력 독려
- [ ] 문제 있는 계정 확인

### 매월 1일
- [ ] 통계 업데이트
- [ ] 비활성 계정 정리
- [ ] 로그 백업

---

## 📝 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2025-10-13 | 최초 문서 생성 | Claude |
| | | |
| | | |

---

**관리자 노트**:
- 이 파일은 계속 업데이트됩니다
- 새 계정 생성 시 반드시 기록
- 업체명 확정 시 업데이트
- 문제 발생 시 비고란에 기록
