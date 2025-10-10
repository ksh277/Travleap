# 🚀 API 연동 가이드 - PMS (숙박) & 렌트카

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [빠른 시작](#빠른-시작)
3. [숙박 (PMS) API 연동](#숙박-pms-api-연동)
4. [렌트카 API 연동](#렌트카-api-연동)
5. [테스트 방법](#테스트-방법)
6. [문제 해결](#문제-해결)

---

## 시스템 개요

### ✅ 현재 구현 상태

- ✅ **PlanetScale 클라우드 DB** - 완전 연동됨
- ✅ **PMS (숙박) API 시스템** - 코드 완성, API 키만 필요
- ✅ **렌트카 API 시스템** - 코드 완성, API 키만 필요
- ✅ **AdminPage 연동 UI** - 버튼 클릭으로 API 데이터 가져오기
- ✅ **실시간 재고 관리** - 캐싱 + 웹훅/폴링 지원
- ✅ **예약 플로우** - Hold → 결제 → 확정

### 🎯 필요한 것

**API 키만 있으면 바로 작동합니다!**

---

## 빠른 시작

### 1️⃣ API 키 받기

#### **숙박 (호텔) API**
- [CloudBeds](https://www.cloudbeds.com/api/) - 추천 (전 세계 40,000+ 숙박업소)
- [Booking.com API](https://www.booking.com/content/affiliates.html)
- [Agoda API](https://www.agoda.com/affiliates)

#### **렌트카 API**
- [Rentalcars.com](https://www.rentalcars.com/Affiliates.do) - 추천 (전 세계 최대)
- [CartTrawler](https://www.cartrawler.com/ct/)

### 2️⃣ 환경 변수 설정

`.env` 파일에 API 키 추가:

```bash
# PMS (숙박) API
PMS_CLOUDBEDS_API_KEY=your_actual_api_key_here

# 렌트카 API
RENTALCARS_API_KEY=your_actual_api_key_here
RENTALCARS_AFFILIATE_ID=your_affiliate_id_here
```

### 3️⃣ 서버 재시작

```bash
# 터미널에서 Ctrl+C로 서버 중지 후
npm run dev
node server.cjs
```

### 4️⃣ AdminPage에서 연동

1. 브라우저에서 `http://localhost:5174/admin` 접속
2. "상품 관리" 탭 클릭
3. "상품 추가" 버튼 클릭
4. **숙박** 또는 **렌트카** 카테고리 선택
5. **PMS 연동** 또는 **렌트카 API 설정** 버튼 클릭
6. 호텔 ID / API 정보 입력
7. **"데이터 불러오기"** 버튼 클릭
8. 자동으로 입력 폼에 데이터 채워짐
9. 확인/수정 후 저장

---

## 숙박 (PMS) API 연동

### 📌 지원하는 PMS

| PMS | 설명 | API 신청 |
|-----|------|----------|
| CloudBeds | 전 세계 40,000+ 호텔 | https://www.cloudbeds.com/api/ |
| Booking.com | 전 세계 최대 숙박 플랫폼 | https://www.booking.com/content/affiliates.html |
| Agoda | 아시아 중심 숙박 플랫폼 | https://www.agoda.com/affiliates |

### 🔧 AdminPage에서 사용하기

#### 1. 상품 추가 화면에서 카테고리를 "숙박"으로 선택

#### 2. "PMS 연동" 버튼 클릭

#### 3. PMS 정보 입력
```
Vendor: cloudbeds
Hotel ID: your_hotel_123
API Key: your_api_key
```

#### 4. "데이터 불러오기" 클릭

**자동으로 가져오는 정보:**
- ✅ 호텔명
- ✅ 위치 (주소)
- ✅ 설명
- ✅ 이미지 (호텔 사진)
- ✅ **객실 타입 목록** (Deluxe, Suite, Standard 등)
- ✅ **각 객실별:**
  - 객실명
  - 설명
  - 최대 인원
  - 침대 타입
  - 편의시설
  - **실시간 가격** (최근 30일 평균)
  - **실시간 재고** (현재 남은 방 개수)
  - 객실 이미지

#### 5. 입력 폼 확인 및 저장

폼에 자동으로 채워진 데이터를 확인하고, 필요하면 수정 후 저장합니다.

**저장되는 테이블:**
- `listings` - 호텔 기본 정보
- `listing_accommodation` - 숙박 상세 정보
- `pms_config` - PMS 연동 설정 (자동 동기화용)

### 📊 실시간 재고 관리

**자동 동기화 방식:**
1. **웹훅 (실시간)** - PMS에서 변경 알림 → 즉시 반영
2. **폴링 (5분마다)** - 주기적으로 PMS에서 데이터 가져오기
3. **캐싱 (90초)** - 빠른 조회를 위한 Redis 캐시

**재고 확인 플로우:**
```
사용자 예약 시도
↓
1. 캐시에서 재고 확인 (빠름)
↓
2. PMS에 Hold 생성 (180초 잠금)
↓
3. 결제 진행
↓
4. 예약 확정 → PMS에 전송
```

---

## 렌트카 API 연동

### 📌 지원하는 렌트카 API

| API | 설명 | 신청 |
|-----|------|------|
| Rentalcars.com | 전 세계 최대 렌트카 비교 플랫폼 | https://www.rentalcars.com/Affiliates.do |
| CartTrawler | B2B 렌트카 솔루션 | https://www.cartrawler.com/ct/ |

### 🔧 AdminPage에서 사용하기

#### 1. 상품 추가 화면에서 카테고리를 "렌트카"로 선택

#### 2. "🚗 렌트카 API 설정" 버튼 클릭

#### 3. API 정보 입력
```
API Key: your_rentalcars_api_key
Affiliate ID: your_affiliate_id
```

#### 4. 저장 후 검색 조건 입력
```
픽업 장소: CJU (제주공항)
픽업 날짜: 2025-11-01 10:00
반납 날짜: 2025-11-03 10:00
운전자 나이: 25
```

#### 5. "검색" 클릭

**자동으로 가져오는 정보:**
- ✅ 차량 목록 (모델, 브랜드)
- ✅ **실시간 가격** (기본 요금 + 세금 + 수수료)
- ✅ **실시간 재고** (예약 가능 여부)
- ✅ 차량 사진
- ✅ 상세 정보
  - 변속기 (자동/수동)
  - 연료 (휘발유/디젤/하이브리드/전기)
  - 좌석 수
  - 보험 (CDW, TP 등)
  - 취소 정책

#### 6. 원하는 차량 선택하여 DB 저장

**저장되는 테이블:**
- `listings` - 렌트카 기본 정보
- `listing_rentcar` - 렌트카 상세 정보
- `rentcar_api_settings` - API 연동 설정

### 🚗 예약 플로우

```
1. 사용자가 차량 검색
   ↓
2. API에서 실시간 차량 목록 가져오기
   ↓
3. 사용자가 차량 선택
   ↓
4. Quote 재검증 (가격/재고 확인, TTL 15분)
   ↓
5. 결제 진행
   ↓
6. 예약 확정 → API에 전송
   ↓
7. Voucher (바우처) 발급
```

---

## 테스트 방법

### 1️⃣ 로컬 테스트 (Mock 데이터)

API 키 없이도 테스트 가능합니다.

**숙박:**
1. AdminPage > 상품 추가 > 숙박 선택
2. PMS 연동 버튼 클릭
3. **"Mock 데이터 불러오기"** 버튼 클릭
4. 샘플 호텔 데이터가 자동으로 입력됨

**렌트카:**
1. AdminPage > 상품 추가 > 렌트카 선택
2. 렌트카 API 설정 버튼 클릭
3. "Test Mode" 체크박스 선택
4. 샘플 차량 데이터 표시

### 2️⃣ 실제 API 테스트

API 키 설정 후:

**숙박:**
```bash
# 1. .env 파일 확인
PMS_CLOUDBEDS_API_KEY=your_key

# 2. AdminPage에서 실제 호텔 ID 입력
Hotel ID: 123456

# 3. "데이터 불러오기" 클릭

# 4. 콘솔 확인
# ✅ [1/3] PMS에서 객실 타입 조회 중...
# ✅ [2/3] PMS에서 재고 및 요금 조회 중...
# ✅ [3/3] 데이터 변환 완료
```

**렌트카:**
```bash
# 1. .env 파일 확인
RENTALCARS_API_KEY=your_key

# 2. AdminPage에서 검색
픽업: CJU
날짜: 2025-11-01

# 3. API 응답 확인
# ✅ 20대 차량 검색됨
# ✅ 가격: ₩88,000 ~ ₩250,000
```

### 3️⃣ DB 확인

```sql
-- 저장된 호텔 확인
SELECT * FROM listings WHERE category = 'stay' ORDER BY created_at DESC LIMIT 5;

-- 저장된 렌트카 확인
SELECT * FROM listings WHERE category = 'rental' ORDER BY created_at DESC LIMIT 5;

-- PMS 설정 확인
SELECT * FROM pms_config;
```

---

## 문제 해결

### ❌ "PMS API 연결 실패"

**원인:**
- API 키가 잘못됨
- Hotel ID가 잘못됨
- API 할당량 초과

**해결:**
```bash
# 1. API 키 확인
echo $PMS_CLOUDBEDS_API_KEY

# 2. 서버 로그 확인
# server.cjs 터미널에서 에러 메시지 확인

# 3. API 상태 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.cloudbeds.com/v1/hotels/YOUR_HOTEL_ID
```

### ❌ "렌트카 검색 결과 없음"

**원인:**
- 픽업 장소 코드가 잘못됨
- 날짜가 과거임
- 운전자 나이 제한

**해결:**
```bash
# 1. 장소 코드 확인
# CJU (제주공항), GMP (김포공항), ICN (인천공항)

# 2. 날짜 형식 확인
# 2025-11-01T10:00:00+09:00

# 3. 운전자 나이 확인
# 최소 21세 이상
```

### ❌ "글자 깨짐"

**원인:**
- DB 콜레이션이 utf8mb4가 아님
- 더미 데이터 사용 중

**해결:**
```sql
-- PlanetScale DB는 자동으로 utf8mb4 사용
-- 실제 API에서 가져온 데이터는 글자 깨짐 없음

-- 더미 데이터 삭제
DELETE FROM listings WHERE id IN (더미_데이터_ID);
```

### ❌ "캐시 문제"

**원인:**
- Redis가 설치되지 않음
- 인메모리 캐시 사용 중

**해결:**
```bash
# Redis 설치 (선택사항)
docker run -d -p 6379:6379 redis:7-alpine

# .env에 추가
REDIS_URL=redis://localhost:6379

# 서버 재시작
```

---

## 🎉 성공 확인

### ✅ 숙박 연동 성공 시

1. **AdminPage 상품 목록**에 호텔이 표시됨
2. **HomePage**에서 호텔 카드가 보임
3. **DetailPage**에서 객실 타입별 정보 표시
4. **실시간 가격**과 **남은 방 개수** 표시

### ✅ 렌트카 연동 성공 시

1. **AdminPage 상품 목록**에 렌트카가 표시됨
2. **RentcarSearchPage**에서 차량 검색 가능
3. **DetailPage**에서 차량 상세 정보 표시
4. **실시간 가격**과 **예약 가능 여부** 표시

---

## 📞 문의

- 기술 문의: dev@travleap.com
- API 연동 문의: api@travleap.com

---

## 🔗 유용한 링크

### PMS (숙박)
- [CloudBeds API 문서](https://hotels.cloudbeds.com/api/docs/)
- [Booking.com API](https://connect.booking.com/)
- [utils/pms/README.md](utils/pms/README.md) - 시스템 아키텍처

### 렌트카
- [Rentalcars.com API](https://www.rentalcars.com/Affiliates.do)
- [CartTrawler 문서](https://docs.cartrawler.com/)
- [utils/rentcar/README.md](utils/rentcar/README.md) - API 스펙

---

## 🚀 다음 단계

1. ✅ API 키 받기
2. ✅ `.env` 파일에 추가
3. ✅ 서버 재시작
4. ✅ AdminPage에서 테스트
5. ✅ 실제 사용자로 예약 테스트
6. 🎯 프로덕션 배포!
