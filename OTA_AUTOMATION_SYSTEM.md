# 🎉 야놀자 스타일 완전 자동화 OTA 시스템

Travleap 플랫폼의 완전 자동화 예약 처리 시스템 문서

---

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [작동 방식](#작동-방식)
3. [파트너 알림 시스템](#파트너-알림-시스템)
4. [고객 알림 시스템](#고객-알림-시스템)
5. [이메일 발송 설정](#이메일-발송-설정)
6. [야놀자와 비교](#야놀자와-비교)

---

## 🎯 시스템 개요

### 완전 자동화 OTA (Online Travel Agency) 시스템

Travleap은 야놀자처럼 **완전 자동화된 예약 처리 시스템**을 갖추고 있습니다.

```
고객 예약 → 파트너 자동 알림 → 파트너 확인 → 고객 자동 알림
```

### 핵심 기능

✅ **자동 예약 접수**
- 고객이 예약하면 즉시 파트너에게 이메일 발송
- 알림톡 지원 (카카오 비즈니스 메시지)

✅ **자동 예약 확정**
- 관리자가 "확정" 버튼 클릭 시 고객에게 이메일 발송
- 예약 확정 상세 정보 전송

✅ **정산 자동화** (추후 구현)
- 매월 자동 정산 처리
- 파트너에게 정산 내역 이메일 발송

---

## 🔄 작동 방식

### 1. 고객 예약 → 파트너 알림

```typescript
// 고객이 예약 생성
const booking = await api.createBooking({
  listing_id: 13,
  user_id: 1,
  start_date: '2025-10-08',
  num_adults: 2,
  total_amount: 90000,
  customer_info: {
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'hong@example.com'
  }
});

// ✅ 자동 실행: 파트너에게 이메일 + 알림톡 발송
// - 주문번호: BK17593074805920
// - 고객 정보: 홍길동, 010-1234-5678
// - 예약 상품: 증도힐링펜션
// - 예약일: 2025. 10. 8. ~ 2025. 10. 10.
// - 인원: 성인 2명
// - 금액: 90,000원
```

**파트너가 받는 이메일 예시:**

```html
🎉 새로운 예약이 접수되었습니다!

📋 예약 정보
주문번호: BK17593074805920
상품명: 증도힐링펜션
카테고리: 숙박
예약일: 2025. 10. 8. ~ 2025. 10. 10.
인원: 성인 2명
결제 금액: ₩90,000

👤 고객 정보
예약자명: 홍길동
전화번호: 010-1234-5678
이메일: hong@example.com

⚠️ 중요: 고객에게 예약 확정 연락을 해주세요.
파트너 대시보드에서 예약을 확정하거나 거절할 수 있습니다.

[파트너 대시보드에서 예약 관리하기]
```

### 2. 파트너 확인 → 관리자 확정 → 고객 알림

```typescript
// 관리자가 "확정" 버튼 클릭
await api.admin.updateOrderStatus(bookingId, 'confirmed');

// ✅ 자동 실행: 고객에게 예약 확정 이메일 발송
// - 예약 확정 안내
// - 파트너 정보
// - 예약 상세 정보
// - 마이페이지 링크
```

**고객이 받는 이메일 예시:**

```html
✅ 예약이 확정되었습니다!

증도힐링펜션에서 예약을 승인했습니다

🎉 예약 확정 완료
예약번호: BK17593074805920

📋 예약 상세 정보
상품명: 증도힐링펜션
파트너: 증도힐링펜션
예약일: 2025. 10. 8. ~ 2025. 10. 10.
인원: 성인 2명
결제 금액: ₩90,000

[내 예약 확인하기]
```

---

## 📧 파트너 알림 시스템

### 파트너에게 발송되는 알림

#### 1. 새 예약 접수 알림
- **트리거**: 고객이 결제 완료
- **발송 수단**: 이메일 + 알림톡
- **내용**:
  - 주문번호
  - 상품 정보
  - 고객 연락처
  - 예약일/인원
  - 결제 금액
  - 요청사항

#### 2. 예약 취소 알림
- **트리거**: 고객이 예약 취소
- **발송 수단**: 이메일 + 알림톡
- **내용**:
  - 취소된 주문번호
  - 취소 사유
  - 환불 금액

#### 3. 정산 알림 (매월 자동)
- **트리거**: 매월 1일 자동 실행
- **발송 수단**: 이메일
- **내용**:
  - 정산 금액
  - 거래 내역
  - 입금 예정일

---

## 👤 고객 알림 시스템

### 고객에게 발송되는 알림

#### 1. 예약 접수 확인 (즉시)
- **트리거**: 결제 완료
- **내용**: 예약 접수 확인, 예약번호

#### 2. 예약 확정 알림
- **트리거**: 파트너가 예약 승인 (관리자 확정 클릭)
- **내용**: 예약 확정 안내, 파트너 정보

#### 3. 예약 거절 알림
- **트리거**: 파트너가 예약 거절
- **내용**: 거절 사유, 환불 안내

#### 4. 리마인더 (예약 1일 전)
- **트리거**: 예약일 1일 전 자동
- **내용**: 예약 확인, 파트너 연락처

---

## ⚙️ 이메일 발송 설정

### 1. EmailJS 설정 (무료, 간단)

```bash
# .env 파일에 추가
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
```

**설정 방법:**
1. [EmailJS](https://www.emailjs.com/) 가입
2. Email Service 생성 (Gmail, Outlook 등)
3. Email Template 생성
4. Public Key 복사
5. `.env` 파일에 추가

**장점**: 무료, 설정 간단
**단점**: 월 200통 제한

### 2. SendGrid 설정 (프로덕션 추천)

```bash
# .env 파일에 추가
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@travleap.com
```

**설정 방법:**
1. [SendGrid](https://sendgrid.com/) 가입
2. API Key 생성
3. Sender Authentication (도메인 인증)
4. `.env` 파일에 추가

**장점**: 안정적, 월 40,000통 무료
**단점**: 도메인 인증 필요

### 3. AWS SES 설정 (대규모)

```bash
# .env 파일에 추가
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@travleap.com
```

**설정 방법:**
1. AWS Console → SES
2. Sender Email 인증
3. IAM User 생성, Access Key 발급
4. `.env` 파일에 추가

**장점**: 저렴, 대규모 발송
**단점**: 초기 설정 복잡

### 4. 카카오 알림톡 설정 (선택사항)

```bash
# .env 파일에 추가
VITE_KAKAO_ALIMTALK_API_KEY=xxxxxxxxxxxxxxxxxxxxxxx
VITE_KAKAO_BIZ_USER_ID=your_business_id
VITE_KAKAO_SENDER_KEY=xxxxxxxxxxxxxxxxxxxxxxx
```

**설정 방법:**
1. [카카오 비즈니스](https://business.kakao.com/) 가입
2. 알림톡 채널 생성
3. 템플릿 등록 및 승인
4. API Key 발급

**장점**: 높은 도달률, 오픈율
**단점**: 유료, 템플릿 승인 필요

---

## 🆚 야놀자와 비교

### Travleap vs 야놀자 시스템

| 기능 | 야놀자 | Travleap | 상태 |
|------|--------|----------|------|
| 예약 즉시 파트너 알림 | ✅ | ✅ | **완료** |
| 예약 확정 시 고객 알림 | ✅ | ✅ | **완료** |
| 이메일 자동 발송 | ✅ | ✅ | **완료** |
| 알림톡 발송 | ✅ | ✅ | **지원** |
| 자동 정산 시스템 | ✅ | 🔜 | 추후 구현 |
| PMS API 연동 | ✅ | 🔜 | 추후 구현 |
| 재고 실시간 동기화 | ✅ | 🔜 | 추후 구현 |
| 파트너 대시보드 | ✅ | 🔜 | 추후 구현 |

### 현재 완료된 기능

✅ **예약 자동화**
- 고객 예약 → 파트너 알림 (이메일 + 알림톡)
- 관리자 확정 → 고객 알림 (이메일)
- 예약 취소 → 파트너/고객 알림

✅ **다중 이메일 서비스 지원**
- EmailJS (무료, 간단)
- SendGrid (프로덕션)
- AWS SES (대규모)

✅ **알림 시스템**
- HTML 이메일 템플릿
- 카카오 알림톡 지원
- 개발/프로덕션 환경 분리

---

## 🚀 다음 단계

### 1. 파트너 대시보드 (진행 예정)
- 파트너가 직접 예약 확인/관리
- 예약 승인/거절 버튼
- 정산 내역 확인

### 2. 자동 정산 시스템
- 매월 자동 정산 처리
- 파트너별 거래 내역
- 정산 내역 이메일 발송

### 3. PMS API 연동
- CloudBeds, ONDA 등
- 실시간 재고 동기화
- 예약 자동 반영

### 4. 고급 알림
- SMS 알림
- 푸시 알림 (PWA)
- 예약 리마인더 (1일 전 자동)

---

## 📝 사용 예시

### 예약 생성 (고객)

```typescript
// 1. 상품 상세 페이지에서 "예약하기" 클릭
const booking = await api.createBooking({
  listing_id: 13,
  user_id: 1,
  start_date: '2025-10-08',
  end_date: '2025-10-10',
  num_adults: 2,
  num_children: 0,
  num_seniors: 0,
  total_amount: 90000,
  customer_info: {
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'hong@example.com'
  },
  special_requests: '조용한 방 부탁드립니다'
});

// ✅ 자동 실행:
// 1. bookings 테이블에 예약 저장
// 2. 파트너에게 이메일 발송
// 3. 파트너에게 알림톡 발송 (설정된 경우)
// 4. 콘솔에 로그 출력
```

### 예약 확정 (관리자)

```typescript
// 관리자 페이지 → 주문 관리 → "확정" 버튼 클릭
const result = await api.admin.updateOrderStatus(15, 'confirmed');

// ✅ 자동 실행:
// 1. bookings 테이블 status 업데이트
// 2. 고객에게 예약 확정 이메일 발송
// 3. 콘솔에 로그 출력
```

### 예약 취소 (고객)

```typescript
// 마이페이지 → 예약 내역 → "취소" 버튼 클릭
const result = await api.cancelBooking(15, {
  cancellationFee: 10000,
  refundAmount: 80000,
  reason: '일정 변경'
});

// ✅ 자동 실행:
// 1. bookings 테이블 status = 'cancelled'
// 2. 파트너에게 취소 알림 발송
// 3. 고객에게 취소 확인 및 환불 안내 발송
```

---

## 🔧 트러블슈팅

### 이메일이 발송되지 않을 때

1. **환경 변수 확인**
   ```bash
   # Vercel Dashboard → Settings → Environment Variables
   # 다음 변수들이 설정되어 있는지 확인
   SENDGRID_API_KEY
   SENDER_EMAIL
   ```

2. **로그 확인**
   ```bash
   # Vercel Deployment Logs
   # 이메일 발송 성공/실패 로그 확인
   ```

3. **개발 환경 테스트**
   ```bash
   # 로컬에서 실행 시 콘솔에 이메일 내용 출력됨
   npm run dev
   # 예약 생성 후 콘솔 확인
   ```

### 알림톡이 발송되지 않을 때

1. **카카오 비즈니스 채널 확인**
   - 채널이 활성화되어 있는지
   - 템플릿이 승인되었는지

2. **API Key 확인**
   ```bash
   VITE_KAKAO_ALIMTALK_API_KEY=xxxxxxx
   VITE_KAKAO_SENDER_KEY=xxxxxxx
   ```

---

## 📊 시스템 모니터링

### 알림 발송 로그

모든 알림 발송 내역은 `partner_notifications` 테이블에 저장됩니다:

```sql
CREATE TABLE partner_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT NOT NULL,
  booking_id INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'new_booking', 'booking_confirmed', 'booking_cancelled'
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed'
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

### 대시보드에서 확인

```sql
-- 오늘 발송된 알림 수
SELECT COUNT(*) FROM partner_notifications
WHERE DATE(sent_at) = CURDATE();

-- 발송 실패한 알림
SELECT * FROM partner_notifications
WHERE status = 'failed';

-- 파트너별 알림 통계
SELECT
  p.business_name,
  COUNT(*) as notification_count,
  SUM(CASE WHEN email_sent THEN 1 ELSE 0 END) as email_count,
  SUM(CASE WHEN sms_sent THEN 1 ELSE 0 END) as sms_count
FROM partner_notifications pn
JOIN partners p ON pn.partner_id = p.id
GROUP BY p.id;
```

---

## 🎉 완료!

야놀자 스타일의 완전 자동화 OTA 시스템이 구축되었습니다!

**현재 시스템:**
- ✅ 예약 즉시 파트너 알림
- ✅ 예약 확정 시 고객 알림
- ✅ 이메일 자동 발송
- ✅ 알림톡 지원
- ✅ 다중 이메일 서비스

**다음 단계:**
- 🔜 파트너 대시보드
- 🔜 자동 정산 시스템
- 🔜 PMS API 연동
- 🔜 재고 실시간 동기화

문의: support@travleap.com
