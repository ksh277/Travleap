# 알림 시스템 설정 가이드

결제 완료 및 환불 완료 시 고객에게 이메일/SMS 알림을 발송하는 시스템이 구현되었습니다.

## 📧 이메일 알림 (SendGrid)

### 1. SendGrid 계정 생성

1. [SendGrid 웹사이트](https://sendgrid.com/)에 접속
2. 무료 플랜 가입 (매일 100건 무료)
3. Email API → Integration Guide 선택

### 2. API 키 발급

1. Settings → API Keys 메뉴
2. "Create API Key" 클릭
3. 이름 입력 (예: `Travleap Production`)
4. "Full Access" 권한 선택
5. API 키 복사 (한 번만 표시됨!)

### 3. 발신자 이메일 인증

1. Settings → Sender Authentication
2. "Verify a Single Sender" 클릭
3. 발신자 정보 입력 (예: `noreply@travleap.com`)
4. 이메일 인증 링크 클릭

⚠️ **중요**: 인증된 이메일만 발신자로 사용 가능합니다!

### 4. 환경 변수 설정

`.env.local` 파일에 추가:

```bash
# SendGrid 이메일 발송
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@travleap.com  # 인증한 이메일 주소
```

## 📱 SMS 알림 (Aligo)

### 1. Aligo 계정 생성

1. [Aligo 웹사이트](https://smartsms.aligo.in/)에 접속
2. 회원가입 (무료 체험 가능)
3. 발신번호 등록 (본인 인증 필요)

### 2. API 키 발급

1. 마이페이지 → API 키 관리
2. API 키 생성 클릭
3. `key`와 `user_id` 확인

### 3. 발신번호 등록

1. 발신번호 관리 메뉴
2. 발신번호 추가 (본인 확인 필요)
3. 승인 대기 (보통 1-2시간)

### 4. 환경 변수 설정

`.env.local` 파일에 추가:

```bash
# Aligo SMS 발송
ALIGO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
ALIGO_USER_ID=your_user_id
SMS_SENDER=01012345678  # 인증한 발신번호 (숫자만)
```

## 🔧 개발 환경 설정

개발 환경에서는 API 키 없이도 로그만 출력되도록 설정되어 있습니다.

`.env.local` 파일:

```bash
NODE_ENV=development  # 개발 환경에서는 실제 발송 안 됨
```

## ✅ 설정 확인

### 테스트 방법

1. **결제 완료 알림 테스트**:
   - 테스트 결제 진행
   - 콘솔에서 `✅ [Email] 이메일 발송 성공` 확인
   - 콘솔에서 `✅ [SMS] SMS 발송 성공` 확인

2. **환불 완료 알림 테스트**:
   - 관리자 페이지에서 환불 진행
   - 동일하게 콘솔 확인

### 로그 확인

```bash
# 이메일 발송 성공
✅ [Email] 이메일 발송 성공: user@example.com (payment_success)

# SMS 발송 성공
✅ [SMS] SMS 발송 성공: 01012345678 (payment_success)

# API 키 없는 경우 (DRY RUN)
⚠️ [Email] SENDGRID_API_KEY not configured.
📧 [Email - DRY RUN]: { to: 'user@example.com', ... }
```

## 📊 발송 내역 확인

### SendGrid

1. Dashboard → Activity
2. 발송/실패 내역 확인
3. 반송(bounce) 및 스팸 확인

### Aligo

1. 마이페이지 → 전송 내역
2. 성공/실패 건수 확인
3. 잔액 확인

## 💰 요금 안내

### SendGrid

- **Free**: 매일 100건
- **Essentials**: $19.95/월 (50,000건)
- **Pro**: $89.95/월 (100,000건)

### Aligo

- **SMS**: 건당 9원 (최소 충전 5,000원)
- **LMS** (90자 초과): 건당 30원
- 충전 금액은 자동 충전 설정 가능

## 🔒 보안 주의사항

1. ⚠️ **API 키는 절대 Git에 커밋하지 마세요!**
   - `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
   - 프로덕션 환경에서는 Vercel 환경 변수로 설정하세요

2. **Vercel 환경 변수 설정**:
   - Vercel Dashboard → Project Settings → Environment Variables
   - 위의 모든 환경 변수 추가
   - Production, Preview, Development 환경 선택

## 📝 알림 템플릿 커스터마이징

알림 템플릿은 `api/notifications/send.js` 파일에서 수정할 수 있습니다:

```javascript
// 결제 완료 이메일 템플릿
const PAYMENT_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html>
<body>
  <h2>💳 결제가 완료되었습니다</h2>
  ...
</body>
</html>
`;

// SMS 템플릿 (90자 이하 권장)
const PAYMENT_SUCCESS_SMS = `[Travleap] {{customerName}}님, 결제가 완료되었습니다...`;
```

## 🐛 문제 해결

### 이메일이 발송되지 않는 경우

1. **SENDGRID_API_KEY 확인**
   - API 키가 올바른지 확인
   - Full Access 권한이 있는지 확인

2. **발신자 이메일 확인**
   - `EMAIL_FROM`이 인증된 이메일인지 확인
   - SendGrid에서 Sender Authentication 완료 확인

3. **도메인 인증 (선택)**
   - 프로덕션에서는 도메인 인증 권장
   - Settings → Sender Authentication → Authenticate Your Domain

### SMS가 발송되지 않는 경우

1. **Aligo API 키 확인**
   - `ALIGO_API_KEY`와 `ALIGO_USER_ID` 확인
   - Aligo 웹사이트에서 로그인 확인

2. **발신번호 인증 확인**
   - `SMS_SENDER`가 인증된 번호인지 확인
   - 발신번호 관리에서 승인 상태 확인

3. **잔액 확인**
   - Aligo 충전 금액이 충분한지 확인

## 📞 고객센터

- **SendGrid**: support@sendgrid.com
- **Aligo**: 1600-5679

## 🔗 관련 파일

- `api/notifications/send.js` - 알림 API 엔드포인트
- `api/payments/confirm.js:633-691` - 결제 완료 알림 발송
- `api/payments/refund.js:699-751` - 환불 완료 알림 발송
- `utils/notifications.ts` - TypeScript 알림 유틸리티 (선택적 사용)

## ✨ 향후 개선 사항

- [ ] 푸시 알림 추가 (Firebase Cloud Messaging)
- [ ] 알림 이력 대시보드
- [ ] A/B 테스트를 위한 템플릿 버전 관리
- [ ] 알림 예약 발송
- [ ] 다국어 템플릿 지원
