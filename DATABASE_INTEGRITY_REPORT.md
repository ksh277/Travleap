# 렌트카 및 숙박 데이터베이스 무결성 점검 보고서

**점검일시**: 2025-11-11
**점검 범위**: 렌트카 및 숙박 관련 테이블 전체
**목적**: 데이터베이스 스키마 구조 및 데이터 무결성 확인 (수정 없이 문제점 보고만 수행)

---

## 📋 목차

1. [렌트카 관련 테이블](#1-렌트카-관련-테이블)
2. [숙박 관련 테이블](#2-숙박-관련-테이블)
3. [데이터 무결성](#3-데이터-무결성)
4. [잠재적 문제점](#4-잠재적-문제점)
5. [종합 평가](#5-종합-평가)

---

## 1. 렌트카 관련 테이블

### 1.1 rentcar_bookings (렌트카 예약)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 1건

#### 스키마 구조
- **기본키**: `id` (bigint)
- **유니크 키**: `booking_number`, `voucher_code`
- **주요 컬럼**: 75개 컬럼

#### ⚠️ 문제점

1. **필수 컬럼 명칭 불일치**
   - ❌ `total_amount` 컬럼 없음
   - ✅ `total_krw` 컬럼 사용 중 (동일 기능)
   - 💡 **권장사항**: 표준화된 컬럼명 사용 (total_amount vs total_krw)

2. **날짜 컬럼 명칭 불일치**
   - ❌ `return_date` 컬럼 없음
   - ✅ `dropoff_date` 컬럼 사용 중 (동일 기능)
   - 💡 **권장사항**: 표준화된 컬럼명 사용

3. **외래키 인덱스**
   - ✅ `vendor_id`, `vehicle_id`, `user_id`, `insurance_id`, `pickup_location_id`, `dropoff_location_id` 모두 인덱스 존재
   - 🔍 PlanetScale은 외래키 제약조건을 지원하지 않으므로 애플리케이션 레벨에서 참조 무결성 관리 필요

#### ✅ 정상 항목
- 참조 무결성: vehicle_id, vendor_id 모두 유효한 레코드 참조
- booking_number 중복 없음
- 날짜 정합성: pickup_date < dropoff_date
- 금액 정합성: total_krw > 0 (취소/환불 제외)
- 렌탈 기간: rental_days > 0

---

### 1.2 rentcar_vehicles (차량)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 21건

#### 스키마 구조
- **기본키**: `id` (bigint)
- **외래키**: `vendor_id` → `rentcar_vendors(id)`
- **주요 컬럼**: 39개

#### ⚠️ 문제점

1. **필수 컬럼 명칭 불일치**
   - ❌ `name` 컬럼 없음 → `display_name` 사용 중
   - ❌ `type` 컬럼 없음 → `vehicle_class`, `vehicle_type` 사용 중
   - ❌ `price_per_day` 컬럼 없음 → `daily_rate_krw` 사용 중
   - 💡 더 구체적인 컬럼명 사용으로 개선됨

#### ✅ 정상 항목
- vendor_id 참조 무결성 정상 (21건 모두 유효한 vendor 참조)
- 모든 차량에 필수 정보(브랜드, 모델, 가격) 존재

---

### 1.3 rentcar_vendors (렌트카 업체)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 3건

#### 스키마 구조
- **기본키**: `id` (bigint)
- **유니크 키**: `vendor_code`, `business_number`
- **주요 컬럼**: 42개

#### ✅ 정상 항목
- 모든 업체에 필수 정보 존재 (사업자명, 연락처, 이메일)
- 사업자 번호 중복 없음
- PMS 연동 설정 컬럼 존재 (pms_provider, pms_api_key 등)

#### 🔍 확인 필요
- 3개 업체 중 실제 운영 중인 업체 수
- PMS 연동 활성화 상태 확인

---

### 1.4 rentcar_insurance (보험)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 6건

#### ✅ 정상 항목
- 업체별 보험 옵션 데이터 존재
- 시간당 요금 체계 설정됨

---

### 1.5 rentcar_extras (추가 옵션)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 4건

#### ✅ 정상 항목
- GPS, 카시트 등 추가 옵션 데이터 존재
- 재고 관리 시스템 구현됨 (has_inventory, current_stock)

---

### 1.6 기타 렌트카 관련 테이블

발견된 추가 테이블들:
- `rentcar_locations` - 픽업/반납 위치
- `rentcar_pricing_policies` - 가격 정책
- `rentcar_rental_deposits` - 보증금 관리
- `rentcar_rental_events` - 렌탈 이벤트
- `rentcar_rental_payments` - 결제 관리
- `rentcar_state_transitions` - 상태 변경 이력
- `rentcar_vehicle_blocks` - 차량 예약 블록
- `rentcar_booking_history` - 예약 이력 (0건)
- `listing_rentcar` - 렌트카 리스팅 연결

**💡 평가**: 매우 체계적인 렌트카 시스템 구축됨

---

## 2. 숙박 관련 테이블

### 2.1 lodging_bookings (숙박 예약)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 0건 (아직 예약 없음)

#### 스키마 구조
- **기본키**: `id` (int)
- **유니크 키**: `booking_number`, `voucher_code`
- **주요 컬럼**: 37개

#### ⚠️ 문제점

1. **필수 컬럼 명칭 불일치**
   - ❌ `check_in` 컬럼 없음 → `check_in_date` 사용 중
   - ❌ `check_out` 컬럼 없음 → `check_out_date` 사용 중
   - ⚠️ 중복 컬럼: `check_in_date`, `check_out_date` + `checkin_date`, `checkout_date`
   - 💡 **권장사항**: 중복 컬럼 제거 및 표준화 필요

2. **외래키 설정**
   - `listing_id` → `listings(id)` - 인덱스 존재
   - `room_type_id` → `room_types(id)` - 인덱스 존재
   - `user_id` - 인덱스 존재

#### 🔍 확인 필요
- 데이터 없음으로 실제 무결성 테스트 불가
- 체크인/체크아웃 QR 시스템 구현됨 (voucher_code, qr_code)

---

### 2.2 room_types (객실 타입)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 0건

#### ⚠️ 문제점

1. **데이터 부족**
   - ❌ 객실 타입 데이터 없음
   - 💡 **필수**: 숙박 시스템 운영을 위해서는 최소 1개 이상의 객실 타입 필요

#### ✅ 정상 항목
- PMS 연동 필드 존재 (pms_vendor, pms_hotel_id, pms_room_type_id)
- listing_id 외래키 설정

---

### 2.3 room_inventory (객실 재고)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 0건

#### ⚠️ 문제점

1. **재고 데이터 없음**
   - ❌ 날짜별 객실 재고 데이터 미설정
   - 💡 **필수**: 예약 시스템 운영을 위해 재고 데이터 필요

---

### 2.4 listings (숙박 시설 - 범용 리스팅)

**✅ 테이블 존재**: 정상
**📊 숙박 카테고리 레코드**: 6건

#### 숙박 카테고리 분류
- `숙박`: 4건
- `stay`: 2건
- ⚠️ 카테고리 명칭 통일 필요

#### 숙박 시설 목록

1. **제주 오션뷰 호텔** (ID: 359)
   - 카테고리: 숙박
   - 위치: 제주시
   - 가격: 150,000원~
   - ⚠️ partner_id: NULL

2. **디럭스 더블룸** (ID: 369)
   - 카테고리: 숙박
   - 위치: 서울 강남
   - 가격: 150,000원~
   - ⚠️ partner_id: 238 (존재하지 않는 파트너)

3. **스위트룸** (ID: 370)
   - 카테고리: 숙박
   - 위치: 서울 강남
   - 가격: 280,000원~
   - ⚠️ partner_id: 238 (존재하지 않는 파트너)

4. **스탠다드 트윈룸** (ID: 371)
   - 카테고리: 숙박
   - 위치: 서울 강남
   - 가격: 120,000원~
   - ⚠️ partner_id: 238 (존재하지 않는 파트너)

5. **디럭스 더블룸** (ID: 380)
   - 카테고리: stay
   - 위치: (미지정)
   - 가격: 150,000원~
   - ✅ partner_id: 239 (테스트 호텔)

6. **스탠다드 트윈룸** (ID: 381)
   - 카테고리: stay
   - 위치: (미지정)
   - 가격: 100,000원~
   - ✅ partner_id: 239 (테스트 호텔)

#### ⚠️ 문제점

1. **위치 정보 누락**
   - ❌ 2건의 숙박 시설에 위치 정보 없음 (ID: 380, 381)

2. **가격 컬럼명 불일치**
   - ❌ `price` 컬럼 없음
   - ✅ `price_from`, `price_to` 사용 (가격 범위 표현)

#### 💰 가격 분포
- 최저가: 100,000원
- 최고가: 280,000원
- 평균가: 158,333원

---

### 2.5 listing_accommodation (숙박 상세 정보)

**✅ 테이블 존재**: 정상
**📊 레코드 수**: 4건

#### ⚠️ 문제점

1. **연결 문제**
   - 총 4건 중 1건만 listings 테이블과 연결됨
   - ❌ 3건이 존재하지 않는 listing_id 참조 (고아 레코드)
   - 💡 **긴급**: 참조 무결성 위반 데이터 정리 필요

#### ✅ 정상 항목
- 체크인/체크아웃 시간 설정
- 편의시설 정보 JSON 구조로 관리

---

### 2.6 partners (파트너 - 숙박 업체 포함)

**✅ 테이블 존재**: 정상
**📊 총 파트너**: 29건

#### 파트너 타입별 분포
- `general`: 22건
- `lodging`: 1건 (테스트 호텔, ID: 239)
- `NULL`: 6건

#### 🏨 숙박 파트너 상세

**테스트 호텔** (ID: 239)
- 위치: 신안군
- 연락처: 010-1234-5678
- 활성화: 예
- 연결된 listings: 2건 (ID: 380, 381)

#### ⚠️ 문제점

1. **참조 무결성 위반**
   - ❌ 3건의 숙박 listings가 존재하지 않는 partner_id(238) 참조
   - **영향받는 listings**: 369, 370, 371
   - 💡 **긴급**: 고아 레코드 처리 필요 (partner 생성 또는 데이터 삭제)

2. **파트너 타입 NULL**
   - 6건의 파트너에 partner_type이 NULL
   - 💡 파트너 타입 분류 필요

---

### 2.7 기타 숙박 관련 테이블

발견된 추가 테이블들:
- `lodging_booking_history` - 예약 이력 (0건)
- `lodging_cancellation_policies` - 취소 정책
- `room_media` - 객실 미디어

---

### 2.8 예약 시스템 비교

#### bookings (범용 예약 테이블)
- 총 레코드: 30건
- 숙박 카테고리 예약: 0건

#### lodging_bookings (숙박 전용 예약 테이블)
- 총 레코드: 0건

#### 💡 분석
- 현재 두 테이블 모두 숙박 예약 데이터 없음
- `bookings`는 범용 예약 시스템으로 사용 중
- `lodging_bookings`는 향후 전용 시스템으로 전환 가능성 있음
- 데이터 이중 관리 위험 없음 (아직 예약 없음)

---

## 3. 데이터 무결성

### 3.1 외래키 참조 무결성

#### ✅ 정상
- **렌트카**
  - `rentcar_bookings.vehicle_id` → `rentcar_vehicles.id` (1건 정상)
  - `rentcar_bookings.vendor_id` → `rentcar_vendors.id` (1건 정상)
  - `rentcar_vehicles.vendor_id` → `rentcar_vendors.id` (21건 정상)

#### ⚠️ 문제
- **숙박**
  - `listings.partner_id` → `partners.id`
    - ❌ 3건 참조 무결성 위반 (partner_id: 238 존재하지 않음)
  - `listing_accommodation.listing_id` → `listings.id`
    - ❌ 3건 고아 레코드 (연결되지 않은 listing_id)

---

### 3.2 NULL 값 체크

#### ✅ rentcar_bookings
- 필수 필드에 NULL 값 없음
- user_id, vehicle_id, vendor_id, booking_number, total_krw, status 모두 값 존재

#### ✅ listings (숙박)
- 제목: 모두 존재
- 가격: 모두 존재
- 편의시설: 모두 존재
- 최대 수용 인원: 모두 존재
- ⚠️ 위치: 2건 누락 (ID: 380, 381)

---

### 3.3 데이터 정합성

#### ✅ rentcar_bookings
- 날짜 정합성: pickup_date < dropoff_date 정상
- 금액 정합성: total_krw > 0 (취소/환불 제외) 정상
- 렌탈 기간: rental_days > 0 정상

#### 🔍 lodging_bookings
- 데이터 없음으로 정합성 테스트 불가

---

### 3.4 중복 데이터

#### ✅ 정상
- `rentcar_bookings.booking_number`: 중복 없음 (UNIQUE 제약조건)
- `rentcar_vendors.vendor_code`: 중복 없음 (UNIQUE 제약조건)
- `partners.business_number`: 중복 없음

---

## 4. 잠재적 문제점

### 4.1 테이블 존재 관련

#### ❌ 숙박 전용 테이블 미사용
- `accommodation_bookings`: 존재하지 않음
- `accommodation_partners`: 존재하지 않음
- `accommodation_rooms`: 존재하지 않음
- 💡 대신 `lodging_bookings`, `partners`, `room_types` 사용 중

#### 🔍 확인 필요
- 렌트카는 전용 테이블 체계 (`rentcar_*`)
- 숙박은 부분적으로 범용 테이블(`listings`, `partners`) + 전용 테이블(`lodging_*`) 혼용
- 시스템 일관성 측면에서 개선 검토 필요

---

### 4.2 필수 컬럼 명칭 불일치

#### ⚠️ 렌트카
- `total_amount` → `total_krw` 사용
- `return_date` → `dropoff_date` 사용
- `name` → `display_name` 사용
- `type` → `vehicle_class`, `vehicle_type` 사용
- `price_per_day` → `daily_rate_krw` 사용

#### ⚠️ 숙박
- `check_in`, `check_out` → `check_in_date`, `check_out_date` 사용
- `price` → `price_from`, `price_to` 사용
- ⚠️ 중복: `check_in_date` + `checkin_date`, `check_out_date` + `checkout_date`

#### 💡 권장사항
- 컬럼명 표준화 가이드라인 수립
- 통화 단위 명시 방식 통일 (krw suffix vs currency 컬럼)

---

### 4.3 데이터 타입 불일치

#### 🔍 확인된 항목
- 가격: `int` (rentcar) vs `decimal(10,2)` (lodging)
- ID: `bigint` vs `int` 혼용
- 💡 일관성 검토 필요하나 기능상 문제는 없음

---

### 4.4 샘플 데이터 부족

#### ❌ 데이터 없는 테이블
- `lodging_bookings`: 0건 → 실제 운영 전
- `room_types`: 0건 → 🚨 **긴급**: 숙박 운영을 위해 필수
- `room_inventory`: 0건 → 🚨 **긴급**: 예약 시스템 운영 필수
- `rentcar_booking_history`: 0건
- `lodging_booking_history`: 0건

#### ⚠️ 데이터 부족 (1건만)
- `rentcar_bookings`: 1건 (테스트 데이터)
- 💡 실제 서비스 시작 전으로 추정

---

### 4.5 참조 무결성 위반 (고아 레코드)

#### 🚨 긴급 조치 필요

1. **listings → partners (숙박)**
   - 3건의 listings가 존재하지 않는 partner_id(238) 참조
   - **영향**: ID 369, 370, 371
   - **조치 방안**:
     - 옵션 1: partner_id 238 파트너 생성
     - 옵션 2: 해당 listings 삭제
     - 옵션 3: partner_id를 NULL 또는 유효한 ID로 변경

2. **listing_accommodation → listings**
   - 3건의 상세 정보가 연결되지 않은 listing_id 참조
   - **조치 방안**:
     - 옵션 1: 고아 레코드 삭제
     - 옵션 2: 유효한 listing_id로 매핑

---

### 4.6 중복 컬럼

#### ⚠️ lodging_bookings
```
check_in_date  + checkin_date   (중복)
check_out_date + checkout_date  (중복)
```
- 💡 하나로 통일 필요 (데이터 정합성 유지 어려움)

---

### 4.7 PlanetScale 제약사항

#### 🔍 외래키 제약조건 미지원
- PlanetScale은 외래키 제약조건을 지원하지 않음
- 인덱스는 존재하나 DB 레벨 제약조건은 없음
- 💡 애플리케이션 레벨에서 참조 무결성 관리 필수
- 💡 정기적인 데이터 무결성 점검 스크립트 실행 권장

---

## 5. 종합 평가

### 5.1 렌트카 시스템

#### ✅ 강점
1. **체계적인 테이블 구조**
   - 예약, 차량, 업체, 보험, 추가옵션, 위치, 결제, 보증금, 이벤트 등 세분화
   - 상태 관리 및 이력 추적 시스템 구현

2. **완전한 데이터 무결성**
   - 모든 외래키 참조 정상
   - NULL 값 없음
   - 데이터 정합성 정상

3. **PMS 연동 준비**
   - API 연동 필드 구비
   - 동기화 설정 가능

#### ⚠️ 개선점
1. 컬럼명 표준화 (total_krw vs total_amount)
2. 실제 운영 데이터 부족 (1건만 존재)

#### 📊 평가: **85/100** (우수)

---

### 5.2 숙박 시스템

#### ✅ 강점
1. **다양한 테이블 준비**
   - 예약, 객실 타입, 재고, 상세 정보, 미디어 등 구성

2. **유연한 구조**
   - listings 테이블 + 전용 테이블 조합
   - PMS 연동 필드 구비

3. **QR 체크인 시스템**
   - voucher_code, qr_code 구현

#### 🚨 긴급 문제
1. **참조 무결성 위반**
   - 3건의 listings가 존재하지 않는 partner 참조
   - 3건의 listing_accommodation 고아 레코드

2. **필수 데이터 부족**
   - room_types: 0건 → 객실 타입 필수
   - room_inventory: 0건 → 재고 관리 필수
   - 예약 데이터 없음

3. **중복 컬럼**
   - check_in_date + checkin_date
   - check_out_date + checkout_date

#### ⚠️ 개선점
1. 고아 레코드 정리
2. 필수 데이터 입력 (객실 타입, 재고)
3. 중복 컬럼 제거
4. 카테고리 명칭 통일 (숙박 vs stay)
5. 위치 정보 보완 (2건 누락)

#### 📊 평가: **55/100** (개선 필요)

---

### 5.3 우선순위별 조치사항

#### 🚨 긴급 (P0) - 즉시 조치
1. **참조 무결성 위반 해결**
   - listings (369, 370, 371) → partner_id 238 문제 해결
   - listing_accommodation 고아 레코드 정리 (3건)

2. **필수 데이터 입력**
   - room_types 최소 1개 이상 등록
   - room_inventory 날짜별 재고 설정

#### ⚠️ 높음 (P1) - 2주 내
1. **중복 컬럼 제거**
   - lodging_bookings의 check_in_date vs checkin_date 통일

2. **데이터 보완**
   - 숙박 시설 위치 정보 입력 (2건)
   - 카테고리 명칭 통일 (숙박 vs stay)

3. **컬럼명 표준화**
   - 금액 컬럼명 통일 (total_krw vs total_amount)
   - 날짜 컬럼명 통일 (dropoff_date vs return_date)

#### 🔍 보통 (P2) - 1개월 내
1. **데이터 타입 일관성 검토**
   - 가격 타입 (int vs decimal)
   - ID 타입 (bigint vs int)

2. **파트너 타입 분류**
   - NULL 파트너 타입 6건 분류

3. **무결성 점검 자동화**
   - 정기 점검 스크립트 스케줄링
   - 알림 시스템 구축

---

### 5.4 최종 평가

| 항목 | 렌트카 | 숙박 | 비고 |
|------|--------|------|------|
| 테이블 구조 | ✅ 우수 | ✅ 양호 | 렌트카가 더 체계적 |
| 데이터 무결성 | ✅ 정상 | 🚨 문제 | 숙박 참조 무결성 위반 |
| 필수 데이터 | 🔍 부족 | 🚨 부족 | 둘 다 실제 데이터 부족 |
| 컬럼명 일관성 | ⚠️ 개선 필요 | ⚠️ 개선 필요 | 표준화 필요 |
| PMS 연동 준비 | ✅ 완료 | ✅ 완료 | 둘 다 준비됨 |
| 전체 평가 | **85/100** | **55/100** | |

---

## 📌 권장사항 요약

### 즉시 조치 (1주일 내)
1. ✅ 숙박 listings의 partner_id 238 문제 해결
2. ✅ listing_accommodation 고아 레코드 3건 정리
3. ✅ room_types 데이터 등록
4. ✅ room_inventory 재고 데이터 설정

### 단기 조치 (2주~1개월)
1. ✅ 중복 컬럼 제거 및 통일
2. ✅ 숙박 시설 위치 정보 보완
3. ✅ 카테고리 명칭 표준화

### 중장기 조치 (1~3개월)
1. ✅ 컬럼명 표준화 가이드라인 수립
2. ✅ 데이터 타입 일관성 개선
3. ✅ 무결성 점검 자동화 시스템 구축

---

**보고서 작성**: Claude Code
**점검 스크립트 위치**: `C:\Users\ham57\Desktop\Travleap\scripts\`
- `check-rentcar-accommodation-integrity.cjs`
- `check-additional-integrity.cjs`
- `check-lodging-tables-detail.cjs`
- `check-partners-table.cjs`
