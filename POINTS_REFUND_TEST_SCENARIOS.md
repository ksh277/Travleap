# 포인트 환불 테스트 시나리오

## 목적
환불 시 포인트 회수가 모든 엣지 케이스에서 정확히 작동하는지 검증

---

## 시나리오 1: 포인트를 사용하지 않은 경우 (정상 케이스)

### 테스트 순서
1. **주문 A**: 10,000원 구매
   - 포인트 사용: 0P
   - 포인트 적립: 200P
   - 현재 잔액: 200P

2. **주문 A 환불**
   - 회수 시도: 200P
   - 현재 잔액: 200P
   - **예상 결과**: 200P 전액 회수 성공, 잔액 0P

### 검증 포인트
- ✅ Neon DB `users.total_points`: 0
- ✅ PlanetScale `user_points` 회수 내역: -200P
- ✅ 로그: "포인트 회수 완료: 200P"

---

## 시나리오 2: 포인트를 일부만 사용한 경우

### 테스트 순서
1. **주문 A**: 10,000원 구매
   - 포인트 적립: 200P
   - 현재 잔액: 200P

2. **주문 B**: 5,000원 구매
   - 포인트 사용: 100P
   - 포인트 적립: 98P (4,900원의 2%)
   - 현재 잔액: 198P

3. **주문 A 환불**
   - 회수 시도: 200P
   - 현재 잔액: 198P
   - **예상 결과**: 198P만 회수 (부족 2P), 잔액 0P

### 검증 포인트
- ✅ Neon DB `users.total_points`: 0
- ✅ PlanetScale `user_points` 회수 내역: -198P
- ⚠️ 로그: "포인트 부족! 2P는 이미 사용되어 회수 불가"
- ✅ `reason`: "환불 포인트 부분 회수 (적립: 200P, 회수: 198P, 부족: 2P)"

---

## 시나리오 3: 포인트를 전액 사용한 경우

### 테스트 순서
1. **주문 A**: 10,000원 구매
   - 포인트 적립: 200P
   - 현재 잔액: 200P

2. **주문 B**: 5,000원 구매
   - 포인트 사용: 200P (전액 사용)
   - 포인트 적립: 96P (4,800원의 2%)
   - 현재 잔액: 96P

3. **주문 A 환불**
   - 회수 시도: 200P
   - 현재 잔액: 96P
   - **예상 결과**: 96P만 회수 (부족 104P), 잔액 0P

### 검증 포인트
- ✅ Neon DB `users.total_points`: 0
- ✅ PlanetScale `user_points` 회수 내역: -96P
- ⚠️ 로그: "포인트 부족! 104P는 이미 사용되어 회수 불가"

---

## 시나리오 4: 포인트를 초과 사용한 경우 (다른 주문 포인트 포함)

### 테스트 순서
1. **주문 A**: 10,000원 구매
   - 포인트 적립: 200P
   - 현재 잔액: 200P

2. **주문 B**: 5,000원 구매
   - 포인트 적립: 100P
   - 현재 잔액: 300P

3. **주문 C**: 20,000원 구매
   - 포인트 사용: 250P (A의 200P + B의 50P)
   - 포인트 적립: 350P (17,750원의 2%)
   - 현재 잔액: 400P

4. **주문 A 환불**
   - 회수 시도: 200P
   - 현재 잔액: 400P
   - **예상 결과**: 200P 전액 회수 성공, 잔액 200P

### 검증 포인트
- ✅ Neon DB `users.total_points`: 200
- ✅ PlanetScale `user_points` 회수 내역: -200P
- ✅ 로그: "포인트 회수 완료: 200P"

---

## 시나리오 5: 장바구니 주문 (여러 카테고리) 환불

### 테스트 순서
1. **주문 A** (장바구니: 팝업 + 투어):
   - 팝업 상품: 5,000원 → 100P 적립
   - 투어 상품: 3,000원 → 60P 적립
   - 총 적립: 160P
   - 현재 잔액: 160P

2. **주문 B**: 10,000원 구매
   - 포인트 사용: 150P
   - 현재 잔액: 10P + 새로 적립된 포인트

3. **주문 A 환불**
   - 회수 시도: 160P (팝업 100P + 투어 60P)
   - **예상 결과**:
     - 팝업 payment의 100P 회수 시도
     - 투어 payment의 60P 회수 시도
     - 실제 회수: 잔액만큼만 (부족하면 부분 회수)

### 검증 포인트
- ✅ 모든 카테고리 payment의 포인트 조회
- ✅ 각 payment마다 개별 회수 시도
- ✅ 총 회수 포인트 합산
- ✅ DB 일관성 유지

---

## 시나리오 6: 잔액 0P 상태에서 환불

### 테스트 순서
1. **주문 A**: 10,000원 구매
   - 포인트 적립: 200P
   - 현재 잔액: 200P

2. **주문 B**: 10,000원 구매
   - 포인트 사용: 200P (전액 사용)
   - 포인트 적립: 0P
   - 현재 잔액: 0P

3. **주문 A 환불**
   - 회수 시도: 200P
   - 현재 잔액: 0P
   - **예상 결과**: 0P 회수 (전액 부족), 잔액 0P

### 검증 포인트
- ✅ Neon DB `users.total_points`: 0
- ⚠️ user_points에 회수 내역 INSERT 안 함 (actualDeduction = 0)
- ⚠️ 로그: "회수할 포인트가 없음 (잔액 0P)"
- ⚠️ 로그: "포인트 부족! 200P는 이미 사용되어 회수 불가"

---

## 시나리오 7: 동시 다발적 환불 (동시성 테스트)

### 테스트 순서
1. **주문 A, B, C**: 각각 10,000원씩 구매
   - 총 적립: 600P
   - 현재 잔액: 600P

2. **주문 D**: 30,000원 구매
   - 포인트 사용: 500P
   - 현재 잔액: 100P + 새로 적립

3. **주문 A, B 동시 환불**
   - A 회수 시도: 200P
   - B 회수 시도: 200P
   - 총 회수 시도: 400P
   - 현재 잔액: 약 100P
   - **예상 결과**: FOR UPDATE 락으로 순차 처리, 총 100P만 회수

### 검증 포인트
- ✅ FOR UPDATE 락 작동
- ✅ 트랜잭션 순차 처리
- ✅ DB 불일치 없음
- ✅ 정확한 회수량 기록

---

## 검증 체크리스트

### DB 일관성
- [ ] Neon `users.total_points`와 PlanetScale `user_points` 합계 일치
- [ ] 음수 잔액 없음
- [ ] 회수 내역의 points 값이 실제 회수량과 일치

### 로그 검증
- [ ] 회수 계산 로그: "적립=XP, 현재잔액=YP, 실제회수=ZP"
- [ ] 부족 시 경고: "포인트 부족! XP는 이미 사용되어 회수 불가"
- [ ] 성공 로그: "포인트 회수 완료: XP"

### 비즈니스 로직
- [ ] 이미 사용된 포인트는 회수하지 않음
- [ ] 현재 잔액 이상으로 회수하지 않음
- [ ] 장바구니 주문의 모든 카테고리 포인트 회수
- [ ] 부분 회수 시 reason에 상세 정보 기록

---

## 테스트 방법

### 1. 로컬 테스트
```bash
# 주문 생성
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [...], "shippingInfo": {...}}'

# 결제 승인
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_xxx", "paymentKey": "xxx", "amount": 10000}'

# 환불 처리
curl -X POST http://localhost:3000/api/payments/refund \
  -H "Content-Type: application/json" \
  -d '{"paymentKey": "xxx", "cancelReason": "test"}'
```

### 2. DB 조회
```sql
-- Neon DB
SELECT id, email, total_points FROM users WHERE id = ?;

-- PlanetScale
SELECT * FROM user_points WHERE user_id = ? ORDER BY created_at DESC;
SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC;
```

### 3. 디버깅 엔드포인트
```bash
# 포인트 내역 조회
curl http://localhost:3000/api/admin/debug-points?payment_id=123

# 주문 정보 조회
curl http://localhost:3000/api/admin/debug-order?order_number=ORDER_xxx
```

---

## 알려진 제약사항

1. **부분 회수 시 손실 발생**
   - 적립된 포인트를 이미 사용한 경우, 환불 시 전액 회수 불가능
   - 이는 설계상 의도된 동작 (사용자가 이미 혜택을 받았으므로)

2. **회수 불가능한 포인트 추적 없음**
   - 현재는 경고 로그만 남김
   - 향후 개선: 회수 불가능한 포인트를 별도 테이블에 기록하여 관리자 리포트 생성

3. **포인트 사용 출처 추적 없음**
   - 어떤 적립 포인트를 사용했는지 추적하지 않음
   - FIFO 방식으로 가정 (먼저 적립된 포인트부터 사용)

---

## 개선 제안 (향후)

### 1. 포인트 사용 출처 추적
```sql
ALTER TABLE user_points ADD COLUMN source_earn_id INT;
```
- 포인트 사용 시 어떤 적립 포인트를 사용했는지 기록
- 환불 시 해당 포인트가 이미 사용되었는지 정확히 파악 가능

### 2. 회수 불가 포인트 리포트
```sql
CREATE TABLE unrecoverable_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  payment_id INT,
  earned_points INT,
  recovered_points INT,
  unrecoverable_points INT,
  created_at TIMESTAMP
);
```

### 3. 환불 시 사용자 알림
- 일부만 회수된 경우 사용자에게 알림
- "환불 처리되었습니다. 적립 포인트 중 이미 사용하신 XXP는 회수되지 않습니다."

---

## 문의

테스트 중 문제 발견 시:
1. Vercel 로그 확인
2. `/api/admin/debug-points` 엔드포인트로 포인트 내역 조회
3. DB 직접 조회하여 일관성 확인
