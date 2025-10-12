# Phase 8: 사용자 기능 및 실시간 시스템

Phase 8에서는 최종 사용자를 위한 완전한 렌트카 예약 경험과 실시간 재고 관리 시스템을 구축했습니다.

## 📋 구현 항목

### 1. 사용자용 렌트카 검색 페이지 ✅
**파일**: `app/rentcars/page.tsx`

**주요 기능**:
- 📅 **날짜/위치 검색**: 픽업/반납 날짜, 시간, 위치 선택
- 🔍 **고급 필터링**:
  - 차량 타입 (경차, 소형, 중형, 대형, SUV, 승합)
  - 좌석 수 (2인승 ~ 9인승)
  - 변속기 (자동/수동)
  - 연료 타입 (휘발유/경유/하이브리드/전기)
  - 주행거리 제한 (무제한/제한)
  - 가격 범위 슬라이더 (₩0 ~ ₩500,000)
  - 에어컨 필수 옵션
- 🎯 **정렬 옵션**: 가격 낮은순, 평점 높은순, 인기순
- 📱 **반응형 디자인**: 모바일/태블릿/데스크톱 최적화
- 🎨 **실시간 검색 결과**: RentcarCard 컴포넌트 활용

**검색 폼 구조**:
```typescript
interface SearchFilters {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  vehicleTypes: string[];
  transmission: 'all' | 'automatic' | 'manual';
  fuelType: 'all' | 'gasoline' | 'diesel' | 'hybrid' | 'electric';
  seats: number[];
  priceRange: [number, number];
  mileageType: 'all' | 'unlimited' | 'limited';
  airConditioning: boolean;
  sortBy: 'price' | 'rating' | 'popular';
}
```

**사용 예시**:
```tsx
// 검색 페이지 접근
// → /rentcars

// 검색 필터 적용
// 1. 날짜 선택: 2024-01-15 ~ 2024-01-18
// 2. 위치 선택: 인천국제공항
// 3. 차량 타입: SUV
// 4. 좌석: 5인승
// 5. 가격: ₩100,000 ~ ₩300,000
// → "검색" 클릭 → 15건의 결과 표시
```

---

### 2. 다단계 예약 프로세스 ✅
**파일**: `app/rentcars/booking/[rateKey]/page.tsx`

**4단계 예약 플로우**:

#### **Step 1: 차량 확인 & 추가 옵션 선택**
- 선택한 차량 상세 정보 (이미지, 스펙, 정책)
- 추가 옵션 선택:
  - GPS 내비게이션 (+₩10,000)
  - 어린이 카시트 (+₩15,000)
  - 추가 운전자 (+₩20,000)
- 체크박스로 옵션 추가/제거

#### **Step 2: 운전자 정보 입력**
- 필수 정보:
  - 성명 (성/이름)
  - 이메일
  - 전화번호
  - 운전면허 번호
  - 면허 발급일
  - 생년월일
- 선택 정보:
  - 주소
- 유효성 검증:
  - 만 21세 이상 확인
  - 면허 취득 1년 이상 확인

#### **Step 3: 결제 정보**
- 결제 수단 선택:
  - 신용카드
  - 계좌이체
  - 카카오페이
  - 토스
- 카드 정보 입력 (카드 선택시):
  - 카드 번호 (1234-5678-9012-3456)
  - 유효기간 (MM/YY)
  - CVC (3자리)
  - 카드 소유자
- 필수 약관 동의:
  - ✅ 이용약관 동의
  - ✅ 개인정보 처리방침 동의
  - ✅ 취소 및 환불 정책 동의

#### **Step 4: 예약 완료**
- 예약번호 표시 (#12345)
- 확인 메일 발송 안내
- 액션 버튼:
  - "예약 내역 보기" → `/mypage/rentcars`
  - "다른 차량 검색" → `/rentcars`

**진행 상태 표시**:
```tsx
[●] 차량 확인 → [○] 운전자 정보 → [○] 결제 → [○] 완료
[✓] 차량 확인 → [●] 운전자 정보 → [○] 결제 → [○] 완료
[✓] 차량 확인 → [✓] 운전자 정보 → [●] 결제 → [○] 완료
[✓] 차량 확인 → [✓] 운전자 정보 → [✓] 결제 → [●] 완료
```

**우측 사이드바 - 예약 요약**:
- 차량 정보 (모델, 제조사)
- 날짜 정보 (픽업/반납 날짜, 대여 기간)
- 가격 상세:
  - 기본 요금: ₩150,000
  - 세금: ₩15,000
  - GPS 내비게이션: ₩10,000
  - **총 금액: ₩175,000**
- 보증금 안내 (필요시)

---

### 3. 마이페이지 렌트카 섹션 ✅
**파일**: `app/mypage/rentcars/page.tsx`

**3개 탭 구조**:

#### **탭 1: 현재 예약 (5건)**
- 상태: `pending`, `confirmed`, `picked_up`, `in_use`
- 표시 정보:
  - 차량 이미지 & 모델명
  - 예약 상태 배지
  - 픽업/반납 날짜 및 시간
  - 픽업/반납 위치
  - 예약번호 (예: RC20240112001)
  - 총 금액
  - 업체 정보 (이름, 전화번호)
- 가능한 액션:
  - "예약 상세" 버튼
  - "예약 취소" 버튼 (취소 가능시)

#### **탭 2: 과거 예약 (15건)**
- 상태: `returned`, `completed`
- 추가 액션:
  - "리뷰 작성" 버튼 (리뷰 미작성시)
  - "리뷰 작성완료" 버튼 (비활성, 리뷰 작성시)

#### **탭 3: 취소 내역 (3건)**
- 상태: `cancelled`, `no_show`
- 취소 사유 표시
- 환불 정보

**예약 취소 다이얼로그**:
```
┌─────────────────────────────────────┐
│ 예약을 취소하시겠습니까?              │
│ 예약번호: RC20240112001              │
├─────────────────────────────────────┤
│ ⚠ 취소 정책에 따라 취소 수수료가      │
│   발생할 수 있습니다.                │
│                                     │
│ 총 결제 금액:      ₩180,000        │
│ 취소 수수료:       -₩10,000        │
│ ─────────────────────────────────  │
│ 환불 예정 금액:    ₩170,000        │
├─────────────────────────────────────┤
│          [취소]      [예약 취소]     │
└─────────────────────────────────────┘
```

**리뷰 작성 다이얼로그**:
```
┌─────────────────────────────────────┐
│ 리뷰 작성                            │
│ 현대 아반떼                          │
├─────────────────────────────────────┤
│ 별점: ★★★★★                         │
│                                     │
│ 리뷰 내용:                           │
│ ┌─────────────────────────────────┐ │
│ │ 차량 상태, 서비스, 전반적인 경험에 │ │
│ │ 대해 자세히 작성해주세요.         │ │
│ │ (최소 10자)                      │ │
│ └─────────────────────────────────┘ │
│ 0 / 500자                            │
├─────────────────────────────────────┤
│          [취소]      [리뷰 등록]     │
└─────────────────────────────────────┘
```

---

### 4. 실시간 재고 관리 시스템 (WebSocket) ✅

#### **서버 측 구현**
**파일**: `utils/websocket-server.ts`

**RentcarWebSocketServer 클래스**:
```typescript
class RentcarWebSocketServer {
  // 클라이언트 관리
  private connectedClients: Map<string, Socket>
  private vehicleSubscriptions: Map<number, Set<string>>
  private vendorSubscriptions: Map<number, Set<string>>

  // 주요 메서드
  attach(httpServer: HTTPServer)  // HTTP 서버에 연결
  handleConnection(socket: Socket) // 클라이언트 연결 처리

  // 구독 관리
  subscribeToVehicle(clientId, vehicleId)
  subscribeToVendor(clientId, vendorId)

  // 브로드캐스트
  broadcastVehicleAvailability(vehicleId, availability)
  broadcastPriceChange(vehicleId, priceData)
  broadcastBookingUpdate(bookingId, vendorId, bookingData)
  broadcastNotification(notification)

  getStats() // 연결 통계
}
```

**지원하는 이벤트**:
```typescript
// Client → Server
- authenticate: { userId, vendorId }
- subscribe:vehicle: vehicleId
- subscribe:vendor: vendorId
- unsubscribe:vehicle: vehicleId
- unsubscribe:vendor: vendorId

// Server → Client
- connected: { clientId, timestamp }
- authenticated: { success: true }
- subscribed: { type, id }
- inventory:availability: InventoryUpdate
- inventory:price: InventoryUpdate
- booking:update: InventoryUpdate
- notification: InventoryUpdate
```

**InventoryUpdate 타입**:
```typescript
interface InventoryUpdate {
  type: 'availability' | 'price' | 'booking' | 'notification';
  vehicleId?: number;
  vendorId?: number;
  data: any;
  timestamp: string;
}
```

#### **Custom Next.js Server**
**파일**: `server.ts`, `tsconfig.server.json`

```bash
# 개발 모드
npm run dev  # ts-node server.ts

# 프로덕션
npm run build
npm start    # NODE_ENV=production ts-node server.ts
```

서버 실행시:
```
> Ready on http://localhost:3000
> WebSocket ready on ws://localhost:3000
[WebSocket Stats] {
  connectedClients: 3,
  vehicleSubscriptions: 5,
  vendorSubscriptions: 1,
  totalSubscribers: 8
}
```

#### **클라이언트 측 구현**
**파일**: `hooks/useRentcarWebSocket.ts`

**3개의 커스텀 훅**:

1. **useRentcarWebSocket(options)** - 기본 WebSocket 훅
```typescript
const ws = useRentcarWebSocket({
  userId: 123,
  vendorId: 456,
  autoConnect: true
});

// 반환값
{
  isConnected: boolean;
  lastUpdate: InventoryUpdate | null;
  subscribeToVehicle: (vehicleId) => void;
  unsubscribeFromVehicle: (vehicleId) => void;
  subscribeToVendor: (vendorId) => void;
  unsubscribeFromVendor: (vendorId) => void;
  disconnect: () => void;
  connect: () => void;
}
```

2. **useVehicleAvailability(vehicleId)** - 특정 차량 구독
```typescript
const { availability, isConnected } = useVehicleAvailability(42);

// availability 업데이트시 자동으로 컴포넌트 재렌더링
useEffect(() => {
  if (availability?.isAvailable === false) {
    alert('차량이 예약되었습니다!');
  }
}, [availability]);
```

3. **useVendorBookings(vendorId)** - 업체 예약 구독 (관리자용)
```typescript
const { bookingUpdates, isConnected } = useVendorBookings(5);

// 새 예약이 들어올 때마다 bookingUpdates 배열에 추가됨
useEffect(() => {
  if (bookingUpdates.length > 0) {
    console.log('New booking:', bookingUpdates[0]);
  }
}, [bookingUpdates]);
```

**커스텀 이벤트 디스패치**:
```typescript
// 다른 컴포넌트에서 WebSocket 업데이트 감지
window.addEventListener('rentcar:availability', (event) => {
  const update = event.detail;
  console.log('Availability changed:', update);
});

window.addEventListener('rentcar:booking', (event) => {
  const update = event.detail;
  console.log('New booking:', update);
});

window.addEventListener('rentcar:price', (event) => {
  const update = event.detail;
  console.log('Price changed:', update);
});

window.addEventListener('rentcar:notification', (event) => {
  const update = event.detail;
  console.log('Notification:', update);
});
```

#### **관리자용 실시간 모니터**
**파일**: `components/admin/RealTimeInventoryMonitor.tsx`

**실시간 대시보드**:
- 🟢 **연결 상태 표시**: Wifi 아이콘 + 애니메이션
- 📊 **실시간 통계 카드**:
  - 총 차량 수
  - 현재 가용 차량 수 (실시간 업데이트)
  - 오늘 예약 수 (실시간 업데이트)
- 📡 **실시간 업데이트 피드**:
  - 최근 10개 업데이트 표시
  - 타입별 아이콘 & 색상 구분
  - 타임스탬프 표시
  - 업데이트 메시지 포맷팅
- 📋 **최근 예약 리스트**: 최근 5개 예약 표시

**사용 예시**:
```tsx
import { RealTimeInventoryMonitor } from '@/components/admin/RealTimeInventoryMonitor';

export default function VendorDashboard() {
  const vendorId = 5; // 현재 로그인한 업체 ID

  return (
    <div>
      <h1>실시간 재고 모니터</h1>
      <RealTimeInventoryMonitor vendorId={vendorId} />
    </div>
  );
}
```

**실시간 업데이트 예시**:
```
┌─────────────────────────────────────────────────┐
│ 🟢 실시간 연결됨                        [LIVE] │
│ WebSocket을 통해 실시간 업데이트를 수신하고      │
│ 있습니다                                        │
└─────────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│ 총 차량   │  │ 현재 가용 │  │ 오늘 예약 │
│   45     │  │   32     │  │    8     │
└──────────┘  └──────────┘  └──────────┘

실시간 업데이트                         [10개]
┌─────────────────────────────────────────────┐
│ 🚗 Vehicle #42          오후 3:42:15       │
│    예약 불가 - 신규 예약                    │
├─────────────────────────────────────────────┤
│ 📅 Vehicle #15          오후 3:41:03       │
│    새 예약 (#10523) - confirmed            │
├─────────────────────────────────────────────┤
│ 📈 Vehicle #28          오후 3:39:28       │
│    가격 변경: ₩120,000 → ₩110,000         │
└─────────────────────────────────────────────┘
```

---

## 🔧 설치 및 실행

### 1. 패키지 설치
```bash
npm install socket.io socket.io-client
```

### 2. 환경 변수 설정
`.env.local`:
```env
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 서버 실행
```bash
# 개발 모드 (package.json 수정 필요)
npm run dev  # ts-node --project tsconfig.server.json server.ts

# 프로덕션
npm run build
npm start
```

---

## 📊 사용 시나리오

### 시나리오 1: 일반 사용자의 렌트카 예약

1. **검색 단계** (`/rentcars`)
   - 날짜: 2024-01-15 ~ 2024-01-18 (3일)
   - 위치: 인천국제공항
   - 차량 타입: 중형
   - 좌석: 5인승
   - 가격: ₩100,000 ~ ₩200,000
   - → "검색" 클릭

2. **결과 확인**
   - 12건의 검색 결과 표시
   - 현대 아반떼, 기아 K5, 르노삼성 SM6 등
   - 가격 순으로 정렬
   - 각 카드에서 "예약하기" 클릭

3. **예약 프로세스** (`/rentcars/booking/RATE_123`)
   - **Step 1**: 차량 확인
     - GPS 내비게이션 추가 (+₩10,000)
     - 어린이 카시트 추가 (+₩15,000)
     - "다음" 클릭

   - **Step 2**: 운전자 정보
     - 성명: 홍길동
     - 이메일: hong@example.com
     - 전화: 010-1234-5678
     - 면허번호: 12-34-567890-12
     - 면허 발급일: 2020-01-01
     - 생년월일: 1990-01-01
     - "다음" 클릭

   - **Step 3**: 결제
     - 결제 수단: 신용카드
     - 카드번호: 1234-5678-9012-3456
     - 유효기간: 12/25
     - CVC: 123
     - 약관 동의 체크
     - "결제하기" 클릭

   - **Step 4**: 완료
     - 예약번호: #45678
     - 확인 메일 발송
     - "예약 내역 보기" → `/mypage/rentcars`

### 시나리오 2: 예약 취소 및 리뷰 작성

1. **마이페이지 접근** (`/mypage/rentcars`)
   - "현재 예약" 탭: 다음주 예약 1건
   - "과거 예약" 탭: 지난 달 여행 1건

2. **예약 취소**
   - 현재 예약 카드에서 "예약 취소" 클릭
   - 취소 다이얼로그 표시
   - 취소 수수료 확인 (₩10,000)
   - "예약 취소" 확정
   - → 취소 완료, "취소 내역" 탭으로 이동

3. **리뷰 작성**
   - 과거 예약 카드에서 "리뷰 작성" 클릭
   - 별점: 5점
   - 리뷰 내용: "차량 상태가 매우 좋았고, 서비스도 친절했습니다. 다음에도 이용하고 싶습니다."
   - "리뷰 등록" 클릭
   - → 리뷰 등록 완료

### 시나리오 3: 관리자의 실시간 재고 모니터링

1. **관리자 대시보드 접근**
   - 업체 관리자로 로그인 (vendorId: 5)
   - "실시간 재고 모니터" 메뉴 클릭

2. **WebSocket 연결**
   - 자동 연결: ws://localhost:3000
   - 인증: vendorId = 5
   - 구독: 업체 5의 모든 차량 및 예약

3. **실시간 업데이트 수신**
   - 오후 3:42:15 - Vehicle #42 예약 불가 (신규 예약)
   - 오후 3:41:03 - 새 예약 #10523 (confirmed)
   - 오후 3:39:28 - Vehicle #28 가격 변경

4. **통계 업데이트**
   - 총 차량: 45대
   - 현재 가용: 32대 → 31대 (자동 업데이트)
   - 오늘 예약: 8건 → 9건 (자동 업데이트)

5. **알림 수신**
   - 새 예약 알림: "새로운 예약이 접수되었습니다!"
   - 토스트 메시지 표시

---

## 🎯 주요 특징

### 1. 완전한 사용자 경험 (UX)
- ✅ 직관적인 검색 인터페이스
- ✅ 단계별 가이드가 있는 예약 프로세스
- ✅ 명확한 가격 및 정책 표시
- ✅ 실시간 피드백 (로딩 상태, 에러 메시지)

### 2. 실시간 데이터 동기화
- ✅ WebSocket 양방향 통신
- ✅ 차량 가용성 실시간 업데이트
- ✅ 예약 상태 실시간 알림
- ✅ 가격 변경 즉시 반영

### 3. 모바일 최적화
- ✅ 반응형 레이아웃
- ✅ 터치 제스처 지원
- ✅ 모바일 네비게이션

### 4. 접근성 (Accessibility)
- ✅ 키보드 네비게이션
- ✅ 명확한 라벨 및 설명
- ✅ 에러 메시지 표시

---

## 📈 성능 최적화

### 검색 페이지
- Lazy loading으로 이미지 최적화
- 필터 상태를 URL 쿼리로 관리 (공유 가능)
- 검색 결과 페이지네이션 (향후 구현)

### 예약 프로세스
- 단계별 데이터 저장 (새로고침 시 복구 가능)
- 결제 정보 보안 처리
- 예약 완료 후 세션 정리

### WebSocket
- 자동 재연결 (5회 시도)
- 연결 상태 시각적 표시
- 이벤트 디바운싱 (과도한 업데이트 방지)

---

## 🔐 보안 고려사항

### 사용자 데이터
- 운전면허 정보 암호화 저장
- 결제 정보는 PG사로 직접 전송 (서버 미저장)
- 개인정보 처리방침 동의 필수

### WebSocket
- 연결시 인증 토큰 확인
- vendorId/userId 권한 검증
- 구독 권한 확인 (본인 데이터만 접근)

### API
- Rate limiting (과도한 요청 방지)
- CORS 설정
- SQL Injection 방어

---

## 🧪 테스트 시나리오

### 검색 페이지
```typescript
// 1. 기본 검색
- 날짜 입력 → 검색 → 결과 표시 확인

// 2. 필터 적용
- 차량 타입 선택 → 결과 필터링 확인
- 가격 범위 조정 → 결과 업데이트 확인

// 3. 정렬
- 가격순 → 평점순 → 인기순 전환 확인

// 4. 에러 처리
- 날짜 미입력 → 에러 메시지 확인
- 위치 미입력 → 에러 메시지 확인
```

### 예약 프로세스
```typescript
// 1. 정상 플로우
- Step 1 → Step 2 → Step 3 → Step 4 완료

// 2. 뒤로가기
- Step 3 → "이전" → Step 2 데이터 유지 확인

// 3. 유효성 검증
- Step 2 필수 필드 미입력 → 다음 단계 차단
- Step 3 약관 미동의 → 결제 차단

// 4. 예약 완료
- 예약번호 생성 확인
- 예약 내역 페이지로 이동 확인
```

### WebSocket
```typescript
// 1. 연결
- 페이지 로드 → 자동 연결 → 연결 상태 표시

// 2. 구독
- 차량 ID 구독 → subscribed 이벤트 확인
- 업체 ID 구독 → subscribed 이벤트 확인

// 3. 업데이트 수신
- 서버에서 availability 전송 → 클라이언트 수신 확인
- 서버에서 booking 전송 → 클라이언트 수신 확인

// 4. 재연결
- 연결 끊김 → 자동 재연결 시도 확인
- 재연결 성공 → 구독 복원 확인
```

---

## 🚀 배포 체크리스트

### 환경 변수 설정
- [ ] `NEXT_PUBLIC_WS_URL` (프로덕션 WebSocket URL)
- [ ] `NEXT_PUBLIC_APP_URL` (프로덕션 앱 URL)
- [ ] `VITE_DATABASE_URL` (프로덕션 DB)

### 빌드 및 실행
- [ ] `npm run build` 성공 확인
- [ ] `npm start` 정상 작동 확인
- [ ] WebSocket 연결 정상 확인

### 기능 테스트
- [ ] 검색 페이지 작동
- [ ] 예약 프로세스 완료
- [ ] 마이페이지 조회
- [ ] 실시간 업데이트 수신

### 성능 테스트
- [ ] Lighthouse 점수 확인
- [ ] 모바일 반응성 확인
- [ ] WebSocket 부하 테스트

---

## 📚 관련 문서

- [Phase 1-4: 기본 시스템 구축](./RENTCAR_PHASE1-4_SUMMARY.md)
- [Phase 5: 시스템 개선](./RENTCAR_PHASE5_IMPROVEMENTS.md)
- [Phase 7: 엔터프라이즈 기능](./RENTCAR_PHASE7_ENTERPRISE.md)
- [전체 요약](./FINAL_COMPLETE_SUMMARY.md)

---

## ✅ Phase 8 완료 체크리스트

- [x] 사용자용 렌트카 검색 페이지 구현
- [x] 다단계 예약 프로세스 구현
- [x] 마이페이지 렌트카 섹션 구현
- [x] WebSocket 서버 구현
- [x] WebSocket 클라이언트 훅 구현
- [x] 실시간 재고 모니터 구현
- [x] socket.io 패키지 설치
- [x] Custom Next.js 서버 설정
- [x] 문서 작성

---

**Phase 8 완료!** 이제 Travleap 렌트카 시스템은 완전한 사용자 경험과 실시간 재고 관리를 제공합니다. 🎉
