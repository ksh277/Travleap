# PlanetScale 설정 가이드

## 1. PlanetScale 계정 생성 및 데이터베이스 생성

1. [PlanetScale](https://planetscale.com) 가입
2. 새 데이터베이스 생성 (예: `travleap-db`)
3. `main` 브랜치가 자동으로 생성됨

## 2. 스키마 생성

PlanetScale 콘솔에서 또는 CLI를 통해 `schema.sql` 파일의 내용을 실행:

```bash
# PlanetScale CLI 설치 (선택사항)
npm install -g @planetscale/cli

# 데이터베이스에 연결하여 스키마 실행
pscale connect travleap-db main --execute-protocol
```

또는 PlanetScale 웹 콘솔의 "Console" 탭에서 직접 SQL 실행

## 3. 연결 정보 얻기

1. PlanetScale 대시보드에서 데이터베이스 선택
2. "Connect" 버튼 클릭
3. "Connect with: @planetscale/database" 선택
4. 연결 정보 복사:
   - Host: `xxx.psdb.cloud`
   - Username: `xxx`
   - Password: `xxx`

## 4. 환경 변수 설정

`.env` 파일에 다음 정보 추가:

```env
VITE_PLANETSCALE_HOST=your-host.psdb.cloud
VITE_PLANETSCALE_USERNAME=your-username
VITE_PLANETSCALE_PASSWORD=your-password
```

## 5. 연결 테스트

```bash
node test-db-connection.js
```

## 6. 프로덕션 배포 시 주의사항

- PlanetScale의 무료 플랜은 1개의 데이터베이스와 2개의 브랜치를 제공
- 프로덕션 환경에서는 `main` 브랜치를 보호하고 개발용 브랜치를 따로 생성 권장
- 환경 변수는 보안을 위해 배포 플랫폼의 환경 변수 설정 기능 사용

## 7. 스키마 변경 시

PlanetScale은 스키마 변경을 위해 브랜치를 사용:

1. 개발용 브랜치 생성
2. 스키마 변경
3. Deploy Request 생성하여 main 브랜치에 병합

## 8. 백업 및 모니터링

- PlanetScale은 자동 백업 제공
- 대시보드에서 쿼리 성능 및 사용량 모니터링 가능

## 문제 해결

### 연결 오류
- 환경 변수가 올바르게 설정되었는지 확인
- PlanetScale 대시보드에서 데이터베이스 상태 확인
- 브랜치가 활성화되어 있는지 확인

### 성능 최적화
- 인덱스 활용 (schema.sql에 이미 설정됨)
- 쿼리 최적화
- PlanetScale Insights 활용