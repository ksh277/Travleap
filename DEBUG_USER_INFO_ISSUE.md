# 주문자 정보 미표시 문제 디버깅 가이드

## 문제 상황
관리자 페이지 주문 관리에서 "주문자 정보" 열이 비어있음 (이름, 전화번호, 이메일 미표시)

## 검증 완료된 항목 ✅

### 1. 프론트엔드 표시 로직 (AdminPage.tsx)
**파일**: `components/AdminPage.tsx:3977-3989`

```typescript
<TableCell>
  <div className="space-y-1">
    {order.user_name && (
      <div className="text-sm font-medium">
        {order.user_name}
      </div>
    )}
    {order.user_email && (
      <div className="text-xs text-gray-600">
        {order.user_email}
      </div>
    )}
  </div>
</TableCell>
```

**상태**: ✅ 정상 - `order.user_name`과 `order.user_email`이 있으면 표시하도록 되어 있음

---

### 2. API 응답 로직 (admin/orders.js)
**파일**: `pages/api/admin/orders.js:216-217`

```javascript
return {
  id: order.id,
  user_name: user?.name || '',
  user_email: user?.email || '',
  // ... 기타 필드
};
```

**상태**: ✅ 정상 - Neon DB에서 조회한 사용자 정보를 반환하도록 되어 있음

---

### 3. 데이터베이스 조인 로직 (admin/orders.js)
**파일**: `pages/api/admin/orders.js:79-100`

```javascript
// 1. PlanetScale payments 테이블에서 user_id 수집
const userIds = [...new Set((result.rows || []).map(order => order.user_id).filter(Boolean))];

// 2. Neon PostgreSQL users 테이블에서 사용자 정보 조회
if (userIds.length > 0) {
  const usersResult = await poolNeon.query(
    `SELECT id, name, email FROM users WHERE id IN (${placeholders})`,
    userIds
  );

  // 3. userMap에 저장
  usersResult.rows.forEach(user => {
    userMap.set(user.id, user);
  });
}

// 4. 주문과 사용자 정보 병합
const user = userMap.get(order.user_id);
```

**상태**: ✅ 정상 - Dual DB (PlanetScale + Neon) 조인 로직 정상

---

### 4. 주문 생성 시 user_id 저장 (api/orders.js)
**파일**: `api/orders.js:569-580`

```javascript
INSERT INTO payments (
  user_id,  // ✅ user_id 컬럼 포함
  amount,
  payment_status,
  payment_method,
  gateway_transaction_id,
  notes,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())

[userId, categoryTotal, 'pending', ...]  // ✅ userId 값 전달
```

**상태**: ✅ 정상 - 주문 생성 시 user_id 저장

---

### 5. 프론트엔드 userId 전달 (PaymentPage.tsx)
**파일**: `components/PaymentPage.tsx:520`

```typescript
const orderResponse = await api.createOrder({
  userId: Number(user?.id) || 1,  // ⚠️ user?.id가 없으면 기본값 1
  items: mappedItems,
  // ...
});
```

**상태**: ⚠️ **주의** - `user?.id`가 undefined면 기본값 1 사용

---

## 디버깅 로그 추가 완료 ✅

### 추가된 로그

**파일**: `pages/api/admin/orders.js`

#### 1. user_id 수집 로그 (Line 81)
```javascript
console.log(`👥 [Orders] 수집된 user_id 목록:`, userIds);
```

#### 2. Neon DB 조회 결과 (Line 92-93)
```javascript
console.log(`👥 [Orders] Neon DB에서 조회된 사용자 수: ${usersResult.rows?.length || 0}`);
console.log(`👥 [Orders] 사용자 데이터:`, usersResult.rows);
```

#### 3. user_id 없음 경고 (Line 99)
```javascript
console.warn(`⚠️ [Orders] payments 테이블에 user_id가 없습니다!`);
```

#### 4. 주문별 사용자 정보 확인 (Line 140-146)
```javascript
if (!user && order.user_id) {
  console.warn(`⚠️ [Orders] order_id=${order.id}: user_id=${order.user_id}에 대한 사용자 정보 없음`);
} else if (!order.user_id) {
  console.warn(`⚠️ [Orders] order_id=${order.id}: user_id가 NULL입니다`);
} else {
  console.log(`✅ [Orders] order_id=${order.id}: user_id=${order.user_id}, name=${user.name}, email=${user.email}`);
}
```

---

## 다음 단계: 로그 확인 방법

### 1. 관리자 페이지 새로고침
1. 브라우저에서 관리자 페이지 접속
2. F12 개발자 도구 열기
3. "주문 관리" 탭 클릭
4. 서버 콘솔 확인 (터미널 or Vercel 로그)

### 2. 확인해야 할 로그

#### 시나리오 A: user_id가 payments 테이블에 없는 경우
```
⚠️ [Orders] payments 테이블에 user_id가 없습니다!
⚠️ [Orders] order_id=123: user_id가 NULL입니다
```

**원인**: 주문 생성 시 userId가 제대로 전달되지 않음
**해결**: PaymentPage.tsx의 `user?.id` 값 확인 필요

---

#### 시나리오 B: user_id는 있지만 Neon DB에 사용자 없음
```
👥 [Orders] 수집된 user_id 목록: [1, 2, 3]
👥 [Orders] Neon DB에서 조회된 사용자 수: 0
👥 [Orders] 사용자 데이터: []
⚠️ [Orders] order_id=123: user_id=1에 대한 사용자 정보 없음
```

**원인**: Neon PostgreSQL `users` 테이블에 해당 사용자가 없음
**해결**: 사용자 데이터 마이그레이션 필요

---

#### 시나리오 C: 정상 동작
```
👥 [Orders] 수집된 user_id 목록: [1, 2, 3]
👥 [Orders] Neon DB에서 조회된 사용자 수: 3
👥 [Orders] 사용자 데이터: [
  { id: 1, name: '홍길동', email: 'hong@example.com' },
  { id: 2, name: '김철수', email: 'kim@example.com' },
  { id: 3, name: '이영희', email: 'lee@example.com' }
]
✅ [Orders] order_id=123: user_id=1, name=홍길동, email=hong@example.com
```

**결과**: 정상 작동, 프론트엔드에 표시되어야 함

---

## 예상되는 문제 및 해결책

### 문제 1: Neon DB 연결 실패
**증상**: `Neon DB에서 조회된 사용자 수: 0`

**확인 사항**:
```bash
# 환경 변수 확인
echo $POSTGRES_DATABASE_URL
echo $DATABASE_URL
```

**해결책**: `.env` 파일에 Neon DB 연결 문자열 확인

---

### 문제 2: users 테이블에 데이터 없음
**증상**: user_id는 있지만 Neon에서 조회 안 됨

**확인 쿼리**:
```sql
-- Neon PostgreSQL
SELECT id, name, email, created_at FROM users ORDER BY id;
```

**해결책**: 사용자 데이터가 없으면 회원가입 필요

---

### 문제 3: payments 테이블에 user_id NULL
**증상**: `user_id가 NULL입니다`

**확인 쿼리**:
```sql
-- PlanetScale MySQL
SELECT id, user_id, gateway_transaction_id, created_at
FROM payments
WHERE gateway_transaction_id = 'ORDER_1761868148590_7746';
```

**해결책**:
1. 로그인 상태 확인 (`user?.id` 값 확인)
2. PaymentPage.tsx에서 user 객체 확인
3. 필요 시 user_id를 수동으로 업데이트

```sql
UPDATE payments
SET user_id = 1
WHERE gateway_transaction_id = 'ORDER_1761868148590_7746';
```

---

### 문제 4: 캐싱 문제
**증상**: DB에 데이터는 있지만 화면에 안 나옴

**해결책**:
1. 브라우저 캐시 삭제 (Ctrl + Shift + R)
2. API 응답 확인 (Network 탭에서 `/api/admin/orders` 응답 확인)
3. React 상태 확인 (React DevTools)

---

## 임시 해결책: 직접 DB 업데이트

현재 주문 `ORDER_1761868148590_7746`의 user_id를 수동으로 설정:

```sql
-- PlanetScale MySQL
UPDATE payments
SET user_id = <실제_사용자_ID>
WHERE gateway_transaction_id = 'ORDER_1761868148590_7746';
```

실제 사용자 ID는 Neon DB의 users 테이블에서 확인:

```sql
-- Neon PostgreSQL
SELECT id, name, email FROM users WHERE email = '<주문자_이메일>';
```

---

## 체크리스트

- [ ] 관리자 페이지 새로고침
- [ ] 서버 콘솔에서 로그 확인
- [ ] `수집된 user_id 목록` 로그 확인
- [ ] `Neon DB에서 조회된 사용자 수` 확인
- [ ] 각 주문의 user_id 상태 확인
- [ ] 문제 시나리오 식별 (A, B, C 중)
- [ ] 해당 해결책 적용
- [ ] 페이지 새로고침 후 주문자 정보 표시 확인

---

## 최종 검증

주문자 정보가 표시되면 성공:
```
주문번호: ORDER_1761868148590_7746
주문자 정보:
  홍길동
  hong@example.com
```

표시되지 않으면 서버 로그를 공유하여 추가 디버깅 필요.
