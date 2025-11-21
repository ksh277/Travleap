# Travleap ↔ Pinto 양방향 로그인 연동 가이드

> 한쪽에서 로그인하면 다른 쪽에서도 자동으로 로그인 유지

---

## 📋 **개요**

**목표:**
- Travleap에서 로그인 → Pinto로 이동 → 로그인 유지 ✅
- Pinto에서 로그인 → Travleap로 이동 → 로그인 유지 ✅

**원리:**
- JWT 토큰을 URL 파라미터로 전달
- 같은 DB, 같은 JWT_SECRET 사용

---

## ⚙️ **1단계: 환경변수 설정**

### Travleap `.env`
```env
JWT_SECRET=your_super_secret_key_12345
POSTGRES_DATABASE_URL=postgresql://user:pass@host/database
```

### Pinto `.env`
```env
JWT_SECRET=your_super_secret_key_12345  # ⭐ Travleap과 동일
POSTGRES_DATABASE_URL=postgresql://user:pass@host/database  # ⭐ Travleap과 동일
```

**중요:** `JWT_SECRET`과 `POSTGRES_DATABASE_URL`이 **완전히 동일**해야 함!

---

## 🔧 **2단계: Travleap 코드 추가**

### A. 중앙 세션 확인 API 생성

**파일:** `api/auth/get-session.js` (새로 만들기)

```javascript
const jwt = require('jsonwebtoken');
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, loggedIn: false });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const sql = neon(process.env.POSTGRES_DATABASE_URL);
    const users = await sql`
      SELECT id, email, username, name, role
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, loggedIn: false });
    }

    const user = users[0];

    return res.json({
      success: true,
      loggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      },
      token  // 토큰 그대로 반환
    });
  } catch (error) {
    return res.status(401).json({ success: false, loggedIn: false });
  }
};
```

### B. App.tsx에 토큰 수신 코드 추가

**파일:** `App.tsx`

`AppContent` 함수 안에 추가:

```tsx
function AppContent() {
  const { login } = useAuth();

  // 🔥 Pinto에서 넘어온 토큰 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');

    if (token) {
      console.log('✅ Pinto에서 토큰 받음');
      localStorage.setItem('auth_token', token);

      // 사용자 정보 조회
      fetch('/api/auth/get-session', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          login(data.user, data.token);
        }
      });

      // URL 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    // ... 기존 코드
  );
}
```

### C. Pinto 이동 버튼 추가

**파일:** `components/Header.tsx` (또는 MyPage.tsx)

```tsx
const goToPinto = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    window.location.href = `https://pinto.vercel.app?auth_token=${token}`;
  } else {
    toast.error('로그인이 필요합니다');
  }
};

// JSX에 버튼 추가
<Button onClick={goToPinto}>Pinto로 이동</Button>
```

---

## 🔧 **3단계: Pinto 코드 추가**

### A. App.tsx 전체 구조

**파일:** `Pinto/src/App.tsx`

```tsx
import { useEffect, useState } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🔥 초기 로딩 시 세션 확인
  useEffect(() => {
    const initAuth = async () => {
      // 1. URL에서 토큰 확인 (Travleap에서 넘어온 경우)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('auth_token');

      if (urlToken) {
        localStorage.setItem('auth_token', urlToken);
        window.history.replaceState({}, '', window.location.pathname);
      }

      // 2. 저장된 토큰으로 세션 확인
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      try {
        const response = await fetch('https://travelap.vercel.app/api/auth/get-session', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.loggedIn) {
          setUser(data.user);
          setIsLoggedIn(true);
          console.log('✅ 로그인 유지됨:', data.user.email);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        localStorage.removeItem('auth_token');
      }
    };

    initAuth();
  }, []);

  // 🔥 Travleap으로 이동
  const goToTravleap = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      window.location.href = `https://travelap.vercel.app?auth_token=${token}`;
    }
  };

  return (
    <div>
      <h1>Pinto</h1>

      {isLoggedIn ? (
        <div>
          <p>안녕하세요, {user?.name}님!</p>
          <button onClick={goToTravleap}>Travleap으로 이동</button>
        </div>
      ) : (
        <p>로그인이 필요합니다</p>
      )}
    </div>
  );
}

export default App;
```

### B. Pinto 로그인 API (선택)

Pinto에서도 직접 로그인할 수 있게 하려면:

**파일:** `Pinto/api/login.js`

```javascript
// Travleap의 api/login.js와 동일한 코드 사용
// 같은 DB, 같은 JWT_SECRET 사용하므로 토큰 호환됨
```

---

## 🔄 **동작 흐름**

### **시나리오 1: Travleap → Pinto**

```
1. Travleap에서 로그인
2. "Pinto로 이동" 버튼 클릭
3. https://pinto.vercel.app?auth_token=JWT_TOKEN 으로 이동
4. Pinto에서 토큰 받아서 저장
5. Travleap API로 세션 검증
6. Pinto에서 로그인 상태 유지 ✅
```

### **시나리오 2: Pinto → Travleap**

```
1. Pinto에서 로그인
2. "Travleap으로 이동" 버튼 클릭
3. https://travelap.vercel.app?auth_token=JWT_TOKEN 으로 이동
4. Travleap에서 토큰 받아서 저장
5. Travleap API로 세션 검증
6. Travleap에서 로그인 상태 유지 ✅
```

### **시나리오 3: Pinto 새로고침**

```
1. Pinto 페이지 새로고침
2. localStorage에서 토큰 확인
3. Travleap API로 세션 검증
4. 로그인 상태 유지 ✅
```

---

## ✅ **테스트 방법**

1. **Travleap 로그인 → Pinto 이동**
   - Travleap에서 로그인
   - "Pinto로 이동" 버튼 클릭
   - Pinto에서 자동 로그인 확인

2. **Pinto 로그인 → Travleap 이동**
   - Pinto에서 로그인
   - "Travleap으로 이동" 버튼 클릭
   - Travleap에서 자동 로그인 확인

3. **새로고침 테스트**
   - Pinto에서 새로고침 (F5)
   - 로그인 상태 유지 확인

---

## 🔒 **보안 체크리스트**

- [x] HTTPS 사용 (Vercel 자동 제공)
- [x] URL 파라미터 즉시 제거 (`history.replaceState`)
- [x] JWT 만료 시간 설정 (7일)
- [x] CORS 설정
- [x] 같은 JWT_SECRET 사용

---

## 🐛 **트러블슈팅**

### 문제 1: 토큰이 전달되지 않음
```
확인: localStorage.getItem('auth_token')이 null인지 확인
해결: 로그인 API에서 토큰을 localStorage에 저장하는지 확인
```

### 문제 2: CORS 에러
```
확인: Travleap의 /api/auth/get-session에서 CORS 설정 확인
해결: Access-Control-Allow-Origin 헤더 추가
```

### 문제 3: JWT 검증 실패
```
확인: 양쪽 .env의 JWT_SECRET이 동일한지 확인
해결: 환경변수 재확인 및 재배포
```

---

## 📝 **요약**

**핵심 3가지:**
1. 같은 `JWT_SECRET` + 같은 `POSTGRES_DATABASE_URL`
2. 버튼 클릭 시 URL에 `?auth_token=` 붙이기
3. 받는 쪽에서 `localStorage.setItem('auth_token', token)`

**끝!** 🎉
