# 렌트카 벤더 계정 정보

## 벤더 계정 (120개 차량 등록용)

**이메일**: `vendor@test.com`
**비밀번호**: `vendor123`
**권한**: partner
**벤더 타입**: rentcar

## 로그인 방법

1. http://localhost:5177 접속
2. 우측 상단 "로그인" 클릭
3. 위 이메일/비밀번호 입력
4. 로그인 후 "벤더 대시보드" 접근

## 벤더 대시보드 기능

### 1. 차량 관리
- 차량 목록 조회
- 차량 등록 (수동/CSV/PMS API)
- 차량 수정/삭제
- 재고 관리

### 2. 예약 관리
- 예약 목록 조회
- 예약 상세 조회
- 예약 승인/거부
- 반납 검수

### 3. PMS 연동
- PMS 설정 (Socar, Greencar, Custom API)
- 자동 동기화 설정
- 수동 동기화 버튼
- 동기화 로그 확인

### 4. 통계
- 매출 통계
- 예약 통계
- 차량별 이용률

## PMS API로 120개 차량 등록 방법

### Option 1: 벤더 대시보드에서 PMS 설정

1. 벤더 대시보드 로그인
2. "PMS 설정" 탭 클릭
3. PMS 타입 선택 (예: Socar)
4. API 엔드포인트 입력: `http://localhost:3005/api/vehicles` (Mock API)
5. API 키 입력 (선택사항)
6. "설정 저장" 클릭
7. "지금 동기화" 버튼 클릭
8. → 120개 차량 자동 등록 완료!

### Option 2: API 직접 호출

```bash
# 1. 로그인해서 토큰 받기
curl -X POST http://localhost:3004/api/shared/auth \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "vendor@test.com",
    "password": "vendor123",
    "action": "login"
  }'

# 응답에서 token 복사

# 2. PMS 설정 저장
curl -X POST http://localhost:3004/api/vendor/rentcar/pms-settings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <위에서_받은_토큰>" \\
  -d '{
    "pms_type": "socar",
    "api_endpoint": "http://localhost:3005/api/vehicles",
    "api_key": "test-key",
    "auto_sync_enabled": true,
    "sync_interval_hours": 24
  }'

# 3. 수동 동기화 실행 (120개 차량 가져오기)
curl -X POST http://localhost:3004/api/vendor/rentcar/pms-sync-now \\
  -H "Authorization: Bearer <토큰>"
```

## Mock PMS API 서버 실행 (120개 차량 제공)

```bash
# Mock API 서버 시작 (별도 터미널)
cd c:\\Users\\ham57\\Desktop\\Travleap
npx tsx mock-rentcar-api.ts
```

Mock API는 포트 3005에서 실행되며, 120개의 샘플 차량 데이터를 제공합니다:
- 다양한 브랜드 (현대, 기아, BMW, 벤츠, 테슬라 등)
- 다양한 차종 (경차, 소형, 중형, 대형, SUV, 전기차)
- 실제 차량 모델 데이터

## 주의사항

- 이 계정은 개발/테스트용입니다
- 프로덕션 환경에서는 사용하지 마세요
- PMS 동기화 시 기존 데이터가 업데이트됩니다 (external_id 기준)

## 문제 해결

### Q: 로그인 후 "마이페이지"로 이동합니다
**A**: 계정의 role이 'partner'가 아닌 'user'로 설정된 경우입니다.
데이터베이스에서 users 테이블의 role을 'partner'로 변경하세요.

### Q: PMS 동기화가 실행되지 않습니다
**A**: Mock API 서버가 실행 중인지 확인하세요 (포트 3005)

### Q: 차량이 120개가 아닙니다
**A**: Mock API 응답을 확인하세요:
```bash
curl http://localhost:3005/api/vehicles
```
