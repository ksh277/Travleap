# 🧪 수동 테스트 가이드

## 📋 테스트 순서

### 1️⃣ 개발 서버 확인
현재 서버가 실행 중입니다:
- **URL**: http://localhost:5176
- **상태**: ✅ 실행 중
- **빌드**: ✅ 성공

---

## 🧪 테스트 1: Lock Manager 동작 확인

### 목표:
두 명의 사용자가 동시에 같은 상품/날짜를 예약할 때, 한 명만 성공하고 다른 한 명은 차단되는지 확인

### 단계:

1. **브라우저 2개 탭 열기**
   - 탭 1: http://localhost:5176
   - 탭 2: http://localhost:5176 (시크릿 모드 또는 다른 브라우저)

2. **두 탭 모두 로그인**
   ```javascript
   // 개발자 콘솔에서 실행 (F12)
   localStorage.setItem('user', JSON.stringify({
     id: 1,
     email: 'test@example.com',
     name: '테스트 사용자',
     role: 'user'
   }));
   location.reload();
   ```

3. **같은 숙소 선택**
   - 홈페이지에서 "숙박" 카테고리 선택
   - 같은 숙소 클릭 (예: "통합 테스트 호텔")

4. **같은 날짜/인원 선택**
   - 날짜: 2025-10-16 (또는 원하는 미래 날짜)
   - 인원: 성인 2명

5. **동시에 "예약하기" 클릭**
   - 탭 1과 탭 2에서 거의 동시에 예약하기 버튼 클릭
   - **중요**: 최대한 동시에 클릭해야 함

### 예상 결과:

**✅ 성공 케이스 (한 탭):**
```
🔒 예약 시도: booking:236:2025-10-16 (테스트 사용자A)
✅ Lock 획득: booking:236:2025-10-16
📊 재고 확인: Listing 236, Date 2025-10-16
✅ 재고 확인 완료: 0/10 사용 중
💾 HOLD 예약 생성 중...
✅ 예약 ID 123 생성됨 (HOLD 상태)
🎉 예약 생성 완료: BK-20251013-A3F9G2
🔓 Lock 해제: booking:236:2025-10-16
```

**❌ 실패 케이스 (다른 탭):**
```
🔒 예약 시도: booking:236:2025-10-16 (테스트 사용자B)
⏳ Lock 실패: booking:236:2025-10-16 - 다른 사용자가 예약 진행 중
🔓 Lock 해제: booking:236:2025-10-16
```

**Toast 메시지:**
- 성공: "예약이 생성되었습니다! 10분 이내에 결제를 완료해주세요."
- 실패: "다른 사용자가 이 상품을 예약 진행 중입니다. 잠시 후 다시 시도해주세요."

---

## 🧪 테스트 2: 결제 페이지 확인

### 목표:
PaymentWidget이 올바르게 표시되고, HOLD 경고가 나타나는지 확인

### 단계:

1. **위 테스트 1에서 성공한 탭 사용**

2. **결제 페이지로 자동 이동 확인**
   - URL이 `/payment?bookingId=123&bookingNumber=BK-20251013-A3F9G2&...`로 변경됨

3. **페이지 요소 확인**
   - ✅ 예약 정보 표시
   - ✅ 예약번호: `BK-20251013-A3F9G2`
   - ✅ HOLD 경고 메시지:
     ```
     ⚠️ 예약 대기 중
     10분 이내에 결제를 완료하지 않으면 예약이 자동 취소됩니다.
     ```
   - ✅ Toss Payments 위젯 로드

4. **개발자 콘솔 확인**
   - PaymentWidget 초기화 로그
   - 에러 없음

### 예상 화면:

```
┌────────────────────────────────────────┐
│ 예약 정보                               │
├────────────────────────────────────────┤
│ 통합 테스트 호텔                        │
│ 📅 2025-10-16                          │
│ 👥 2명                                 │
│ 🎫 예약번호: BK-20251013-A3F9G2        │
│                                        │
│ ⚠️ 예약 대기 중                        │
│ 10분 이내에 결제를 완료하지 않으면      │
│ 예약이 자동 취소됩니다.                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 결제 요약                               │
├────────────────────────────────────────┤
│ 상품 금액      150,000원               │
│ 수수료                0원               │
│ ───────────────────────────────        │
│ 총 결제 금액  150,000원                │
│                                        │
│ 🛡️ 안전한 결제                         │
│ SSL 암호화로 보호되는 안전한 결제입니다.│
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ [Toss Payments 위젯]                   │
│ • 카드 결제                             │
│ • 계좌 이체                             │
│ • 가상계좌                              │
│                                        │
│ [  150,000원 결제하기  ]               │
└────────────────────────────────────────┘
```

---

## 🧪 테스트 3: 데이터베이스 확인

### 목표:
DB에 HOLD 상태 예약이 올바르게 생성되었는지 확인

### 단계:

브라우저 개발자 콘솔에서 실행:

```javascript
// DB 조회 스크립트
fetch('/api/bookings?status=pending')
  .then(r => r.json())
  .then(data => {
    console.table(data);
  });
```

또는 Node.js 스크립트:

```bash
cd C:\Users\ham57\Desktop\Travleap
node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); (async () => { const c = await mysql.createConnection({ host: process.env.DATABASE_HOST, user: process.env.DATABASE_USERNAME, password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME, ssl: { rejectUnauthorized: false } }); const [rows] = await c.query('SELECT id, booking_number, status, payment_status, total_amount, hold_expires_at FROM bookings ORDER BY created_at DESC LIMIT 5'); console.table(rows); await c.end(); })()"
```

### 예상 결과:

```
┌─────┬──────┬─────────────────────┬──────────┬────────────────┬──────────────┬─────────────────────┐
│ idx │  id  │  booking_number     │  status  │ payment_status │ total_amount │   hold_expires_at   │
├─────┼──────┼─────────────────────┼──────────┼────────────────┼──────────────┼─────────────────────┤
│  0  │ 123  │ BK-20251013-A3F9G2  │ pending  │    pending     │   150000     │ 2025-10-13 14:25:00 │
└─────┴──────┴─────────────────────┴──────────┴────────────────┴──────────────┴─────────────────────┘
```

**확인 사항:**
- ✅ `status = 'pending'` (HOLD 상태)
- ✅ `payment_status = 'pending'`
- ✅ `hold_expires_at`이 현재 시간 + 10분
- ✅ `booking_number`이 `BK-` 형식

---

## 🧪 테스트 4: 예약 로그 확인

### 단계:

```bash
node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); (async () => { const c = await mysql.createConnection({ host: process.env.DATABASE_HOST, user: process.env.DATABASE_USERNAME, password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME, ssl: { rejectUnauthorized: false } }); const [rows] = await c.query('SELECT * FROM booking_logs ORDER BY created_at DESC LIMIT 5'); rows.forEach(r => { console.log('예약ID:', r.booking_id, '액션:', r.action, '시간:', r.created_at); console.log('상세:', JSON.parse(r.details)); console.log('---'); }); await c.end(); })()"
```

### 예상 결과:

```
예약ID: 123 액션: CREATED 시간: 2025-10-13 14:15:00
상세: {
  booking_number: 'BK-20251013-A3F9G2',
  listing_id: 236,
  guest_name: '테스트 사용자A',
  start_date: '2025-10-16',
  total_amount: 150000,
  lock_key: 'booking:236:2025-10-16'
}
---
```

---

## 🧪 테스트 5: 결제 흐름 (선택적)

### ⚠️ 주의:
실제 결제 테스트는 Toss Payments 테스트 API 키를 사용합니다.
실제 결제가 발생하지 않지만, 신중하게 진행하세요.

### 단계:

1. **PaymentWidget에서 결제 방법 선택**
   - 카드 결제 선택

2. **테스트 카드 정보 입력**
   ```
   카드번호: 4000-0000-0000-0000 (Toss 테스트 카드)
   유효기간: 12/25
   CVC: 123
   ```

3. **결제 버튼 클릭**

4. **Toss 승인 페이지 확인**
   - 리다이렉트됨
   - 승인 완료

5. **성공 페이지로 이동**
   - URL: `/payment/success2?bookingId=123`
   - 예약 확정 메시지 표시

6. **DB 상태 변경 확인**
   ```bash
   node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); (async () => { const c = await mysql.createConnection({ host: process.env.DATABASE_HOST, user: process.env.DATABASE_USERNAME, password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME, ssl: { rejectUnauthorized: false } }); const [rows] = await c.query('SELECT id, booking_number, status, payment_status FROM bookings WHERE id = 123'); console.table(rows); await c.end(); })()"
   ```

### 예상 결과:

```
status: 'pending' → 'confirmed'
payment_status: 'pending' → 'paid'
```

---

## ✅ 테스트 체크리스트

### 기능 테스트:
- [ ] Lock Manager 동작 (동시 예약 차단)
- [ ] HOLD 예약 생성
- [ ] 예약번호 생성 (`BK-YYYYMMDD-XXXXXX`)
- [ ] PaymentWidget 표시
- [ ] HOLD 경고 메시지
- [ ] DB에 정확한 데이터 저장
- [ ] 예약 로그 기록

### 에러 핸들링:
- [ ] Lock 실패 시 에러 메시지
- [ ] 재고 부족 시 에러 메시지
- [ ] 인원 초과 시 에러 메시지

### 결제 (선택적):
- [ ] PaymentWidget 초기화
- [ ] 결제 승인 프로세스
- [ ] 상태 전환 (HOLD → CONFIRMED)
- [ ] 성공 페이지 표시

---

## 🐛 문제 발생 시

### 1. Lock이 작동하지 않음
**증상**: 두 탭 모두 예약 성공
**원인**: 동시 클릭이 아님, 또는 Lock Manager 미작동
**해결**:
```javascript
// 개발자 콘솔에서 Lock Manager 상태 확인
console.log('Lock Manager 상태:', window.lockManager);
```

### 2. PaymentWidget이 안 보임
**증상**: 결제 페이지에 위젯 없음
**원인**: `bookingNumber`가 URL에 없음
**해결**:
- URL 확인: `?bookingNumber=BK-...` 파라미터 있는지 확인
- 없으면 DetailPage에서 전달 안 됨

### 3. DB 연결 실패
**증상**: "Cannot connect to database" 에러
**원인**: `.env` 파일 설정 문제
**해결**:
```bash
# .env 파일 확인
cat .env | grep DATABASE
```

### 4. 빌드 에러
**증상**: 개발 서버 실행 안 됨
**해결**:
```bash
# 서버 재시작
cd C:\Users\ham57\Desktop\Travleap
npm run dev
```

---

## 📊 성공 기준

### ✅ 모든 테스트 통과 시:
1. Lock Manager가 동시 예약을 차단함
2. HOLD 예약이 DB에 생성됨
3. PaymentWidget이 정상 표시됨
4. 예약 로그가 정확하게 기록됨
5. 10분 HOLD 시간이 설정됨

### 🎉 최종 확인:
```
✅ Lock Manager: 작동
✅ HOLD System: 작동
✅ Payment Integration: 작동
✅ Database: 정상
✅ Logs: 정상
```

---

## 📝 테스트 결과 기록

테스트를 진행하면서 아래 체크리스트를 작성해주세요:

```
테스트 일시: 2025-10-13 14:00

[ ] 테스트 1: Lock Manager - 통과/실패
    - 탭 1 결과:
    - 탭 2 결과:

[ ] 테스트 2: PaymentWidget - 통과/실패
    - 위젯 로드:
    - HOLD 경고:

[ ] 테스트 3: DB 확인 - 통과/실패
    - 예약 생성:
    - 상태 정확:

[ ] 테스트 4: 로그 확인 - 통과/실패
    - 로그 존재:
    - 상세 정확:

[ ] 테스트 5: 결제 (선택) - 통과/실패/미실시
    - 결제 승인:
    - 상태 전환:

총평:
문제점:
개선사항:
```

---

**준비 완료! 테스트를 시작하세요! 🚀**
