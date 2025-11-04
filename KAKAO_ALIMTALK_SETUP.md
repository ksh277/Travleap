# 카카오 알림톡 연동 가이드

## 📋 개요

카카오 알림톡은 카카오톡을 통해 고객/파트너에게 예약 알림, 결제 알림 등을 전송하는 서비스입니다.

---

## 1단계: 카카오 비즈니스 계정 생성

### 1.1 카카오톡 채널 생성

1. **카카오톡 채널 관리자센터 접속**
   - URL: https://center-pf.kakao.com/
   - 카카오 계정으로 로그인

2. **새 채널 만들기**
   - 채널명: "Travleap" (또는 원하는 이름)
   - 카테고리: 여행/숙박
   - 검색 허용: ON (고객이 찾을 수 있도록)

3. **채널 정보 입력**
   - 프로필 사진 업로드
   - 소개글 작성
   - 전화번호/이메일 등록

### 1.2 비즈니스 인증 (필수)

1. **관리자센터 → 설정 → 비즈니스 인증**
2. **사업자 정보 입력**
   - 사업자등록번호
   - 대표자명
   - 사업자등록증 사본 업로드

3. **검토 대기** (영업일 기준 1~3일 소요)

---

## 2단계: 카카오 비즈메시지 가입

### 2.1 카카오 비즈메시지 신청

1. **비즈메시지 사이트 접속**
   - URL: https://bizplus.kakao.com/
   - 카카오 계정으로 로그인

2. **신청하기**
   - 서비스: 알림톡 + 친구톡 (선택)
   - 요금제: 종량제 / 정액제 선택
   - 약관 동의

3. **카카오톡 채널 연동**
   - 1단계에서 만든 채널 선택
   - 연동 승인

### 2.2 요금제 선택

**종량제 (추천 - 초기 단계)**
- 알림톡: 건당 6~9원
- 친구톡: 건당 10~15원
- 최소 결제 금액 없음
- 사용한 만큼만 결제

**정액제 (대량 발송 시)**
- 월 1만건: 50,000원
- 월 5만건: 200,000원
- 월 10만건: 350,000원

---

## 3단계: 알림톡 템플릿 등록

### 3.1 템플릿 생성

1. **비즈메시지 관리자 → 알림톡 → 템플릿 관리**
2. **새 템플릿 만들기**

### 3.2 템플릿 예시 1: 신규 예약 알림 (파트너용)

**템플릿 코드:** `new_booking_partner`
**템플릿 제목:** 신규 예약 접수
**템플릿 내용:**

```
[Travleap] 새로운 예약이 접수되었습니다 🎉

📋 주문번호: #{order_number}
🏨 상품명: #{product_name}
📅 예약일: #{start_date} ~ #{end_date}
👤 예약자: #{customer_name}
📞 연락처: #{customer_phone}
👥 인원: 성인 #{num_adults}명
💰 금액: #{total_amount}원

⚠️ 파트너 대시보드에서 예약을 확정해주세요.

[파트너 대시보드 바로가기]
```

**변수 등록:**
- `#{order_number}`: 주문번호
- `#{product_name}`: 상품명
- `#{start_date}`: 시작일
- `#{end_date}`: 종료일
- `#{customer_name}`: 고객명
- `#{customer_phone}`: 연락처
- `#{num_adults}`: 성인 인원
- `#{total_amount}`: 총 금액

**버튼 추가:**
- 버튼명: 파트너 대시보드 바로가기
- 버튼 타입: 웹링크
- URL: `https://travleap.vercel.app/partner/orders`

### 3.3 템플릿 예시 2: 예약 확정 알림 (고객용)

**템플릿 코드:** `booking_confirmed_customer`
**템플릿 제목:** 예약 확정 완료
**템플릿 내용:**

```
[Travleap] 예약이 확정되었습니다 ✅

📋 예약번호: #{order_number}
🏨 상품명: #{product_name}
🏢 파트너: #{partner_name}
📅 예약일: #{start_date} ~ #{end_date}
👥 인원: 성인 #{num_adults}명
💰 결제 금액: #{total_amount}원

#{partner_name}에서 예약을 승인했습니다.
즐거운 여행 되세요! 😊

[내 예약 확인하기]
```

**버튼 추가:**
- 버튼명: 내 예약 확인하기
- 버튼 타입: 웹링크
- URL: `https://travleap.vercel.app/mypage/bookings`

### 3.4 템플릿 검수 요청

1. 템플릿 작성 후 **검수 요청** 버튼 클릭
2. 검수 대기 (영업일 기준 1~2일)
3. 승인 후 사용 가능

---

## 4단계: API 키 발급

### 4.1 API 키 생성

1. **비즈메시지 관리자 → API 설정**
2. **새 API 키 발급**
   - API 키 이름: "Travleap Production"
   - 발급 받은 키 안전하게 보관

### 4.2 발급받는 정보

- **API Key**: `sk_test_xxxxxxxxxxxxxxxxxx` (실제 키는 더 길음)
- **Sender Key**: 카카오톡 채널의 고유 키
- **User ID**: 비즈메시지 계정 ID

---

## 5단계: 환경 변수 설정

### 5.1 .env 파일 수정

```env
# 카카오 알림톡 설정
VITE_KAKAO_ALIMTALK_API_KEY=sk_live_your_api_key_here
VITE_KAKAO_SENDER_KEY=your_sender_key_here
VITE_KAKAO_BIZ_USER_ID=your_user_id_here

# 앱 URL
VITE_APP_URL=https://travleap.vercel.app
```

### 5.2 Vercel 환경 변수 설정

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - Travleap 프로젝트 선택

2. **Settings → Environment Variables**
3. **변수 추가:**
   - `VITE_KAKAO_ALIMTALK_API_KEY`
   - `VITE_KAKAO_SENDER_KEY`
   - `VITE_KAKAO_BIZ_USER_ID`
   - `VITE_APP_URL`

4. **Redeploy** (환경 변수 적용)

---

## 6단계: 코드 확인

### 6.1 현재 구현 상태

✅ **이미 구현된 기능:**
- `utils/notification.ts` - 알림톡 발송 함수
- `pages/api/payments/confirm.js` - 결제 완료 시 알림 트리거
- 환경 변수 체크 로직
- 개발/프로덕션 환경 분리

### 6.2 알림톡 발송 흐름

```
결제 완료
  ↓
pages/api/payments/confirm.js
  ↓
notifyPartnerNewBooking() 호출
  ↓
utils/notification.ts
  ↓
sendKakaoAlimtalk() 실행
  ↓
카카오 API 전송
  ↓
파트너 카카오톡 알림 도착 ✅
```

### 6.3 테스트 방법

**개발 환경 (환경 변수 없을 때):**
```javascript
// 콘솔에만 출력됨
console.log('📱 알림톡 발송 (개발 모드):');
console.log(`To: ${booking.partner_phone}`);
```

**프로덕션 환경 (환경 변수 있을 때):**
```javascript
// 실제 API 호출
await fetch('https://alimtalk-api.bizmsg.kr/v2/sender/send', {
  // 실제 전송
});
```

---

## 7단계: 실제 API 연동 개선 (선택사항)

현재 `utils/notification.ts`의 카카오 API 엔드포인트는 예시입니다. 실제 사용 시:

### 7.1 카카오 공식 API 문서 확인

- **문서:** https://docs.kakaobusiness.com/
- **API 엔드포인트:** 실제 발급받은 정보 사용
- **인증 방식:** OAuth 2.0 또는 API Key

### 7.2 추천 라이브러리

```bash
npm install node-kakao-alimtalk
```

또는 직접 fetch/axios 사용

---

## 📊 예상 비용

### 초기 단계 (월 1,000건 발송)

- 알림톡: 1,000건 × 8원 = 8,000원
- 친구톡: 사용 안 함
- **총 예상 비용: 약 8,000원/월**

### 성장 단계 (월 10,000건 발송)

- 알림톡: 10,000건 × 8원 = 80,000원
- **총 예상 비용: 약 80,000원/월**

### 대량 발송 (월 50,000건)

- 정액제 추천: 200,000원/월 (건당 4원)

---

## 🔧 트러블슈팅

### 문제 1: "인증 실패"
**원인:** API 키가 잘못됨
**해결:**
- API 키 재확인
- Bearer 토큰 형식 확인
- 환경 변수 재설정

### 문제 2: "템플릿을 찾을 수 없음"
**원인:** 템플릿 코드가 다름
**해결:**
- 비즈메시지에서 템플릿 코드 확인
- `tpl_code` 값 일치 확인

### 문제 3: "발송 제한"
**원인:** 일일 발송 한도 초과
**해결:**
- 요금제 업그레이드
- 발송 시간 분산

---

## ✅ 체크리스트

- [ ] 카카오톡 채널 생성
- [ ] 비즈니스 인증 완료
- [ ] 카카오 비즈메시지 가입
- [ ] 요금제 선택 및 결제 수단 등록
- [ ] 알림톡 템플릿 등록 및 승인
- [ ] API 키 발급
- [ ] 환경 변수 설정 (.env)
- [ ] Vercel 환경 변수 설정
- [ ] 테스트 발송 확인
- [ ] 프로덕션 배포

---

## 📞 문의

**카카오 비즈니스 고객센터:**
- 전화: 1544-4293
- 이메일: help.biz@kakaocorp.com
- 운영시간: 평일 09:00~18:00

**Travleap 개발팀:**
- 알림톡 관련 코드 문의: utils/notification.ts 참고
- 환경 변수 설정 문의: .env.example 참고

---

## 🔗 참고 링크

- 카카오 비즈메시지: https://bizplus.kakao.com/
- 카카오톡 채널: https://center-pf.kakao.com/
- API 문서: https://docs.kakaobusiness.com/
- 요금 안내: https://kakaobusiness.gitbook.io/main/pricing

---

**작성일:** 2025-11-04
**작성자:** Claude Code
**버전:** 1.0
