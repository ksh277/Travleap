# 팝업 시스템 배포 가이드 (쉬운 버전)

## 🎯 배포 전 필수 체크 3가지

### 1️⃣ 환경 변수 설정 (.env 파일)
이거 없으면 사이트 자체가 안 돌아갑니다!

```bash
# 필수 (이거 없으면 서버 터짐)
DATABASE_URL=mysql://...                  # DB 연결 주소
TOSS_MODE=test                            # test 또는 live
TOSS_SECRET_KEY_TEST=test_sk_...          # 토스 테스트 키
TOSS_WEBHOOK_SECRET_TEST=webhook_...      # 토스 웹훅 시크릿
VITE_BLOB_READ_WRITE_TOKEN=vercel_...     # 이미지 업로드용

# 선택 (있으면 좋음)
SLACK_WEBHOOK_URL=https://hooks.slack...  # 에러 알림받기
```

**✅ 확인 방법**:
```bash
# 터미널에서 이 명령어 실행
cat .env | grep "DATABASE_URL"
cat .env | grep "TOSS_SECRET_KEY"
cat .env | grep "TOSS_WEBHOOK_SECRET"
```
결과가 나오면 OK, 안 나오면 .env 파일에 추가하세요!

---

### 2️⃣ 데이터베이스 테이블 만들기 (마이그레이션)
SQL 파일을 **순서대로** 실행해야 합니다.

**필수 SQL 파일 (순서대로 실행)**:
```
1. database/phase1-core-tables.sql              (기본 테이블)
2. database/phase7-payment.sql                  (결제 테이블)
3. database/add-cart-support.sql                (장바구니)
4. database/create-coupons-table.sql            (쿠폰)
5. database/create-webhook-events-table.sql     (웹훅 멱등성)
6. database/phase10-1-booking-logs.sql          (주문 로그)
7. database/refund-policies-table.sql           (환불 정책)
```

**✅ 확인 방법**:
```sql
-- DB에서 이 쿼리 실행해보세요
SHOW TABLES LIKE 'coupons';
SHOW TABLES LIKE 'payment_events';
SHOW TABLES LIKE 'cart_items';
SHOW TABLES LIKE 'booking_logs';
```
4개 테이블 모두 나오면 OK, 하나라도 안 나오면 SQL 파일 실행 안 한 거예요!

---

### 3️⃣ 토스 페이먼츠 설정 (토스 개발자 센터)

**토스 개발자 센터에서 해야 할 것**:
1. **웹훅 URL 등록**: `https://yourdomain.com/api/payments/webhook`
2. **웹훅 시크릿 발급** → `.env` 파일에 `TOSS_WEBHOOK_SECRET_TEST=` 복붙
3. **결제 성공/실패 URL 등록**:
   - 성공: `https://yourdomain.com/payment-success`
   - 실패: `https://yourdomain.com/payment-fail`

**✅ 확인 방법**:
- 토스 개발자 센터 → 내 애플리케이션 → 웹훅 설정에서 URL이 등록되어 있는지 확인
- `.env` 파일에서 `TOSS_WEBHOOK_SECRET_TEST`가 있는지 확인

---

## 🛡️ 에러 Top 5 미리 방지하기

### 에러 1: 결제는 됐는데 주문이 안 생김
**왜 생기나?**: 토스 웹훅 URL을 등록 안 했거나, 시크릿이 틀림

**🔒 배포 전 방지법**:
```bash
# 1. 토스 개발자 센터에서 웹훅 URL 등록 확인
✅ https://yourdomain.com/api/payments/webhook 이 주소로 등록되어 있나요?

# 2. 웹훅 시크릿이 .env에 있는지 확인
cat .env | grep "TOSS_WEBHOOK_SECRET"

# 3. TEST 모드에서 100원 결제 테스트
- 결제 → 마이페이지에서 주문 내역 확인
- 주문이 "확정됨" 상태면 OK!
```

**✅ 이렇게 하면 안 생깁니다!**
- 배포 전에 TEST 모드에서 100원 결제 테스트 → 주문 확인 → 환불
- 이 과정을 거치면 웹훅이 제대로 작동하는지 확인됨

---

### 에러 2: 장바구니 페이지 열면 에러 (coupons 테이블 없음)
**왜 생기나?**: 데이터베이스 마이그레이션을 안 함

**🔒 배포 전 방지법**:
```sql
-- DB에 접속해서 이 쿼리 실행
SHOW TABLES LIKE 'coupons';
SHOW TABLES LIKE 'cart_items';
SHOW TABLES LIKE 'payment_events';
SHOW TABLES LIKE 'booking_logs';

-- 결과가 4개 다 나와야 함!
-- 하나라도 안 나오면 SQL 파일 실행:
-- database/create-coupons-table.sql
-- database/add-cart-support.sql
-- 등등...
```

**✅ 이렇게 하면 안 생깁니다!**
- 위의 "2️⃣ 데이터베이스 테이블 만들기" 섹션대로 SQL 파일 순서대로 실행
- 배포 후 장바구니 페이지 한 번 열어보기

---

### 에러 3: 환불이 안 됨
**왜 생기나?**: 토스 API 키가 틀리거나, 환불 정책 테이블이 없음

**🔒 배포 전 방지법**:
```bash
# 1. 토스 API 키 확인
cat .env | grep "TOSS_SECRET_KEY"
# test_sk_로 시작하면 테스트 키 OK!

# 2. 환불 정책 테이블 확인
```
```sql
SHOW TABLES LIKE 'refund_policies';
-- 결과 안 나오면 database/refund-policies-table.sql 실행
```

**✅ 이렇게 하면 안 생깁니다!**
- TEST 모드에서 100원 결제 → **즉시 환불 테스트**
- 환불 성공하면 토스 API 키 정상, 환불 로직 정상!

---

### 에러 4: 쿠폰 100개 한정인데 200개 사용됨
**왜 생기나?**: 동시성 제어 안 함 (오늘 수정해서 이제 안 생김!)

**🔒 배포 전 방지법**:
```bash
# 오늘 수정한 파일들이 배포되었는지 확인
# 파일: api/coupons.js, server-api.ts

# FOR UPDATE 락이 있는지 확인:
grep "FOR UPDATE" api/coupons.js
# 결과 나오면 OK! 안 나오면 최신 코드로 업데이트 필요
```

**✅ 이렇게 하면 안 생깁니다!**
- 오늘 수정한 코드가 포함된 버전으로 배포
- (이미 수정 완료되어 있음!)

---

### 에러 5: 재고 1개 남았는데 여러 명이 구매함
**왜 생기나?**: 재고 차감 시 동시성 제어 안 함 (오늘 수정해서 이제 안 생김!)

**🔒 배포 전 방지법**:
```bash
# 오늘 수정한 파일이 배포되었는지 확인
# 파일: server-api.ts

# FOR UPDATE 락이 있는지 확인:
grep "FOR UPDATE" server-api.ts
# 결과에 "SELECT stock" 관련 쿼리가 있으면 OK!
```

**✅ 이렇게 하면 안 생깁니다!**
- 오늘 수정한 코드가 포함된 버전으로 배포
- (이미 수정 완료되어 있음!)

---

## 🚀 배포 직전 최종 체크리스트

**배포 전 (이거 안 하면 에러남!)**:
```
[ ] 1. .env 파일 확인
    - DATABASE_URL 있나?
    - TOSS_SECRET_KEY_TEST 있나?
    - TOSS_WEBHOOK_SECRET_TEST 있나?
    - VITE_BLOB_READ_WRITE_TOKEN 있나?

[ ] 2. SQL 파일 모두 실행했나?
    - SHOW TABLES 해서 coupons, cart_items, payment_events, booking_logs 있나?

[ ] 3. 토스 개발자 센터 설정했나?
    - 웹훅 URL 등록했나?
    - 웹훅 시크릿 .env에 넣었나?
    - 성공/실패 URL 등록했나?

[ ] 4. TEST 모드에서 테스트했나?
    - 100원 결제 → 주문 확인 → 환불까지 성공?
```

**배포 후 (5분 안에 확인)**:
```
[ ] 1. 사이트 열리나? (500 에러 안 나나?)
[ ] 2. 장바구니 페이지 열리나?
[ ] 3. 쿠폰 목록 보이나?
[ ] 4. 100원 테스트 결제 → 주문 확인 → 환불 (전체 플로우 테스트)
[ ] 5. 서버 로그 확인 (에러 없나?)
```

---

## 🔥 긴급 상황 대응 (만약 실수했다면)

### 상황 1: 결제는 됐는데 주문이 안 보여요
**응급 처치**:
```
1. 토스 개발자 센터 → 결제 내역에서 paymentKey 확인
2. DB에서 SELECT * FROM bookings WHERE booking_number = '주문번호';
3. 없으면 수동 생성:
   INSERT INTO bookings (booking_number, user_id, status, payment_status, ...)
4. 고객에게 "처리 완료했습니다" 연락
```

**근본 해결**: 토스 웹훅 URL 등록 + 시크릿 확인 후 재배포

---

### 상황 2: 장바구니 페이지 열면 에러나요
**응급 처치**:
```sql
-- 즉시 SQL 파일 실행
database/create-coupons-table.sql
database/add-cart-support.sql
database/create-webhook-events-table.sql
database/phase10-1-booking-logs.sql
```

**근본 해결**: 마이그레이션 자동화 스크립트 만들기 (다음에)

---

### 상황 3: 환불이 안 돼요
**응급 처치**:
```
1. 토스 개발자 센터 → 결제 내역 확인
2. 수동 환불 버튼 클릭
3. DB에 기록:
   UPDATE bookings SET status = 'cancelled' WHERE id = 주문ID;
   INSERT INTO booking_logs (booking_id, action, details) VALUES (...);
4. 고객에게 "환불 완료" 연락
```

**근본 해결**: 환불 API 로그 확인, 토스 API 키 재확인

---

### 상황 4: 테스트 결제가 실제 결제로 나갔어요!
**응급 처치**:
```
1. 즉시 환불!
2. .env 파일 확인:
   TOSS_MODE=test (test여야 함!)
   TOSS_SECRET_KEY는 test_sk_로 시작해야 함!
3. 확인 후 재배포
```

**근본 해결**:
- 환경 변수 자동 검증 추가
- LIVE 모드는 수동 배포만 가능하게 설정

---

## 🛠️ 오늘 수정한 내용 (이미 적용됨!)

### 1. 배송 상태 동시 변경 방지 ✅
관리자 2명이 동시에 배송 상태 바꿔도 안 꼬임
**파일**: `api/bookings/[id]/shipping.js`

### 2. 장바구니에 이상한 상품 못 담게 함 ✅
삭제된 상품, 품절 상품은 장바구니 추가 차단
**파일**: `api/cart.js`

### 3. 한글 이미지 파일명 지원 ✅
"상품사진.jpg" 같은 한글 이름도 정상 작동
**파일**: `components/figma/ImageWithFallback.tsx`

### 4. 쿠폰 동시 사용 방지 ✅
100개 한정 쿠폰은 정확히 100명만 사용 가능
**파일**: `api/coupons.js`, `server-api.ts`

### 5. 재고 동시 구매 방지 ✅
남은 재고 1개면 1명만 구매 가능, overselling 방지
**파일**: `server-api.ts`

---

## 📞 핵심 요약 (3줄)

1. **환경 변수** (.env) 설정 + **SQL 마이그레이션** + **토스 웹훅 등록** = 이 3개만 하면 80% 완료
2. **배포 전 TEST 모드에서 100원 결제 테스트** = 이거 성공하면 거의 다 됨
3. **에러는 배포 후 대응보다 배포 전 방지가 1000배 쉬움** = 위 체크리스트 꼭 확인!

**이 가이드대로만 하면 에러 안 생깁니다!** 🎉

---

**작성일**: 2025-10-27
**업데이트**: 에러 방지법 중심으로 재작성
**문의**: 이해 안 되는 부분 있으면 물어보세요!
