# 스마트 쿠폰 시스템 - 카카오 채널 버전 (채널톡 있는 버전)

> 카카오 채널 + 카카오싱크 + 알림톡 + 웹사이트 조합

---

## 1. 관광객 동선 (카카오 채널 쪽)

### 1) 포스터 QR 스캔 → 카카오 채널 진입

- 관광객이 스마트포스터 QR 스캔
- 카카오 채널(채널 추가 + 채팅창) 혹은 카카오싱크 간편가입 화면으로 이동

### 2) 카카오에서 회원가입 버튼 → 우리 사이트 + 쿠폰 발급

**권장 플로우:**

1. 카카오 채널 카드/버튼: `[간편 가입하고 쿠폰 받기]`
2. 버튼 클릭 → 카카오싱크 간편 가입 → 가입 성공 시 우리 사이트의 콜백 URL 호출
   - 예: `/auth/kakao/callback`

**서버에서:**
- 유저 회원 생성/로그인 처리
- 해당 캠페인 쿠폰(`user_coupons` row) `ISSUED`로 발급
- JWT(or 세션 쿠키) 발급

**가입 완료 직후:**
- 카카오 알림톡 or 채널 메시지 발송
- 텍스트: "쿠폰이 발급되었습니다."
- 버튼1: `[내 쿠폰함 보기]` → `https://site.com/my/coupons`
- 버튼2: `[쿠폰 사용 가능한 가맹점 보기]` → `https://site.com/partners?filter=coupon_available`

**이렇게 하면 "쿠폰을 어디서 받느냐?" 문제를 해결함:**
- 쿠폰 자체는 DB(`user_coupons`)에 이미 발급
- 유저는 알림톡/채널 메시지 버튼을 통해 내 쿠폰함 또는 쿠폰 사용가능 가맹점 리스트로 바로 이동

### 3) 가맹점 페이지에서 필터 상태

`https://site.com/partners?filter=coupon_available` 로 열면 프론트에서:
- `is_coupon_partner = TRUE AND status = APPROVED` 인 파트너만 표시
- 필요하면 현재 사용자가 가진 쿠폰 기준으로 `target_type(ALL / CATEGORY / SPECIFIC)` 필터까지 적용

즉, **"쿠폰 사용 가능한 가맹점만 보여주는 페이지"**가 됨.

---

## 2. 가맹점(파트너) 동선 – QR 스캔 & 할인 적용

### 1) 손님 QR 구성

손님에게 보여주는 QR에는 개인 쿠폰 코드를 포함시키면 됨:
- 예: `https://site.com/coupon/use?code=ABC123XY`
- `ABC123XY` = `user_coupons.coupon_code`

손님은 "쿠폰 제시하기" 눌러 QR 띄우고, 가맹점 직원은 파트너 대시보드의 카메라 스캐너로 찍는 구조.

### 2) 파트너 로그인 여부에 따른 처리

가맹점 카메라(혹은 스캐너 페이지)에서 QR 인식 → `https://site.com/coupon/use?code=ABC123XY` 접속

서버에서 로그인 세션 확인:
- ✅ 이미 로그인 상태(세션 유지) → 바로 "쿠폰 사용 화면"으로 이동
- ❌ 로그인 안 되어 있음 → 파트너 로그인 페이지로 보냄 → 로그인 성공 후 `coupon/use?code=...`로 자동 리다이렉트

### 3) 쿠폰 사용 화면 (금액 입력 → 할인 → 저장)

**쿠폰 사용 화면 로직:**

서버에서 `partner_id + coupon_code` 조합으로 검증:
1. 파트너 `APPROVED` ?
2. `is_coupon_partner = TRUE` ?
3. 쿠폰 유효기간 ?
4. 이미 사용된 쿠폰 아님 ?
5. `target_type` 조건 충족 ?

모두 통과 시, 프론트에 금액 입력 UI 표시:

```
주문 금액을 입력하세요.
[   32,000   ] 원   [할인 계산하기]
```

"할인 계산하기" 클릭 시:
- 파트너 개별 할인 설정이 있으면 그걸 우선
- 없으면 쿠폰 기본 할인(`default_discount_*`) 사용
- 예: 32,000원 → 4,800원 할인 → 27,200원

"저장/사용 완료" 클릭하면 서버에서:

**user_coupons 업데이트:**
- `status = USED`
- `used_partner_id = 현재 partner_id`
- `order_amount = 32000`
- `discount_amount = 4800`
- `final_amount = 27200`

**partners 통계 업데이트:**
- `total_coupon_usage += 1`
- `total_discount_given += 4800`

**응답 JSON:**
```json
{
  "success": true,
  "order_amount": 32000,
  "discount_amount": 4800,
  "final_amount": 27200,
  "message": "쿠폰이 정상적으로 사용되었습니다."
}
```

이 시점 이후로 해당 `coupon_code`는 재사용 불가. 다시 스캔 시: "이미 사용된 쿠폰입니다."

---

## 3. 쿠폰 사용 후 – 후기 + 포인트 500 지급

### 1) "사용됨"으로 바뀐 뒤 플로우

쿠폰이 `USED`로 바뀌는 순간:
- `user_coupons.needs_review = TRUE` 로 저장
- 카카오 알림톡 or 채널 메시지 전송 (선택사항)
  - 버튼: `[방문하신 가맹점 후기 쓰기]`
  - 링크: `https://site.com/review?coupon=ABC123XY`

### 2) 사이트 접속 시 자동 후기 모달

사용자가 사이트에 들어오면(홈 or 마이페이지):
- `/api/my/pending-reviews` 호출
- `needs_review = TRUE` 인 쿠폰이 있으면 모달 띄우기:

```
가우도 OO카페 방문은 어떠셨나요?
[별점 ★★★★★] [후기 텍스트 박스]
[작성하기]   [나중에]
```

"작성하기" 클릭 시:
- `reviews` 테이블 INSERT (`user_id`, `partner_id`, `rating`, `comment`)
- `user_points` 테이블에 +500 포인트 적립
- `user_coupons.needs_review = FALSE`

해당 가맹점 상세 페이지에:
- "리뷰 N개 · 평균 ★4.8"
- 리뷰 리스트(닉네임 + 점수 + 코멘트) 노출

---

## 4. 통계 자동 집계

위 로직만 구현되면 통계는 자동으로 쌓임:

| 테이블 | 데이터 |
|--------|--------|
| `user_coupons` | 사용 시각, 사용 가맹점, 주문 금액, 할인 금액 |
| `reviews` | 가맹점별 평점, 후기 수 |
| `partners` | `total_coupon_usage`, `total_discount_given` |

관리자/파트너 정산 탭에서 기간 필터만 걸어서 SELECT 하면 됨.

---

## 5. 한 줄 요약 (클로드코드용)

```
포스터 QR → 카카오 채널(카카오싱크 간편가입) → 가입 완료 시 우리 사이트 콜백에서
user_coupons에 쿠폰 발급 후 JWT 발급, 그리고 카카오 알림톡/채널메시지 버튼으로
내 쿠폰함과 쿠폰 사용 가능 가맹점 리스트(partners?filter=coupon_available) 링크 제공.

가맹점은 파트너 대시보드의 스캐너로 사용자 쿠폰 QR을 읽어 /coupon/use?code=...
페이지로 들어가며, 로그인 상태면 바로 금액 입력/할인 계산/사용 처리, 미로그인 시
로그인 후 동일 페이지로 리다이렉트.

쿠폰 사용 완료 시 user_coupons.status=USED + needs_review=TRUE로 저장하고,
이후 사용자가 사이트 접속 시 리뷰 작성 모달을 띄워 작성하면 reviews에 저장 +
500포인트 지급, 파트너/관리자 정산 및 통계는 user_coupons·partners·reviews
데이터를 기반으로 자동 집계.
```

---

## 플로우 다이어그램

```
[관광객]
    │
    ▼ QR 스캔
[카카오 채널] ──► [카카오싱크 가입]
    │
    ▼ 콜백
[/auth/kakao/callback]
    ├─ user 생성/로그인
    ├─ user_coupons 발급 (ISSUED)
    └─ JWT 발급
    │
    ▼ 알림톡 발송
[카카오 알림톡]
    ├─ [내 쿠폰함] → /my/coupons
    └─ [가맹점 보기] → /partners?filter=coupon_available
    │
    ▼ 가맹점 방문
[가맹점]
    │
    ▼ 손님 QR 제시
[/coupon/use?code=ABC123XY]
    │
    ▼ 파트너 스캔/입력
[금액 입력 → 할인 계산 → 사용 완료]
    ├─ user_coupons.status = USED
    ├─ needs_review = TRUE
    └─ partners 통계 업데이트
    │
    ▼ 사이트 재접속
[후기 모달]
    ├─ reviews INSERT
    ├─ +500 포인트
    └─ needs_review = FALSE
```
