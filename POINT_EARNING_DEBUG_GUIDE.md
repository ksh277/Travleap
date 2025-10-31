# 포인트 적립 안 되는 문제 디버깅 가이드

## 문제 상황
- 주문번호: ORDER_1761870219344_3907
- 결제일: 2025년 10월 31일 오전 09:24
- 상품: 퍼플아일랜드 아크릴 토퍼 포토프롭 x7
- 결제 금액: ₩54,600원
- **문제**: 포인트가 0P로 표시됨 (적립되지 않음)

---

## 수행한 작업 ✅

### 1. 포인트 적립 로직에 상세 로깅 추가

**파일**: `pages/api/payments/confirm.js`

#### 추가된 로그 (총 20개 로그 포인트)

```javascript
// 1. 포인트 적립 프로세스 시작
💰 [포인트 적립] isOrder=true, orderId=...
💰 [포인트 적립 시작] userId=X, allPayments=Y건

// 2. Neon DB 연결 및 트랜잭션
💰 [포인트] Neon DB 트랜잭션 시작
💰 [포인트] Neon DB 사용자 조회 결과: X건
💰 [포인트] 사용자 정보: id=X, name=XXX, 현재 포인트=XP

// 3. 각 payment별 포인트 계산
💰 [포인트] X개 payment에 대해 포인트 적립 시작
💰 [포인트] payment_id=X: subtotal=X원, category=XXX
💰 [포인트] payment_id=X: XP 적립 예정 (잔액: XP)
✅ [포인트] payment_id=X XP 적립 완료 (user_points insert_id=X)

// 4. Neon users 테이블 업데이트
💰 [포인트] Neon users 테이블 업데이트 시작: XP
✅ [포인트] 총 XP 적립 완료 (사용자 X, 최종 잔액: XP)

// 5. 트랜잭션 커밋
💰 [포인트] Neon DB 트랜잭션 커밋 시도
✅ [포인트] Neon DB 트랜잭션 커밋 완료
💰 [포인트] Neon DB 연결 종료
```

#### 에러 로그

```javascript
// userId 없음
❌ [포인트 적립] userId가 없습니다! orderId=...
❌ [포인트 적립] 포인트 적립 불가 - userId 확인 필요

// 사용자 정보 없음
❌ [포인트] Neon DB에 user_id=X에 해당하는 사용자가 없습니다!
❌ [포인트] 포인트 적립 불가 - 사용자 데이터 확인 필요

// 포인트 0P
⚠️ [포인트] payment_id=X: 적립 포인트 0P (subtotal=X)
⚠️ [포인트] 적립할 포인트가 0P입니다

// 개별 payment 적립 실패
❌ [포인트] payment_id=X 적립 실패: [에러 메시지]
❌ [포인트] 에러 상세: [스택 트레이스]

// 전체 포인트 적립 실패
❌ [포인트/알림] 처리 실패: [에러 메시지]
❌ [포인트] 에러 스택: [스택 트레이스]
❌ [포인트] 에러 타입: [에러 타입]
❌ [포인트] 에러 메시지: [에러 메시지]
⚠️ [포인트] Neon DB 트랜잭션 롤백 완료
⚠️ [포인트] 포인트 적립 실패했지만 결제는 성공 처리됨
```

---

## 다음 단계: 로그 확인

### 1. 서버 로그 확인

결제 완료 시 서버 콘솔에서 다음 로그를 확인:

**로컬 개발**:
```bash
npm run dev
# 또는
vercel dev
```

**Vercel 배포**:
1. Vercel Dashboard 접속
2. 프로젝트 선택
3. "Logs" 탭 클릭
4. 시간대 필터링: 2025년 10월 31일 09:24 전후

### 2. 예상 시나리오별 대응

#### 시나리오 A: userId가 없음
```
❌ [포인트 적립] userId가 없습니다! orderId=ORDER_1761870219344_3907
```

**원인**: 주문 생성 시 user_id가 저장되지 않음

**확인 방법**:
```sql
-- PlanetScale MySQL
SELECT id, user_id, gateway_transaction_id, created_at
FROM payments
WHERE gateway_transaction_id = 'ORDER_1761870219344_3907';
```

**해결책**:
```sql
-- user_id 업데이트 (실제 사용자 ID로 변경)
UPDATE payments
SET user_id = <실제_사용자_ID>
WHERE gateway_transaction_id = 'ORDER_1761870219344_3907';
```

---

#### 시나리오 B: Neon DB에 사용자 없음
```
💰 [포인트] Neon DB 사용자 조회 결과: 0건
❌ [포인트] Neon DB에 user_id=X에 해당하는 사용자가 없습니다!
```

**원인**: Neon PostgreSQL users 테이블에 해당 user_id가 없음

**확인 방법**:
```sql
-- Neon PostgreSQL
SELECT id, name, email, total_points
FROM users
WHERE id = <user_id>;
```

**해결책**: 사용자 데이터가 있는지 확인, 없으면 회원가입 필요

---

#### 시나리오 C: subtotal이 0원
```
💰 [포인트] payment_id=X: subtotal=0원, category=팝업
⚠️ [포인트] payment_id=X: 적립 포인트 0P (subtotal=0)
```

**원인**: payments.notes에 subtotal 정보가 없거나 0원

**확인 방법**:
```sql
-- PlanetScale MySQL
SELECT id, notes
FROM payments
WHERE gateway_transaction_id = 'ORDER_1761870219344_3907';
```

notes 값 예시:
```json
{
  "category": "팝업",
  "items": [...],
  "subtotal": 54600,    // <-- 이 값이 있어야 함
  "deliveryFee": 0,
  "couponDiscount": 0,
  "pointsUsed": 0
}
```

**해결책**: notes.subtotal 값 확인, 없으면 수동으로 포인트 적립

---

#### 시나리오 D: DB 연결 실패
```
❌ [포인트/알림] 처리 실패: Error: connect ETIMEDOUT
❌ [포인트] 에러 타입: Error
```

**원인**: Neon PostgreSQL 연결 실패

**확인 방법**:
```bash
# 환경 변수 확인
echo $POSTGRES_DATABASE_URL
echo $DATABASE_URL
```

**해결책**:
- `.env` 파일에 Neon DB URL 확인
- Neon Dashboard에서 DB 상태 확인
- IP 화이트리스트 설정 확인

---

#### 시나리오 E: user_points 테이블 INSERT 실패
```
💰 [포인트] payment_id=123: 1092P 적립 예정 (잔액: 1092P)
❌ [포인트] payment_id=123 적립 실패: Error: Table 'user_points' doesn't exist
```

**원인**: PlanetScale MySQL에 user_points 테이블이 없음

**확인 방법**:
```sql
-- PlanetScale MySQL
SHOW TABLES LIKE 'user_points';
DESC user_points;
```

**해결책**: user_points 테이블 생성 스크립트 실행

---

## 수동 포인트 적립 방법

현재 주문 (ORDER_1761870219344_3907)에 대한 포인트를 수동으로 적립:

### 1. 필요한 정보 조회

```sql
-- PlanetScale MySQL: payment 정보 조회
SELECT id, user_id, amount, notes
FROM payments
WHERE gateway_transaction_id = 'ORDER_1761870219344_3907';
```

결과 예시:
```
id: 123
user_id: 1
amount: 54600
notes: {"subtotal": 54600, "deliveryFee": 0, ...}
```

### 2. 포인트 계산

```javascript
subtotal = 54600원
pointsToEarn = Math.floor(54600 * 0.02) = 1092P
```

### 3. user_points 테이블에 INSERT

```sql
-- PlanetScale MySQL
INSERT INTO user_points (
  user_id,
  points,
  point_type,
  reason,
  related_order_id,
  balance_after,
  expires_at,
  created_at
) VALUES (
  1,                                          -- user_id (실제 값으로 변경)
  1092,                                       -- 적립 포인트
  'earn',                                     -- 적립 타입
  '주문 적립 (payment_id: 123, 카테고리: 팝업)', -- 사유
  '123',                                      -- payment_id
  1092,                                       -- 잔액 (기존 포인트 + 적립 포인트)
  DATE_ADD(NOW(), INTERVAL 1 YEAR),          -- 만료일 (1년 후)
  NOW()
);
```

### 4. Neon users 테이블 업데이트

```sql
-- Neon PostgreSQL: 현재 포인트 조회
SELECT total_points FROM users WHERE id = 1;

-- 포인트 업데이트 (기존 포인트 + 1092)
UPDATE users
SET total_points = total_points + 1092
WHERE id = 1;
```

---

## 포인트 적립 체크리스트

### 결제 시 확인사항

- [ ] orderId가 `ORDER_`로 시작하는지 확인 (isOrder = true)
- [ ] userId가 존재하는지 확인 (payments.user_id)
- [ ] Neon DB에 해당 user_id가 있는지 확인
- [ ] payments.notes에 subtotal 값이 있는지 확인
- [ ] subtotal > 0인지 확인
- [ ] 포인트 계산: Math.floor(subtotal * 0.02)
- [ ] user_points 테이블 INSERT 성공
- [ ] Neon users.total_points 업데이트 성공

### 서버 로그 확인사항

- [ ] `💰 [포인트 적립 시작]` 로그 확인
- [ ] `💰 [포인트] Neon DB 트랜잭션 시작` 확인
- [ ] `💰 [포인트] 사용자 정보: ...` 로그 확인
- [ ] `💰 [포인트] payment_id=X: XP 적립 예정` 로그 확인
- [ ] `✅ [포인트] payment_id=X XP 적립 완료` 확인
- [ ] `✅ [포인트] 총 XP 적립 완료` 확인
- [ ] `✅ [포인트] Neon DB 트랜잭션 커밋 완료` 확인
- [ ] 에러 로그 없음 확인

---

## 테스트 방법

### 1. 새 주문 생성 후 포인트 적립 확인

1. 새로운 상품 주문
2. 결제 완료
3. 서버 로그 확인
4. MyPage → 포인트 탭에서 확인
5. Neon DB users 테이블에서 total_points 확인
6. PlanetScale user_points 테이블에서 레코드 확인

### 2. 로그 패턴 분석

**정상 케이스**:
```
💰 [포인트 적립 시작] userId=1, allPayments=1건
💰 [포인트] Neon DB 트랜잭션 시작
💰 [포인트] Neon DB 사용자 조회 결과: 1건
💰 [포인트] 사용자 정보: id=1, name=홍길동, 현재 포인트=0P
💰 [포인트] 1개 payment에 대해 포인트 적립 시작
💰 [포인트] payment_id=123: subtotal=54600원, category=팝업
💰 [포인트] payment_id=123: 1092P 적립 예정 (잔액: 1092P)
✅ [포인트] payment_id=123 1092P 적립 완료 (user_points insert_id=456)
💰 [포인트] Neon users 테이블 업데이트 시작: 1092P
✅ [포인트] 총 1092P 적립 완료 (사용자 1, 최종 잔액: 1092P)
💰 [포인트] Neon DB 트랜잭션 커밋 시도
✅ [포인트] Neon DB 트랜잭션 커밋 완료
💰 [포인트] Neon DB 연결 종료
```

---

## 관련 파일

- `pages/api/payments/confirm.js`: 포인트 적립 로직
- `pages/api/user/points.js`: 포인트 내역 조회 API
- `components/pages/RewardsPage.tsx`: 포인트 페이지 UI

---

## 다음 작업

1. **서버 로그 확인**: 위의 로그 패턴 중 어느 시나리오인지 확인
2. **원인 파악**: 시나리오별 해결책 적용
3. **수동 적립**: 필요시 SQL로 수동 포인트 적립
4. **테스트**: 새 주문으로 포인트 적립 테스트

---

## 문의

로그를 확인하고 어떤 에러가 발생했는지 공유해주시면 정확한 해결책을 제시하겠습니다.
