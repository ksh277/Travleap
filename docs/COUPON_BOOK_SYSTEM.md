# 쿠폰북 시스템 완전 정복 가이드

## 목차
1. [개요](#1-개요)
2. [핵심 개념](#2-핵심-개념)
3. [데이터베이스 구조](#3-데이터베이스-구조)
4. [관리자 흐름](#4-관리자-흐름)
5. [사용자 흐름 상세](#5-사용자-흐름-상세)
6. [UI 컴포넌트 상세](#6-ui-컴포넌트-상세)
7. [API 상세](#7-api-상세)
8. [구현해야 할 것들](#8-구현해야-할-것들)
9. [주의사항](#9-주의사항)

---

## 1. 개요

### 1.1 쿠폰북이란?
쿠폰북은 "가고싶은섬" 캠페인 등에서 사용할 수 있는 **제휴 가맹점 할인 쿠폰**을 모아둔 페이지입니다.

### 1.2 핵심 요약
```
관리자가 파트너 관리에서 쿠폰 ON + 할인 텍스트(coupon_text) 직접 입력
         ↓
쿠폰북 페이지에 자동 노출 (/coupon-book)
  - is_coupon_partner = 1인 파트너 목록 표시
  - 각 파트너의 coupon_text를 그대로 표시 (예: "10% 할인", "5인 중 1잔 무료")
         ↓
사용자가 "쿠폰 받기" 클릭 → user_coupons 테이블에 저장
         ↓
마이페이지 쿠폰함에서 QR 보기 (/my/coupons → /coupon-qr/:code)
  - QR은 보여주기만 함 (스캔 기능 없음!)
         ↓
가맹점 직원이 사용자 휴대폰에서 "사용처리" 버튼 클릭
         ↓
리뷰 작성 시 100P 지급 (선택)
```

---

## 2. 핵심 개념

### 2.1 쿠폰북 파트너 기반 시스템

쿠폰북은 **coupons 테이블이 아닌 partners 테이블**을 기반으로 합니다!

| 항목 | 설명 |
|------|------|
| **쿠폰북 파트너** | `partners.is_coupon_partner = 1` |
| **할인 텍스트** | `partners.coupon_text` (예: "10% 할인", "5인 중 1잔 무료") |

할인 텍스트는 관리자가 파트너 관리에서 **직접 입력**하는 단순 텍스트입니다.
계산하지 않고 그대로 표시만 합니다.

### 2.2 절대 잊지 말 것

```
[가맹점 대시보드 불필요!]
━━━━━━━━━━━━━━━━━━━━━━━
❌ 틀린 생각: 가맹점이 별도 대시보드에서 QR 스캔
✅ 올바른 방식: 가맹점 직원이 **사용자 휴대폰**에서 직접 "사용처리" 버튼 클릭

[QR 스캔 안함!]
━━━━━━━━━━━━━━━━━━
❌ 틀린 생각: QR을 스캔해서 쿠폰 처리
✅ 올바른 방식: QR은 **보여주기만** 하는 용도
              가맹점 직원이 고객 폰에서 버튼 클릭

[할인 계산 안함!]
━━━━━━━━━━━━━━━━━━
❌ 틀린 생각: 시스템에서 10% 계산해서 금액 차감
✅ 올바른 방식: "10% 할인", "5인 중 1잔 무료" 같은 **텍스트만 표시**
              실제 할인은 가맹점에서 수동 적용

[할인 텍스트는 파트너 관리에서!]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
파트너 추가/수정 시 "쿠폰 ON" → 할인 텍스트 직접 입력
  - coupon_text: "10% 할인", "5인 중 1잔 무료" 등 자유 입력
표시할 때: 입력한 텍스트 그대로 표시 (계산 없음)
```

---

## 3. 데이터베이스 구조

### 3.1 사용하는 DB
- **PlanetScale (MySQL)**: `partners`, `user_coupons`, `coupon_usage`
- **Neon (PostgreSQL)**: `users`, `coupon_reviews`

### 3.2 partners 테이블 (MySQL - PlanetScale) - 핵심!

```sql
-- 쿠폰북 파트너 조회
SELECT * FROM partners WHERE is_coupon_partner = 1;
```

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | INT | PK | 5 |
| `business_name` | VARCHAR | 가맹점명 | "가우도 카페" |
| `is_coupon_partner` | TINYINT(1) | **쿠폰북 파트너 여부** | 1 |
| `coupon_text` | VARCHAR(100) | **할인 텍스트 (직접 입력)** | "10% 할인", "5인 중 1잔 무료" |
| `address` | VARCHAR | 주소 | "전남 강진군..." |
| `latitude` | DECIMAL | 위도 | 34.6417 |
| `longitude` | DECIMAL | 경도 | 126.7669 |
| `image_url` | VARCHAR | 가맹점 이미지 | "https://..." |

**할인 텍스트 표시 방법**:
```javascript
// 파트너의 coupon_text를 그대로 표시 (계산 없음!)
const discountText = partner.coupon_text;
// 예: "10% 할인", "5인 중 1잔 무료", "아메리카노 1+1" 등
```

### 3.3 user_coupons 테이블 (MySQL - PlanetScale)

```sql
-- 쿠폰북에서 받은 쿠폰 조회
SELECT * FROM user_coupons WHERE claim_source = 'coupon_book';
```

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | INT | PK | 123 |
| `user_id` | INT | 사용자 ID (Neon users.id) | 45 |
| `coupon_id` | INT | FK → coupons.id | 33 |
| `coupon_code` | VARCHAR | **고유 쿠폰 코드** (QR에 표시) | "CB-ABC12345" |
| `status` | ENUM | 'ISSUED', 'USED', 'EXPIRED' | "ISSUED" |
| `claim_source` | VARCHAR | 발급 경로 | **"coupon_book"** |
| `claimed_at` | DATETIME | 받은 일시 | "2024-06-15 10:30:00" |
| `used_at` | DATETIME | 사용 일시 (사용 시 기록) | "2024-06-20 14:00:00" |
| `used_partner_id` | INT | 사용된 가맹점 ID | 5 |

**status 값 설명**:
- `ISSUED`: 발급됨 (사용 가능)
- `USED`: 사용됨
- `EXPIRED`: 만료됨

### 3.4 coupon_reviews 테이블 (PostgreSQL - Neon)

```sql
-- 리뷰 조회
SELECT * FROM coupon_reviews WHERE user_coupon_id = 123;
```

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | INT | PK | 1 |
| `user_id` | INT | FK → users.id | 45 |
| `user_coupon_id` | INT | FK → user_coupons.id | 123 |
| `rating` | INT | 별점 (1-5) | 5 |
| `review_text` | TEXT | 리뷰 내용 | "좋았습니다!" |
| `points_awarded` | INT | 지급된 포인트 | 100 |
| `created_at` | TIMESTAMP | 작성일 | "2024-06-20 15:00:00" |

### 3.5 partners 테이블 (MySQL - PlanetScale)

```sql
-- 쿠폰북 가맹점 조회
SELECT * FROM partners WHERE is_coupon_partner = 1;
```

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | INT | PK |
| `business_name` | VARCHAR | 상호명 |
| `is_coupon_partner` | TINYINT | 쿠폰북 가맹점 여부 (1=예) |
| `address` | VARCHAR | 주소 |
| `latitude` | DECIMAL | 위도 |
| `longitude` | DECIMAL | 경도 |
| `image_url` | VARCHAR | 가맹점 이미지 |

---

## 4. 관리자 흐름

### 4.1 접근 경로
```
/admin → 파트너 관리 탭 → 파트너 추가 또는 수정
```

### 4.2 쿠폰북 파트너 설정 단계

```
[1단계] 파트너 추가/수정 페이지에서 쿠폰 ON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┐
│ 파트너 기본 정보                         │
│ - 상호명: 가우도 카페                    │
│ - 주소: 전남 강진군 가우도...             │
│ - 이미지: (업로드)                       │
│                                         │
│ ✅ 쿠폰북 참여 (is_coupon_partner)        │
│                                         │
│ [할인 텍스트]                            │
│ - 쿠폰 텍스트: [ 10% 할인 ]              │
│   예: "10% 할인", "5인 중 1잔 무료"       │
└─────────────────────────────────────────┘

[2단계] 저장
━━━━━━━━━━━━━━━━━━━━━━━
저장 버튼 클릭 → partners 테이블에 UPDATE
                is_coupon_partner = 1
                coupon_text = '10% 할인'
```

### 4.3 관리자 페이지 파일
```
components/admin/tabs/AdminPartners.tsx
```

**쿠폰 설정 UI**:
```tsx
// 파트너 폼에서 쿠폰 설정 부분
<div className="space-y-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.is_coupon_partner}
      onChange={(e) => setFormData({ ...formData, is_coupon_partner: e.target.checked })}
    />
    쿠폰북 참여
  </label>

  {formData.is_coupon_partner && (
    <div>
      <label>쿠폰 텍스트</label>
      <input
        type="text"
        value={formData.coupon_text}
        onChange={(e) => setFormData({ ...formData, coupon_text: e.target.value })}
        placeholder="예: 10% 할인, 5인 중 1잔 무료"
        maxLength={100}
      />
      <p className="text-sm text-gray-500">쿠폰북에 표시될 할인 정보</p>
    </div>
  )}
</div>
```

---

## 5. 사용자 흐름 상세

### 5.1 [1단계] 쿠폰북 페이지에서 쿠폰 받기

**URL**: `/coupon-book`
**파일**: `components/CouponBookPage.tsx`

```
사용자 화면:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  🏝️ 가고싶은섬 쿠폰북                        │
│                                             │
│  [전체 받기]  [주변 가맹점 보기]              │
│                                             │
│  ┌───────────────┐  ┌───────────────┐       │
│  │ 🖼️ 쿠폰이미지   │  │ 🖼️ 쿠폰이미지   │       │
│  │               │  │               │       │
│  │ 가우도 카페    │  │ 장도 식당      │       │
│  │ 10% 할인      │  │ 5인 중 1잔 무료 │       │
│  │               │  │               │       │
│  │ [쿠폰 받기]    │  │ [받기 완료 ✓]  │       │
│  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────┘

필터 탭:
┌─────────────┐
│ 가고싶은섬 ✓│  ← "쿠폰" 아니고 쿠폰북 이름!
└─────────────┘
```

**사용자 액션 흐름**:
```
1. 사용자가 쿠폰북 페이지 접속
   └─> GET /api/coupon-book/coupons 호출
   └─> coupons 테이블에서 coupon_category='couponbook' AND is_active=1 조회
   └─> 로그인 상태면 이미 받은 쿠폰도 체크 (is_claimed: true/false)

2. "쿠폰 받기" 버튼 클릭
   └─> 로그인 안 됐으면 로그인 모달 표시
   └─> POST /api/coupon-book/claim { couponId: 33 }
   └─> user_coupons 테이블에 INSERT:
       - user_id: 45 (로그인 사용자)
       - coupon_id: 33
       - coupon_code: "CB-ABC12345" (자동 생성)
       - status: "ISSUED"
       - claim_source: "coupon_book"
       - claimed_at: NOW()
   └─> 버튼이 "받기 완료 ✓"로 변경

3. "전체 받기" 버튼 클릭 (한번에 모든 쿠폰 다운로드)
   └─> POST /api/coupon-book/claim-all
   └─> 아직 안 받은 모든 쿠폰북 쿠폰을 user_coupons에 INSERT
   └─> "5개 쿠폰을 받았습니다!" 토스트

4. "주변 가맹점 보기" 버튼 클릭
   └─> /partners/discount?couponBook=가고싶은섬 페이지로 이동
```

### 5.2 [2단계] 마이페이지 쿠폰함에서 QR 확인

**URL**: `/my/coupons`
**파일**: `components/MyCouponsPage.tsx` (또는 마이페이지 내 쿠폰 섹션)

```
사용자 화면:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  🎫 내 쿠폰함                                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🏝️ 가고싶은섬 - 가우도 카페 10% 할인   │   │
│  │ 유효기간: 2024-12-31까지              │   │
│  │ 상태: 사용 가능                       │   │
│  │                                     │   │
│  │ [QR 보기]  [주변 가맹점]              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🏝️ 가고싶은섬 - 장도 식당            │   │
│  │ 상태: 사용완료 (2024-06-20 사용)      │   │ ← 사용된 쿠폰
│  │                                     │   │
│  │ [QR 보기]                           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**사용자 액션 흐름**:
```
1. 마이페이지 > 쿠폰함 접속
   └─> GET /api/my/coupons 호출
   └─> 해당 사용자의 모든 쿠폰 조회 (claim_source='coupon_book' 포함)
   └─> 각 쿠폰의 status 표시 (ISSUED/USED/EXPIRED)

2. "QR 보기" 버튼 클릭
   └─> /coupon-qr/CB-ABC12345 페이지로 이동
```

### 5.3 [3단계] 쿠폰 QR 페이지에서 사용처리

**URL**: `/coupon-qr/:code`
**파일**: `components/CouponQRPage.tsx`

```
[상태: 사용 가능 (status='ISSUED')]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  🎫 쿠폰 QR 코드                             │
│                                             │
│  ┌─────────────────────┐                   │
│  │ █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█  │                   │
│  │ █ QR 코드 이미지  █  │                   │
│  │ █               █  │                   │
│  │ █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█  │                   │
│  └─────────────────────┘                   │
│                                             │
│  쿠폰 코드: CB-ABC12345                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 가맹점에서 이 QR 코드를 스캔하거나    │   │
│  │ 쿠폰 코드를 보여주세요                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ╔═════════════════════════════════════╗   │
│  ║  🟢 사용처리 (가맹점 직원용)          ║   │ ← 이 버튼!
│  ╚═════════════════════════════════════╝   │
│                                             │
│  [코드 복사]  [쿠폰함]                       │
└─────────────────────────────────────────────┘


[사용처리 버튼 클릭 후 확인 팝업]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  ⚠️ 가우도 카페에서 쿠폰을 사용하시겠습니까? │
│                                             │
│  (가맹점 직원이 고객 휴대폰에서              │
│   직접 눌러주세요)                          │
│                                             │
│  [취소]  [✓ 사용 완료]                      │
└─────────────────────────────────────────────┘


[상태: 사용완료 (status='USED')]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  🎫 쿠폰 QR 코드                             │
│                                             │
│  ┌─────────────────────┐                   │
│  │ QR 코드 (흐리게)     │                   │
│  └─────────────────────┘                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ✅ 사용 완료                         │   │
│  │ 사용일: 2024-06-20 14:00            │   │ ← 사용일시 표시!
│  └─────────────────────────────────────┘   │
│                                             │
│  ╔═════════════════════════════════════╗   │
│  ║  ⬜ 사용처리 (사용됨)      [비활성화] ║   │ ← 버튼 비활성화!
│  ╚═════════════════════════════════════╝   │
│                                             │
│  [코드 복사]  [쿠폰함]                       │
└─────────────────────────────────────────────┘
```

**사용처리 흐름**:
```
1. 사용자가 가맹점에서 휴대폰으로 /coupon-qr/CB-ABC12345 화면 보여줌

2. 가맹점 직원이 "사용처리 (가맹점 직원용)" 버튼 클릭
   └─> 확인 팝업 표시: "가우도 카페에서 쿠폰을 사용하시겠습니까?"

3. "사용 완료" 버튼 클릭
   └─> POST /api/coupon-book/use { couponId: 123 }
   └─> user_coupons 테이블 UPDATE:
       - status: "USED"
       - used_at: NOW()
       - used_partner_id: 5 (가맹점 ID, 선택적)
   └─> 토스트: "가우도 카페에서 쿠폰이 사용되었습니다!"

4. 버튼 상태 변경
   └─> "사용처리" 버튼 → "사용됨" (비활성화)
   └─> 사용일시 표시

5. 리뷰 팝업 표시 (이미 리뷰 작성했으면 표시 안함)
   └─> GET /api/coupon-book/review/check?userCouponId=123 호출
   └─> hasReview: false면 리뷰 팝업 표시
```

### 5.4 [4단계] 리뷰 작성

```
리뷰 팝업:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  🎁 리뷰 작성하고 포인트 받기!               │
│  가우도 카페 이용 후기를 남겨주세요           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🎁 리뷰 작성 시 100포인트 지급!      │   │
│  │ 포인트는 다음 주문 시 사용 가능합니다  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  만족도를 선택해주세요                        │
│  ⭐⭐⭐⭐⭐  (매우 만족)                      │
│                                             │
│  이용 후기 (선택)                            │
│  ┌─────────────────────────────────────┐   │
│  │ 분위기도 좋고 커피도 맛있었어요~      │   │
│  └─────────────────────────────────────┘   │
│  0/500                                      │
│                                             │
│  [나중에]  [🎁 리뷰 등록하고 100P 받기]      │
└─────────────────────────────────────────────┘
```

**리뷰 작성 흐름**:
```
1. 별점 선택 (1-5점)
2. 리뷰 텍스트 입력 (선택, 최대 500자)
3. "리뷰 등록하고 100P 받기" 버튼 클릭
   └─> POST /api/coupon-book/review
       {
         userCouponId: 123,
         rating: 5,
         comment: "분위기도 좋고 커피도 맛있었어요~"
       }
   └─> coupon_reviews 테이블에 INSERT (Neon PostgreSQL)
   └─> users 테이블의 points +100 업데이트
   └─> 토스트: "리뷰가 등록되었습니다! 100포인트가 지급되었습니다"
   └─> 팝업 닫힘

4. "나중에" 클릭 시 팝업만 닫힘 (나중에 마이페이지에서 리뷰 가능)
```

---

## 6. UI 컴포넌트 상세

### 6.1 CouponBookPage.tsx (수정 필요)

**파일 경로**: `components/CouponBookPage.tsx`

**현재 문제점**:
```
현재: partners 테이블에서 is_coupon_partner=1 조회
필요: coupons 테이블에서 coupon_category='couponbook' 조회
```

**수정해야 할 내용**:

```tsx
// ============================================
// 1. 상태 변경
// ============================================

// AS-IS (현재)
const [partners, setPartners] = useState([]);

// TO-BE (변경)
const [coupons, setCoupons] = useState([]);

// ============================================
// 2. 데이터 조회 함수 변경
// ============================================

// AS-IS (현재 - 잘못된 방식)
const fetchPartners = async () => {
  const res = await fetch('/api/coupon-book/partners');
  // partners 테이블에서 is_coupon_partner=1 조회
};

// TO-BE (변경 - 올바른 방식)
const fetchCoupons = async () => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/coupon-book/coupons', { headers });
  const data = await res.json();

  if (data.success) {
    setCoupons(data.data);
    // data.data 구조:
    // [
    //   {
    //     id: 33,
    //     name: "가고싶은섬",
    //     coupon_text: "10% 할인",  ← 이거 그대로 표시!
    //     description: "강진 가우도에서 사용가능",
    //     image_url: "https://...",
    //     coupon_book_name: "가고싶은섬",
    //     partner_name: "가우도 카페",
    //     is_claimed: false  ← 이미 받았으면 true
    //   },
    //   ...
    // ]
  }
};

// ============================================
// 3. "전체 받기" 핸들러 추가
// ============================================
const handleClaimAll = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    // 로그인 모달 표시
    setShowLoginModal(true);
    return;
  }

  setClaimingAll(true);
  try {
    const res = await fetch('/api/coupon-book/claim-all', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.success) {
      toast.success(`${data.data.claimedCount}개 쿠폰을 받았습니다!`);
      if (data.data.alreadyClaimedCount > 0) {
        toast.info(`${data.data.alreadyClaimedCount}개는 이미 받은 쿠폰입니다.`);
      }
      fetchCoupons(); // 목록 새로고침
    } else {
      toast.error(data.error || '쿠폰 받기 실패');
    }
  } catch (error) {
    toast.error('오류가 발생했습니다.');
  } finally {
    setClaimingAll(false);
  }
};

// ============================================
// 4. "개별 받기" 핸들러
// ============================================
const handleClaim = async (couponId: number) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    setShowLoginModal(true);
    return;
  }

  try {
    const res = await fetch('/api/coupon-book/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ couponId })
    });

    const data = await res.json();
    if (data.success) {
      toast.success('쿠폰을 받았습니다!');

      // 해당 쿠폰만 is_claimed: true로 업데이트
      setCoupons(prev => prev.map(c =>
        c.id === couponId ? { ...c, is_claimed: true } : c
      ));
    } else {
      toast.error(data.error || '쿠폰 받기 실패');
    }
  } catch (error) {
    toast.error('오류가 발생했습니다.');
  }
};

// ============================================
// 5. 렌더링 변경
// ============================================
return (
  <div className="container mx-auto p-4">
    {/* 헤더 */}
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">🏝️ 가고싶은섬 쿠폰북</h1>
      <div className="flex gap-2">
        <Button onClick={handleClaimAll} disabled={claimingAll}>
          {claimingAll ? '받는 중...' : '전체 받기'}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/partners/discount?couponBook=가고싶은섬')}
        >
          주변 가맹점 보기
        </Button>
      </div>
    </div>

    {/* 필터 탭 - "쿠폰" 아니고 "가고싶은섬"! */}
    <div className="flex gap-2 mb-4">
      <Button variant={filter === '가고싶은섬' ? 'default' : 'outline'}>
        가고싶은섬
      </Button>
    </div>

    {/* 쿠폰 목록 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {coupons.map(coupon => (
        <Card key={coupon.id} className="overflow-hidden">
          {/* 쿠폰 이미지 */}
          {coupon.image_url && (
            <img
              src={coupon.image_url}
              alt={coupon.name}
              className="w-full h-40 object-cover"
            />
          )}

          <CardContent className="p-4">
            {/* 쿠폰명 */}
            <h3 className="font-bold text-lg">{coupon.name}</h3>

            {/* 가맹점명 */}
            {coupon.partner_name && (
              <p className="text-sm text-gray-500">{coupon.partner_name}</p>
            )}

            {/* 할인 텍스트 - 이거 그대로 표시! */}
            <p className="text-purple-600 font-semibold mt-2">
              {coupon.discount_text}
            </p>

            {/* 설명 */}
            <p className="text-sm text-gray-600 mt-1">
              {coupon.description}
            </p>

            {/* 받기 버튼 */}
            <Button
              className="w-full mt-4"
              variant={coupon.is_claimed ? 'outline' : 'default'}
              disabled={coupon.is_claimed}
              onClick={() => handleClaim(coupon.id)}
            >
              {coupon.is_claimed ? '받기 완료 ✓' : '쿠폰 받기'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);
```

### 6.2 CouponQRPage.tsx (수정 필요)

**파일 경로**: `components/CouponQRPage.tsx`

**수정해야 할 내용**:

```tsx
// ============================================
// 1. 상태 추가
// ============================================
const [hasReview, setHasReview] = useState(false);

// ============================================
// 2. 쿠폰 정보 조회 시 리뷰 여부도 확인
// ============================================
useEffect(() => {
  const fetchCouponInfo = async () => {
    if (!code) return;

    try {
      const token = localStorage.getItem('auth_token');

      // 내 쿠폰 목록에서 해당 쿠폰 찾기
      const response = await fetch(`/api/my/coupons?status=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const coupon = data.data.find((c: any) => c.coupon_code === code);
        if (coupon) {
          setCouponInfo({
            id: coupon.id,
            claim_source: coupon.claim_source,
            partner_name: coupon.partner_name,
            status: coupon.status,
            used_at: coupon.used_at  // ← 사용일시 추가!
          });

          // 사용된 쿠폰이면 리뷰 작성 여부 확인
          if (coupon.status === 'USED') {
            const reviewRes = await fetch(
              `/api/coupon-book/review/check?userCouponId=${coupon.id}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const reviewData = await reviewRes.json();
            if (reviewData.success) {
              setHasReview(reviewData.data.hasReview);
            }
          }
        }
      }
    } catch (error) {
      console.error('쿠폰 정보 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchCouponInfo();
}, [code]);

// ============================================
// 3. 사용처리 후 리뷰 팝업 표시 조건 수정
// ============================================
const handleUseCoupon = async () => {
  if (!couponInfo?.id) return;

  setUsingCoupon(true);
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/coupon-book/use', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ couponId: couponInfo.id })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      toast.success(`${data.data.partner?.name || '가맹점'}에서 쿠폰이 사용되었습니다!`);
      setShowUseConfirm(false);

      // 쿠폰 상태 업데이트
      setCouponInfo(prev => prev ? {
        ...prev,
        status: 'USED',
        used_at: new Date().toISOString()  // 사용일시 추가
      } : null);

      // 리뷰 팝업 표시 (이미 리뷰 작성했으면 표시 안함!)
      if (!hasReview) {
        setShowReviewPopup(true);
        setReviewRating(5);
        setReviewComment('');
      }
    } else {
      toast.error(data.error || '쿠폰 사용에 실패했습니다');
    }
  } catch (error) {
    console.error('쿠폰 사용 오류:', error);
    toast.error('쿠폰 사용 중 오류가 발생했습니다');
  } finally {
    setUsingCoupon(false);
  }
};

// ============================================
// 4. 렌더링 - 사용완료 쿠폰 표시 수정
// ============================================

// 기존 코드 (약 271-277 라인):
{couponInfo?.status === 'USED' && (
  <div className="bg-gray-100 rounded-lg p-4 text-center">
    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
    <p className="text-gray-600 font-medium">이미 사용된 쿠폰입니다</p>
  </div>
)}

// 수정 후 (사용일시 추가):
{couponInfo?.status === 'USED' && (
  <div className="bg-gray-100 rounded-lg p-4 text-center">
    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
    <p className="text-gray-600 font-medium">사용 완료</p>
    {couponInfo.used_at && (
      <p className="text-sm text-gray-400 mt-1">
        사용일: {new Date(couponInfo.used_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    )}
  </div>
)}
```

---

## 7. API 상세

### 7.1 쿠폰북 쿠폰 목록 조회 (신규 생성 필요)

**파일**: `api/coupon-book/coupons.js`
**메서드**: `GET`
**URL**: `/api/coupon-book/coupons`

**요청**:
```
Headers:
  Authorization: Bearer <token>  (선택 - 로그인 시)
```

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "id": 33,
      "code": "ISLAND2024",
      "name": "가고싶은섬",
      "description": "강진 가우도, 보성 장도 등에서 사용가능",
      "discount_text": "10% 할인",
      "image_url": "https://example.com/coupon.jpg",
      "coupon_book_name": "가고싶은섬",
      "partner_name": "가우도 카페",
      "partner_address": "전남 강진군 가우도",
      "valid_until": "2024-12-31",
      "is_claimed": false
    }
  ]
}
```

**구현 로직**:
```javascript
// 1. coupons 테이블에서 coupon_category='couponbook' 조회
// 2. is_active=1, 유효기간 체크
// 3. 로그인 사용자면 user_coupons 조회해서 is_claimed 체크
// 4. partners 테이블 JOIN해서 가맹점 정보 포함
```

### 7.2 개별 쿠폰 받기 (기존)

**파일**: `api/coupon-book/claim.js`
**메서드**: `POST`
**URL**: `/api/coupon-book/claim`

**요청**:
```json
{
  "couponId": 33
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "userCouponId": 123,
    "couponCode": "CB-ABC12345"
  }
}
```

### 7.3 전체 받기 (신규 생성 필요)

**파일**: `api/coupon-book/claim-all.js`
**메서드**: `POST`
**URL**: `/api/coupon-book/claim-all`

**요청**:
```
Headers:
  Authorization: Bearer <token>  (필수)
```

**응답**:
```json
{
  "success": true,
  "data": {
    "claimedCount": 5,
    "alreadyClaimedCount": 2,
    "totalAvailable": 7
  }
}
```

### 7.4 쿠폰 사용처리 (기존)

**파일**: `api/coupon-book/use.js`
**메서드**: `POST`
**URL**: `/api/coupon-book/use`

**요청**:
```json
{
  "couponId": 123
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "status": "USED",
    "usedAt": "2024-06-20T14:00:00Z",
    "partner": {
      "id": 5,
      "name": "가우도 카페"
    }
  }
}
```

### 7.5 리뷰 작성 (기존)

**파일**: `api/coupon-book/review.js`
**메서드**: `POST`
**URL**: `/api/coupon-book/review`

**요청**:
```json
{
  "userCouponId": 123,
  "rating": 5,
  "comment": "좋았습니다"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "reviewId": 1,
    "pointsAwarded": 100
  }
}
```

### 7.6 리뷰 작성 여부 확인 (신규 생성 필요)

**파일**: `api/coupon-book/review/check.js`
**메서드**: `GET`
**URL**: `/api/coupon-book/review/check?userCouponId=123`

**요청**:
```
Headers:
  Authorization: Bearer <token>  (필수)
Query:
  userCouponId: 123
```

**응답 (리뷰 있음)**:
```json
{
  "success": true,
  "data": {
    "hasReview": true,
    "review": {
      "id": 1,
      "rating": 5,
      "review_text": "좋았습니다",
      "points_awarded": 100,
      "created_at": "2024-06-20T15:00:00Z"
    }
  }
}
```

**응답 (리뷰 없음)**:
```json
{
  "success": true,
  "data": {
    "hasReview": false
  }
}
```

---

## 8. 구현해야 할 것들

### 8.1 DB 스키마 확인/수정

```sql
-- coupons 테이블에 필요한 컬럼 확인
SHOW COLUMNS FROM coupons;

-- 없으면 추가
ALTER TABLE coupons ADD COLUMN discount_text VARCHAR(255) NULL;
ALTER TABLE coupons ADD COLUMN coupon_book_name VARCHAR(100) NULL;
```

### 8.2 신규 API 생성

| API | 파일 경로 | 상태 |
|-----|----------|------|
| 쿠폰 목록 | `api/coupon-book/coupons.js` | 신규 생성 필요 |
| 전체 받기 | `api/coupon-book/claim-all.js` | 신규 생성 필요 |
| 리뷰 확인 | `api/coupon-book/review/check.js` | 신규 생성 필요 |

### 8.3 UI 수정

| 컴포넌트 | 파일 경로 | 수정 내용 |
|----------|----------|----------|
| 쿠폰북 페이지 | `components/CouponBookPage.tsx` | partners → coupons 조회, 전체받기 버튼, 필터명 변경 |
| QR 페이지 | `components/CouponQRPage.tsx` | 사용일시 표시, 리뷰 중복 방지 |

### 8.4 체크리스트

```
□ coupons.discount_text 컬럼 확인/추가
□ GET /api/coupon-book/coupons API 생성
□ POST /api/coupon-book/claim-all API 생성
□ GET /api/coupon-book/review/check API 생성
□ CouponBookPage.tsx에서 /api/coupon-book/coupons 호출로 변경
□ CouponBookPage.tsx에 "전체 받기" 버튼 추가
□ CouponBookPage.tsx에 "주변 가맹점 보기" 버튼 추가
□ CouponBookPage.tsx 필터명 "쿠폰" → "가고싶은섬" 변경
□ CouponQRPage.tsx 사용완료 쿠폰에 사용일시 표시
□ CouponQRPage.tsx 리뷰 이미 작성했으면 팝업 표시 안함
```

---

## 9. 주의사항

### 9.1 절대 하지 말 것

```
❌ 가맹점 별도 대시보드 만들기
   → 가맹점 직원은 사용자 휴대폰에서 버튼 클릭

❌ 할인 금액 시스템에서 계산하기
   → discount_text는 표시용, 실제 할인은 가맹점에서 수동 적용

❌ 필터명 "쿠폰"으로 하기
   → "가고싶은섬" (쿠폰북 이름)으로 해야 함

❌ 리뷰 팝업 무조건 표시
   → 이미 리뷰 작성했으면 표시하면 안됨

❌ partners 테이블에서 쿠폰 조회
   → coupons 테이블에서 coupon_category='couponbook' 조회!
```

### 9.2 반드시 확인할 것

```
✅ 쿠폰 받기 시 로그인 체크
✅ 이미 받은 쿠폰 중복 발급 방지
✅ 사용완료 쿠폰 버튼 비활성화
✅ 사용완료 쿠폰에 사용일시 표시
✅ 리뷰 중복 작성 방지
✅ 포인트 지급 후 users 테이블 업데이트
```

---

*문서 최종 수정일: 2024년*
*작성자: Claude Code*
