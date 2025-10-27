# 렌트카 시스템 - GPT 사양서 vs 현재 구현 비교

## 📊 종합 평가

**현재 시스템 상태: ⭐⭐⭐⭐ (4/5)**

현재 구현이 GPT 사양서보다 **더 세분화되고 체계적**입니다!

---

## 1. 데이터베이스 테이블 비교

### ✅ 현재 시스템 (14개 테이블)

| 테이블명 | 상태 | GPT 사양 대응 |
|---------|------|--------------|
| `rentcar_vendors` | ✅ 존재 | ✅ 동일 |
| `rentcar_vehicles` | ✅ 존재 | ✅ 동일 |
| `rentcar_bookings` | ✅ 존재 | ⚠️ GPT는 `rentcar_rentals` |
| `rentcar_vehicle_blocks` | ✅ 존재 | ✅ 동일 |
| `rentcar_insurance` | ✅ 존재 | ✅ GPT `insurance_plans` 보다 우수 |
| `rentcar_insurance_products` | ✅ 존재 | ✅ 추가 세분화 |
| `rentcar_locations` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_pricing_policies` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_rental_deposits` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_rental_payments` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_rental_events` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_state_transitions` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_booking_history` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |
| `rentcar_additional_options` | ✅ 존재 | ✅ GPT 사양에 없음 (더 우수) |

### ❌ GPT 사양에만 있는 테이블 (4개)

| 테이블명 | 상태 | 현재 시스템 대응 | 필요성 |
|---------|------|----------------|--------|
| `rentcar_fee_rules` | ❌ 없음 | `rentcar_pricing_policies`로 부분 대체 | 🟡 추가 권장 |
| `rentcar_vehicle_assets` | ❌ 없음 | `rentcar_vehicles.images` JSON으로 대체 | 🟡 추가 권장 |
| `rentcar_handover_records` | ❌ 없음 | ❌ 대체 없음 | 🔴 **필수** |
| `rentcar_audit_logs` | ❌ 없음 | `rentcar_state_transitions`로 부분 대체 | 🟡 추가 권장 |

---

## 2. 핵심 기능 비교

### A. 예약/요금/가용성

| 기능 | GPT 사양 | 현재 구현 | 상태 |
|------|---------|----------|------|
| 시간 단위 예약 (1시간) | ✅ 필수 | ✅ 구현됨 | ✅ |
| 경계값 검증 (23h/24h/27h/47h) | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| hourly_rate × hours 계산 | ✅ 필수 | ✅ `rentcar_price_calculator.ts` | ✅ |
| 일단위 상한 (min(hourly, daily)) | ✅ 필수 | ✅ 구현됨 | ✅ |
| 수수료 (야간/공항/어린운전자) | ✅ 필수 | ⚠️ `rentcar_fee_rules` 없음 | 🟡 |
| 보험 요금 | ✅ 필수 | ✅ `rentcar_insurance` | ✅ |
| 가용성 계산 (overlap 제외) | ✅ 필수 | ✅ `rentcar_validation.ts` | ✅ |
| 동시성 제어 (FOR UPDATE) | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |

**평가:** 🟢 **우수** - 핵심 기능 대부분 구현됨

---

### B. 결제/보증금/환불

| 기능 | GPT 사양 | 현재 구현 | 상태 |
|------|---------|----------|------|
| 보증금 별도 결제 | ✅ 전략 A 권장 | ✅ `rentcar_rental_deposits` | ✅ |
| Pre-auth (승인보류) | 🟡 전략 B | ⚠️ 확인 필요 | ⚠️ |
| Toss 웹훅 멱등성 | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| 시간대별 환불율 | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| 3영업일 환급 문구 | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |

**평가:** 🟡 **양호** - 보증금 시스템 우수, 환불 정책 확인 필요

---

### C. 신원/자격/보안

| 기능 | GPT 사양 | 현재 구현 | 상태 |
|------|---------|----------|------|
| 연령/면허 만료일 검증 | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| PII 보호 (암호화 저장) | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| PII 마스킹 (응답) | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| 감사추적 (audit log) | ✅ 필수 | 🟡 `rentcar_state_transitions` | 🟡 |

**평가:** 🟡 **보통** - 보안 강화 필요

---

### D. 문서/계약/증빙

| 기능 | GPT 사양 | 현재 구현 | 상태 |
|------|---------|----------|------|
| 대여계약서 PDF 생성 | ✅ 필수 | ❌ 없음 | 🔴 |
| 인수/반납 사진 (4면) | ✅ 필수 | ❌ `handover_records` 없음 | 🔴 |
| 주행계/연료 사진 | ✅ 필수 | ❌ 없음 | 🔴 |
| 고객 서명 캡처 | ✅ 필수 | ❌ 없음 | 🔴 |

**평가:** 🔴 **부족** - **인수/반납 증빙 시스템 필수**

---

## 3. 벤더 대시보드 기능

### GPT 사양 필수 탭 (10개)

| 탭 | GPT 사양 | 현재 구현 | 상태 |
|------|---------|----------|------|
| 1. 대시보드 (오늘 업무) | ✅ 필수 | ✅ `RentcarVendorDashboard.tsx` | ✅ |
| 2. 캘린더 (차량 Gantt) | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| 3. 예약 목록 | ✅ 필수 | ✅ 구현됨 | ✅ |
| 4. 체크인 (픽업) | ✅ 필수 | ⚠️ API 확인 필요 | ⚠️ |
| 5. 체크아웃 (반납) | ✅ 필수 | ⚠️ API 확인 필요 | ⚠️ |
| 6. 차량 차단/외부예약 | ✅ 필수 | ✅ `rentcar_vehicle_blocks` | ✅ |
| 7. 플릿 관리 (차량) | ✅ 필수 | ✅ 구현됨 | ✅ |
| 8. 요금 & 가용성 | ✅ 필수 | ✅ `rentcar_pricing_policies` | ✅ |
| 9. 고객 관리 | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |
| 10. 정산/리포트 | ✅ 필수 | ⚠️ 확인 필요 | ⚠️ |

**평가:** 🟡 **양호** - 기본 기능 구현, 체크인/아웃 강화 필요

---

## 4. API 엔드포인트 비교

### GPT 사양 필수 API

| API | GPT 사양 | 확인 필요 | 우선순위 |
|------|---------|----------|---------|
| `GET /api/vendor/rentals` | ✅ 필수 | 📋 확인 | 🟢 |
| `POST /api/vendor/rentals/:id/check-in` | ✅ 필수 | 📋 확인 | 🔴 **필수** |
| `POST /api/vendor/rentals/:id/check-out` | ✅ 필수 | 📋 확인 | 🔴 **필수** |
| `POST /api/vendor/vehicle-blocks` | ✅ 필수 | 📋 확인 | 🟡 |
| `PATCH /api/vendor/vehicle-blocks/:id` | ✅ 필수 | 📋 확인 | 🟡 |
| `POST /api/vendor/external-booking` | ✅ 필수 | 📋 확인 | 🟡 |
| `GET /api/vendor/availability-calendar` | ✅ 필수 | 📋 확인 | 🟡 |
| `POST /api/vendor/fee-rules` | ✅ 필수 | 📋 확인 | 🟡 |
| `GET /api/vendor/settlements` | ✅ 필수 | 📋 확인 | 🟡 |

---

## 5. 🔴 즉시 추가 필요한 항목

### Priority 1 - 필수 (체크인/아웃 시스템)

1. **`rentcar_handover_records` 테이블 추가**
   ```sql
   CREATE TABLE rentcar_handover_records (
     id INT AUTO_INCREMENT PRIMARY KEY,
     booking_id INT NOT NULL,
     phase ENUM('pickup','return') NOT NULL,
     odometer INT,
     fuel_percent TINYINT,
     photos JSON,
     signature_url TEXT,
     notes TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **체크인 API 구현**
   - `POST /api/vendor/rentals/:id/check-in`
   - 사진 업로드 (최소 6장)
   - 주행계/연료 입력
   - 서명 캡처
   - 상태 전이: `confirmed` → `picked_up`

3. **체크아웃 API 구현**
   - `POST /api/vendor/rentals/:id/check-out`
   - 반납 사진 (최소 6장)
   - 연착/연료/손상 계산
   - 보증금 정산
   - 상태 전이: `picked_up` → `returned` → `completed`

### Priority 2 - 권장

4. **`rentcar_fee_rules` 테이블 추가**
   - 야간 인수 수수료
   - 공항 딜리버리
   - 어린운전자 추가요금
   - 추가운전자
   - 장거리 반납료

5. **`rentcar_vehicle_assets` 테이블 추가**
   - 차량 사진 관리
   - 등록증/보험증권 문서

6. **`rentcar_audit_logs` 테이블 추가**
   - 모든 상태 전이 기록
   - 직원 행동 로그
   - before/after JSON

---

## 6. 🟢 현재 시스템이 더 우수한 부분

1. **세분화된 결제/보증금 관리**
   - `rentcar_rental_deposits` (보증금 별도 관리)
   - `rentcar_rental_payments` (결제 별도 관리)
   - GPT 사양보다 더 체계적

2. **이벤트 추적 시스템**
   - `rentcar_rental_events` (모든 이벤트 기록)
   - `rentcar_state_transitions` (상태 전이 추적)
   - `rentcar_booking_history` (예약 이력)

3. **추가 옵션 관리**
   - `rentcar_additional_options` (카시트/GPS 등)

4. **지점 관리**
   - `rentcar_locations` (여러 지점 운영 가능)

5. **가격 정책 테이블**
   - `rentcar_pricing_policies` (세밀한 가격 관리)

---

## 7. 📋 추천 작업 순서

### Phase 1: 핵심 인수/반납 시스템 (1주)
1. ✅ `rentcar_handover_records` 테이블 생성
2. ✅ 체크인 API 구현 (`/api/vendor/rentals/:id/check-in`)
3. ✅ 체크아웃 API 구현 (`/api/vendor/rentals/:id/check-out`)
4. ✅ 사진 업로드 시스템 (S3 or 로컬)
5. ✅ 서명 캡처 기능

### Phase 2: 문서/증빙 시스템 (1주)
6. ✅ 대여계약서 PDF 생성
7. ✅ 영수증 PDF 생성
8. ✅ 이메일 발송 시스템

### Phase 3: 수수료/감사 시스템 (1주)
9. ✅ `rentcar_fee_rules` 테이블 및 API
10. ✅ `rentcar_audit_logs` 테이블 및 API
11. ✅ 정산 리포트 API

### Phase 4: 보안/검증 강화 (1주)
12. ✅ PII 암호화 저장
13. ✅ 응답 마스킹
14. ✅ 연령/면허 검증
15. ✅ Toss 웹훅 멱등성 검증

---

## 8. 종합 평가

### 🎯 현재 시스템 강점
- ✅ 데이터베이스 구조 매우 체계적
- ✅ 결제/보증금 분리 관리 우수
- ✅ 이벤트 추적 시스템 완비
- ✅ 가격 정책 세밀하게 관리

### 🔴 즉시 보완 필요
- ❌ **인수/반납 증빙 시스템 (handover_records)**
- ❌ **체크인/아웃 API 구현**
- ❌ **문서 생성 시스템 (PDF 계약서/영수증)**

### 🟡 추가 권장
- 🟡 수수료 규칙 테이블 (fee_rules)
- 🟡 차량 자산 관리 테이블 (vehicle_assets)
- 🟡 감사 로그 강화 (audit_logs)

---

## 결론

**현재 시스템은 GPT 사양서보다 데이터베이스 구조가 더 우수합니다!**

하지만 **인수/반납 증빙 시스템**만 추가하면 완벽한 렌트카 플랫폼이 됩니다.

**추천: Phase 1 (핵심 인수/반납 시스템)부터 시작하세요!**
