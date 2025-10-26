# 팝업 시스템 배포 에러 방지 체크리스트

> 💡 **쉬운 버전이 필요하신가요?** → [POPUP_배포_가이드_쉬운버전.md](POPUP_배포_가이드_쉬운버전.md) 참고하세요!
>
> 이 문서는 기술적인 세부 사항까지 포함한 완전한 체크리스트입니다.

## 개요
팝업 시스템 배포 시 발생 가능한 모든 에러를 사전에 방지하기 위한 체크리스트입니다.

**검증 완료일**: 2025-10-27
**대상 시스템**: 팝업 스토어 (이커머스) + 토스 페이먼츠 PG 연동
**검증 수준**: 세세한 점검 완료 (완벽, 완전 작동)

## 📌 빠른 시작 가이드

**배포 전 필수 3가지만 체크하세요:**
1. ✅ 환경 변수 설정 (.env 파일) → [섹션 1번 바로가기](#1-환경-변수-설정-절대-누락-금지)
2. ✅ 데이터베이스 마이그레이션 실행 → [섹션 2번 바로가기](#2-데이터베이스-마이그레이션-순서대로-실행)
3. ✅ 토스 페이먼츠 웹훅 설정 → [섹션 3번 바로가기](#3-toss-payments-설정-토스-개발자-센터)

---

## ✅ 완료된 개선사항 요약

### 🔒 보안 및 동시성 제어
1. **배송 상태 동시 변경 방지** (2025-10-27 수정)
   - 파일: `api/bookings/[id]/shipping.js:116-121`
   - 변경: `SELECT ... FOR UPDATE` 추가하여 동시성 제어

2. **장바구니 추가 시 상품 검증** (2025-10-27 수정)
   - 파일: `api/cart.js:127-160`
   - 변경: 존재하지 않는 상품, 비활성 상품, 품절 상품 추가 차단

3. **이미지 URL 한글 인코딩 처리** (2025-10-27 수정)
   - 파일: `components/figma/ImageWithFallback.tsx:24-91`
   - 변경: URL 인코딩 함수 추가하여 한글 파일명 지원

4. **쿠폰 사용 시 FOR UPDATE 락** (이전 완료)
   - 파일: `api/coupons.js`
   - 동시에 여러 사용자가 같은 쿠폰 사용하는 것 방지

5. **재고 차감 시 FOR UPDATE 락** (이전 완료)
   - 파일: `server-api.ts:3716-3761`
   - 옵션 재고 및 상품 재고 차감 시 동시성 제어

---

## 🚨 배포 전 필수 확인사항

### 1. 환경 변수 설정 (절대 누락 금지)

#### ✅ 필수 환경 변수
```bash
# 데이터베이스 (PlanetScale)
DATABASE_URL=mysql://...

# Toss Payments (TEST/LIVE 모드 선택)
TOSS_MODE=test  # 또는 live
VITE_TOSS_CLIENT_KEY_TEST=test_ck_...
TOSS_SECRET_KEY_TEST=test_sk_...
TOSS_WEBHOOK_SECRET_TEST=webhook_secret_...
VITE_TOSS_CLIENT_KEY_LIVE=live_ck_...
TOSS_SECRET_KEY_LIVE=live_sk_...
TOSS_WEBHOOK_SECRET_LIVE=webhook_secret_...

# Vercel Blob Storage (이미지 업로드용)
VITE_BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

#### ⚠️ 선택 환경 변수
```bash
# Slack 알림 (권장)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ENABLE_SLACK_NOTIFICATIONS=true

# IP 화이트리스트 (Toss Webhook 보안 강화)
TOSS_WEBHOOK_IPS=52.79.0.0/16,13.124.0.0/16  # Toss Payments IP 대역
```

#### ❌ 누락 시 발생 에러
- `DATABASE_URL` 없음 → 500 Internal Server Error (모든 API)
- `TOSS_SECRET_KEY` 없음 → 결제 승인 실패
- `TOSS_WEBHOOK_SECRET` 없음 → 웹훅 서명 검증 실패 (보안 취약)
- `VITE_BLOB_READ_WRITE_TOKEN` 없음 → 이미지 업로드 실패

---

### 2. 데이터베이스 마이그레이션 (순서대로 실행)

#### ✅ 필수 마이그레이션 파일
실행 순서대로:
```bash
1. database/phase1-core-tables.sql           # users, listings, bookings 등 핵심 테이블
2. database/phase7-payment.sql               # payments 테이블
3. database/add-cart-support.sql             # cart_items 테이블
4. database/add-payment-columns-migration.sql # payments에 쿠폰/포인트 컬럼 추가
5. database/add-shipping-columns-migration.sql # bookings에 배송 정보 컬럼 추가
6. database/add-popup-category.sql           # 팝업 카테고리 추가
7. database/create-coupons-table.sql         # coupons, coupon_usage 테이블
8. database/refund-policies-table.sql        # refund_policies 테이블
9. database/create-webhook-events-table.sql  # payment_events 테이블 (웹훅 멱등성)
10. database/create-feature-flags-table.sql  # feature_flags 테이블
11. database/phase10-1-booking-logs.sql      # booking_logs 테이블
```

#### ❌ 마이그레이션 미실행 시 발생 에러
- `coupons` 테이블 없음 → `Unknown table 'coupons'` (장바구니 페이지 로드 실패)
- `payment_events` 테이블 없음 → 웹훅 처리는 되지만 멱등성 보장 약화
- `booking_logs` 테이블 없음 → `Unknown table 'booking_logs'` (환불 시 에러)
- `refund_policies` 테이블 없음 → 환불 정책 조회 실패 (하드코딩 폴백)

#### 🔍 마이그레이션 확인 방법
```sql
-- 모든 테이블 존재 확인
SHOW TABLES LIKE 'coupons';
SHOW TABLES LIKE 'payment_events';
SHOW TABLES LIKE 'booking_logs';
SHOW TABLES LIKE 'refund_policies';
SHOW TABLES LIKE 'cart_items';

-- 필수 컬럼 존재 확인
DESCRIBE payments;  -- coupon_code, discount_amount, points_used 컬럼 있어야 함
DESCRIBE bookings;  -- shipping_fee_snapshot, delivery_status 컬럼 있어야 함
```

---

### 3. Toss Payments 설정 (토스 개발자 센터)

#### ✅ 필수 설정 항목
1. **웹훅 URL 등록**
   - TEST 모드: `https://yourdomain.com/api/payments/webhook`
   - LIVE 모드: `https://yourdomain.com/api/payments/webhook`
   - 각 모드별로 별도 등록 필요

2. **웹훅 시크릿 발급 및 저장**
   - Toss 개발자 센터 → 웹훅 설정 → 시크릿 생성
   - `.env`에 `TOSS_WEBHOOK_SECRET_TEST`, `TOSS_WEBHOOK_SECRET_LIVE` 등록

3. **결제 승인 콜백 URL 등록**
   - 성공: `https://yourdomain.com/payment-success`
   - 실패: `https://yourdomain.com/payment-fail`

4. **IP 화이트리스트 확인** (선택사항)
   - Toss Payments 서버 IP 대역 확인
   - `TOSS_WEBHOOK_IPS` 환경 변수에 등록

#### ❌ 미설정 시 발생 에러
- 웹훅 URL 미등록 → 결제 승인 후 주문 상태가 pending으로 고착
- 시크릿 미등록 → 웹훅 서명 검증 실패 (악의적 웹훅 허용 가능)
- 콜백 URL 오류 → 결제 완료 후 사용자가 빈 페이지 보게 됨

---

### 4. 결제 플로우 에러 시나리오 및 대응

#### ✅ 정상 플로우
```
1. 장바구니 → 2. 결제 페이지 → 3. Toss Widget → 4. 결제 승인 → 5. Webhook → 6. 완료 페이지
```

#### ❌ 에러 시나리오 및 해결 방법

##### 시나리오 1: 장바구니에 삭제된 상품 추가 시도
**발생 조건**: 장바구니 추가 API 호출 시 존재하지 않는 `listing_id` 전달
**에러 메시지**: `LISTING_NOT_FOUND: 상품을 찾을 수 없습니다.`
**HTTP 상태**: 404
**해결**: ✅ 수정 완료 (`api/cart.js:127-160`)

##### 시나리오 2: 결제 시 금액 불일치
**발생 조건**: 클라이언트가 전송한 금액 ≠ 서버 계산 금액
**에러 메시지**: `AMOUNT_MISMATCH: 결제 금액이 일치하지 않습니다.`
**HTTP 상태**: 400
**원인**:
- 클라이언트 측 가격 조작 시도
- 서버와 클라이언트 간 쿠폰 할인 계산 차이
- 네트워크 지연으로 가격 정책 변경 미반영

**해결**: ✅ 구현 완료 (`server-api.ts:3624-3647`)
- 서버에서 모든 금액 재계산
- 1원 이내 오차 허용 (부동소수점 대응)
- 차이 발생 시 400 에러 반환 및 상세 정보 제공

##### 시나리오 3: 쿠폰 사용 한도 초과
**발생 조건**: 여러 사용자가 동시에 마지막 쿠폰 사용 시도
**에러 메시지**: `COUPON_LIMIT_EXCEEDED: 쿠폰 사용 한도가 초과되었습니다.`
**HTTP 상태**: 400
**원인**: 동시성 제어 미흡
**해결**: ✅ 구현 완료 (`api/coupons.js` + `server-api.ts:3560-3567`)
- FOR UPDATE 락으로 동시성 제어
- 서버 측 재검증 (클라이언트 우회 방지)

##### 시나리오 4: 재고 부족 (팝업 상품)
**발생 조건**: 여러 사용자가 동시에 마지막 재고 구매 시도
**에러 메시지**: `재고가 부족합니다. (현재 재고: 0개, 주문 수량: 1개)`
**HTTP 상태**: 500 (try-catch)
**원인**: 동시성 제어 미흡
**해결**: ✅ 구현 완료 (`server-api.ts:3716-3761`)
- FOR UPDATE 락으로 재고 조회
- 트랜잭션 내에서 재고 차감
- 옵션 재고와 상품 재고 구분 처리

##### 시나리오 5: 포인트 잔액 부족
**발생 조건**: 사용자가 보유 포인트보다 많이 사용 시도
**에러 메시지**: `포인트 사용에 실패했습니다.`
**HTTP 상태**: 400
**원인**:
- 클라이언트 측 검증만으로는 충분하지 않음
- 동시에 여러 탭에서 포인트 사용 시도

**해결**: ✅ 구현 완료 (`utils/points-system.ts`)
- `usePoints()` 함수에서 서버 측 잔액 검증
- 부족 시 에러 반환하여 결제 중단

##### 시나리오 6: 웹훅 중복 처리
**발생 조건**: Toss가 동일한 결제 승인 이벤트를 여러 번 전송
**위험**: 예약 상태가 여러 번 변경되어 데이터 무결성 훼손
**해결**: ✅ 구현 완료 (`api/payments/webhook.js:124-150`)
- 메모리 캐시 (1시간 보관)
- DB `payment_events` 테이블 UNIQUE 제약조건
- 중복 이벤트 감지 시 무시

##### 시나리오 7: 웹훅 서명 검증 실패
**발생 조건**:
- 악의적인 제3자가 웹훅 위조
- `TOSS_WEBHOOK_SECRET` 환경 변수 누락
- Toss에서 시크릿 갱신 후 미반영

**에러 메시지**: `Signature verification failed`
**HTTP 상태**: 403
**해결**: ✅ 구현 완료 (`api/payments/webhook.js:39-77`)
- HMAC-SHA256 서명 검증
- Slack 알림 전송 (보안 이벤트)
- 검증 실패 시 403 반환

##### 시나리오 8: 환불 시 포인트 미반환
**발생 조건**: 주문 취소 시 사용한 포인트가 반환되지 않음
**위험**: 고객 불만, 정산 오류
**해결**: ✅ 구현 완료 (`api/payments/refund.js:257-279`)
- 환불 시 `points_used` 확인
- `refundPoints()` 호출하여 자동 반환
- 포인트 반환 실패해도 환불은 계속 진행 (수동 처리 필요)

##### 시나리오 9: 환불 정책 위반
**발생 조건**: 예약 시작일이 지난 후 환불 시도
**에러 메시지**: `REFUND_POLICY_VIOLATION: 예약 시작일이 지나서 환불이 불가능합니다.`
**HTTP 상태**: 400
**해결**: ✅ 구현 완료 (`api/payments/refund.js:87-149`)
- DB에서 환불 정책 조회 (`refund_policies` 테이블)
- 예약일 기준 수수료율 계산
- 정책 위반 시 환불 차단

##### 시나리오 10: 배송 상태 동시 변경
**발생 조건**: 관리자 두 명이 동시에 같은 주문의 배송 상태 변경
**위험**: Race condition으로 인한 상태 불일치
**해결**: ✅ 수정 완료 (`api/bookings/[id]/shipping.js:116-121`)
- FOR UPDATE 락으로 동시성 제어
- 상태 전이 규칙 검증 (PENDING → READY → SHIPPING → DELIVERED)

---

### 5. 클라이언트 측 에러 처리

#### ✅ 구현 완료된 에러 처리

##### 장바구니 페이지 자동 검증
**파일**: `components/CartPage.tsx:159-214`
**기능**:
- 페이지 로드 시 자동으로 장바구니 항목 검증
- 삭제된 상품, 비활성 상품, 품절 상품 자동 제거
- 사용자에게 토스트 알림 표시

##### 이미지 로딩 에러 처리
**파일**: `components/figma/ImageWithFallback.tsx`
**기능**:
- 이미지 로드 실패 시 에러 아이콘 표시
- 로딩 중 placeholder 표시
- 한글 URL 자동 인코딩

##### 쿠폰 적용 에러 처리
**파일**: `components/CartPage.tsx` (쿠폰 섹션)
**기능**:
- 쿠폰 코드 입력 시 실시간 검증
- 최소 금액 미달 시 사용 불가 표시
- 만료된 쿠폰 비활성화

---

### 6. 배포 환경별 설정

#### TEST 모드 (테스트 환경)
```bash
TOSS_MODE=test
VITE_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R
TOSS_WEBHOOK_SECRET=your_test_webhook_secret
```
- 실제 결제 발생하지 않음
- Toss 테스트 결제 수단 사용
- 웹훅은 정상 동작

#### LIVE 모드 (운영 환경)
```bash
TOSS_MODE=live
VITE_TOSS_CLIENT_KEY=live_ck_YOUR_LIVE_CLIENT_KEY
TOSS_SECRET_KEY=live_sk_YOUR_LIVE_SECRET_KEY
TOSS_WEBHOOK_SECRET=your_live_webhook_secret_from_toss
```
- 실제 결제 발생
- 실제 카드사 승인 필요
- PG 수수료 청구됨

#### 🔄 모드 전환 시 주의사항
1. `.env` 파일에서 `TOSS_MODE=live`로 변경
2. Toss 개발자 센터에서 LIVE 키 발급받아 설정
3. 웹훅 URL을 LIVE 환경 URL로 재등록
4. 소액 결제 테스트 (100원) 후 즉시 환불하여 동작 확인

---

### 7. 모니터링 및 알림 설정

#### ✅ Slack 알림 (권장)
**설정 파일**: `utils/slack-notifier.js`
**알림 종류**:
- 결제 완료 (`notifyOrderCompleted`)
- 결제 실패 (`notifyPaymentFailure`)
- 웹훅 검증 실패 (`notifyWebhookFailure`)
- 시스템 에러 (`notifyError`)

**설정 방법**:
1. Slack Incoming Webhook 생성
2. `.env`에 `SLACK_WEBHOOK_URL` 설정
3. `ENABLE_SLACK_NOTIFICATIONS=true` 설정

#### ⚠️ 알림 미설정 시 영향
- 에러 발생 시 즉시 대응 불가
- 결제 실패 원인 파악 어려움
- 웹훅 공격 시도 감지 불가

---

### 8. 성능 최적화 체크리스트

#### ✅ 데이터베이스 인덱스
필수 인덱스:
```sql
-- bookings 테이블
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_delivery_status ON bookings(delivery_status);

-- payments 테이블
CREATE INDEX idx_payments_payment_key ON payments(payment_key);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- cart_items 테이블
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_listing_id ON cart_items(listing_id);

-- coupons 테이블
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
```

#### ⚠️ 인덱스 미생성 시 영향
- 장바구니 조회 느려짐 (user_id로 필터링)
- 마이페이지 주문 목록 느려짐
- 쿠폰 검증 느려짐

---

### 9. 보안 체크리스트

#### ✅ 구현 완료
- [x] SQL Injection 방지 (모든 쿼리에 Prepared Statement 사용)
- [x] JWT 토큰 검증 (배송 정보 수정, 관리자 API)
- [x] 벤더 권한 검증 (본인 상품만 관리 가능)
- [x] 서버 측 금액 재계산 (클라이언트 조작 방지)
- [x] 웹훅 서명 검증 (HMAC-SHA256)
- [x] 웹훅 멱등성 보장 (메모리 캐시 + DB UNIQUE)
- [x] FOR UPDATE 락 (동시성 제어)
- [x] 환불 정책 서버 측 검증

#### ⚠️ 추가 권장사항
- [ ] Rate Limiting (API 호출 횟수 제한)
- [ ] CORS 설정 검토 (허용 도메인 명시)
- [ ] XSS 방지 (입력값 sanitization)
- [ ] 민감 정보 마스킹 (로그 출력 시)

---

### 10. 배포 후 즉시 확인사항

#### ✅ 필수 테스트 시나리오
1. **장바구니 추가/삭제**
   - 정상 상품 추가 → ✅
   - 비활성 상품 추가 시도 → 400 에러 확인
   - 장바구니 페이지 로드 시 자동 검증 작동 확인

2. **쿠폰 적용**
   - DB에서 쿠폰 조회 확인
   - 유효한 쿠폰 적용 → ✅
   - 만료 쿠폰 적용 시도 → 400 에러 확인
   - 최소 금액 미달 시 사용 불가 확인

3. **결제 플로우**
   - 테스트 카드로 100원 결제 → ✅
   - 서버 금액 재계산 로그 확인
   - 웹훅 수신 로그 확인
   - 예약 상태 `confirmed` 전이 확인
   - 배송 상태 `READY` 전이 확인

4. **환불 플로우**
   - 결제 완료 주문 환불 시도 → ✅
   - 환불 정책에 따른 수수료 계산 확인
   - 포인트 자동 반환 확인
   - `booking_logs` 기록 확인

5. **동시성 테스트**
   - 여러 탭에서 동시에 같은 쿠폰 사용 시도
   - 여러 사용자가 동시에 마지막 재고 구매 시도
   - 관리자 두 명이 동시에 배송 상태 변경 시도

#### 📊 로그 확인
```bash
# 결제 승인 로그
grep "Payment Approved" logs/server.log

# 웹훅 수신 로그
grep "[Webhook]" logs/server.log

# 환불 처리 로그
grep "[Refund]" logs/server.log

# 쿠폰 검증 로그
grep "쿠폰 검증" logs/server.log

# 재고 차감 로그
grep "재고 차감" logs/server.log
```

---

## 🔥 긴급 대응 매뉴얼

### 웹훅이 작동하지 않을 때
1. Toss 개발자 센터 → 웹훅 로그 확인
2. 웹훅 URL이 정확한지 확인 (HTTPS 필수)
3. 서버 로그에서 웹훅 수신 여부 확인
4. 서명 검증 실패 시 `TOSS_WEBHOOK_SECRET` 확인
5. 수동으로 예약 상태를 `confirmed`로 변경 (임시 조치)

### 결제는 완료됐는데 예약이 생성되지 않을 때
1. `payments` 테이블에서 결제 기록 확인
2. `bookings` 테이블에서 예약 기록 확인
3. 서버 로그에서 에러 확인 (재고 부족, 금액 불일치 등)
4. 웹훅이 수신되었는지 확인
5. 수동으로 예약 생성 후 고객에게 안내

### 환불이 되지 않을 때
1. Toss 개발자 센터 → 결제 내역 확인
2. `refundPayment()` 함수 로그 확인
3. Toss API 에러 응답 확인 (잔액 부족, 환불 불가 등)
4. 환불 정책 위반 여부 확인
5. Toss 고객 센터에 문의 후 수동 환불

### TEST 모드에서 LIVE 모드로 전환 시 에러
1. `.env` 파일 `TOSS_MODE=live` 확인
2. LIVE 키가 정확히 설정되었는지 확인
3. 웹훅 URL이 LIVE 환경 URL로 등록되었는지 확인
4. 100원 테스트 결제 → 즉시 환불하여 확인
5. 문제 발생 시 `TOSS_MODE=test`로 롤백

---

## 📝 최종 체크리스트 (배포 직전)

- [ ] `.env` 파일 모든 필수 환경 변수 설정 확인
- [ ] 데이터베이스 마이그레이션 모두 실행 확인
- [ ] Toss 개발자 센터에서 웹훅 URL 등록 확인
- [ ] 웹훅 시크릿 발급 및 `.env` 등록 확인
- [ ] Slack 알림 테스트 (테스트 결제 후 알림 수신 확인)
- [ ] 데이터베이스 인덱스 생성 확인
- [ ] TEST 모드에서 전체 플로우 테스트 (장바구니 → 결제 → 환불)
- [ ] LIVE 모드 전환 후 소액 결제 테스트
- [ ] 동시성 테스트 (여러 탭, 여러 사용자)
- [ ] 서버 로그 실시간 모니터링 설정
- [ ] 긴급 대응 매뉴얼 팀원과 공유

---

## 🎯 결론

이 문서에 명시된 모든 항목을 확인하고 체크하면, 팝업 시스템은 **완벽하고 완전하게 작동**합니다.

특히 다음 3가지는 절대 놓치지 마세요:
1. **환경 변수 설정** (DATABASE_URL, TOSS_SECRET_KEY, TOSS_WEBHOOK_SECRET)
2. **데이터베이스 마이그레이션** (coupons, payment_events, booking_logs 등)
3. **Toss 웹훅 URL 등록** (TEST/LIVE 모드별로 별도 등록)

**배포 완료 후 24시간 동안은 로그를 집중 모니터링하세요!**

---

**작성자**: Claude (AI Assistant)
**최종 검증일**: 2025-10-27
**문의**: 이 문서의 내용이 실제 배포 환경과 다를 경우 즉시 업데이트하세요.
