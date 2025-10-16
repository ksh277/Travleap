# 🚨 긴급 보안 수정 가이드
## 즉시 조치 필요 - Production 배포 전 필수

**작성일:** 2025-10-16
**우선순위:** 🔴 CRITICAL

---

## ⚠️ 발견된 치명적 보안 취약점

총 **25개 보안 이슈** 발견:
- 🔴 **CRITICAL**: 3개 (즉시 수정 필수)
- 🟠 **HIGH**: 6개 (이번 주 내 수정)
- 🟡 **MEDIUM**: 8개 (배포 전 수정 권장)
- 🟢 **LOW**: 8개 (추후 개선)

---

## 🔴 CRITICAL - 즉시 수정 (오늘 내)

### 1. ✅ App.tsx 누락된 컴포넌트 수정 (완료)

**문제:** 존재하지 않는 컴포넌트 import
```typescript
// ❌ 삭제됨
import { DBTestComponent } from './components/DBTestComponent';
import { VendorDashboardPage } from './components/VendorDashboardPage';
```

**해결:** ✅ 완료
- DBTestComponent import 제거
- VendorDashboardPage import 제거 (Enhanced 버전 사용)
- /db-test 라우트 제거

---

### 2. 🚨 .env 파일의 민감한 정보 노출

**문제:** 프로덕션 크리덴셜이 git에 커밋되어 GitHub에 노출됨

```env
# ❌ 현재 노출된 정보
DATABASE_PASSWORD=pscale_pw_************************************
PRO_API_KEY=sk-ant-api03-************************************
```

**즉시 조치:**

#### Step 1: 크리덴셜 무효화 (지금 바로)
```bash
# 1. PlanetScale 대시보드 접속
# https://app.planetscale.com/

# 2. 데이터베이스 비밀번호 즉시 변경
# Database → Settings → Passwords → Rotate Password

# 3. Anthropic API 키 즉시 revoke
# https://console.anthropic.com/settings/keys
```

#### Step 2: Git 히스토리에서 제거
```bash
# BFG Repo-Cleaner 사용
cd C:\Users\ham57\Desktop\Travleap
git filter-repo --path .env --invert-paths

# 또는 git-filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (주의!)
git push origin --force --all
```

#### Step 3: .env 파일 재구성
```bash
# .env.example 생성 (git에 커밋)
cat > .env.example << 'EOF'
# Database Configuration
DATABASE_HOST=aws.connect.psdb.cloud
DATABASE_USERNAME=your_username_here
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=travleap

# JWT Secret (256-bit random string)
JWT_SECRET=generate_a_strong_secret_here

# Payment Gateway
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Redis (optional but recommended)
REDIS_URL=redis://localhost:6379
EOF

# .gitignore 확인
echo ".env" >> .gitignore
git add .gitignore .env.example
git commit -m "chore: add .env.example and secure .gitignore"
```

---

### 3. 🚨 하드코딩된 Admin 계정 제거

**파일:** `api/auth/route.ts` (Lines 194-226)

**문제:**
```typescript
// ❌ 위험: 백도어 계정
if (email === 'admin@shinan.com' && password === 'admin123') {
  return {
    id: 999999,
    email: 'admin@shinan.com',
    name: '관리자',
    role: 'admin',
    phone: '000-0000-0000',
    created_at: new Date().toISOString(),
  };
}
```

**수정 방법:**

#### 옵션 A: 완전 제거 (권장)
```typescript
// api/auth/route.ts

// ❌ 삭제할 코드 (Lines 194-226)
// 하드코딩된 admin fallback 전체 제거

// ✅ 대신 DB에 admin 계정 생성
// scripts/create-admin.ts
import bcrypt from 'bcryptjs';
import { db } from '../utils/database.js';

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('STRONG_RANDOM_PASSWORD', 12);

  await db.execute(`
    INSERT INTO users (email, password_hash, name, role, phone, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
  `, [
    'admin@travleap.com',  // 변경된 이메일
    hashedPassword,
    '관리자',
    'admin',
    '010-0000-0000'
  ]);

  console.log('✅ Admin account created');
}

createAdmin();
```

#### 실행:
```bash
# Admin 계정 생성
npx tsx scripts/create-admin.ts

# 새 admin 계정으로 로그인
# Email: admin@travleap.com
# Password: (generate_strong_password)
```

---

### 4. 🚨 JWT 보안 강화

**파일:** `utils/jwt.ts`

**문제 1: 약한 SECRET_KEY**
```typescript
// ❌ 위험
private static SECRET_KEY = 'travleap_secret_key_2024';
```

**문제 2: 커스텀 JWT 구현 (취약)**
```typescript
// ❌ btoa()로 서명 (HMAC 아님)
const signature = btoa(`${header}.${payload}.${this.SECRET_KEY}`);
```

**해결책: jsonwebtoken 라이브러리 사용**

#### Step 1: 패키지 설치
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

#### Step 2: utils/jwt.ts 완전 교체
```typescript
// utils/jwt.ts (새 버전)
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using default JWT_SECRET - INSECURE! Set JWT_SECRET in .env');
  return 'development_secret_DO_NOT_USE_IN_PRODUCTION';
})();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JwtService {
  /**
   * Generate access token
   */
  static generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      algorithm: 'HS256',
    });
  }

  /**
   * Verify and decode token
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.warn('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.warn('Invalid token');
      }
      return null;
    }
  }

  /**
   * Decode token without verification (use with caution)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

// Backward compatibility
export const generateToken = JwtService.generateToken;
export const verifyToken = JwtService.verifyToken;
```

#### Step 3: .env 업데이트
```env
# JWT Configuration
JWT_SECRET=<generate_256bit_secret_here>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

#### JWT_SECRET 생성:
```bash
# 강력한 256-bit secret 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 OpenSSL
openssl rand -hex 32
```

---

## 🟠 HIGH - 이번 주 내 수정

### 5. 인증 미들웨어 추가

**파일:** `middleware/authenticate.ts` (새로 생성)

```typescript
// middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const payload = JwtService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 토큰입니다.'
      });
    }

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: '인증 실패'
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = JwtService.verifyToken(token);
      if (payload) {
        req.user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role
        };
      }
    }
  } catch (error) {
    // Silently fail - optional auth
  }
  next();
}
```

**적용 방법 (server-api.ts):**
```typescript
import { authenticate, requireRole } from './middleware/authenticate.js';

// Protected routes
app.use('/api/admin/*', authenticate, requireRole('admin'));
app.use('/api/vendor/*', authenticate, requireRole('vendor'));
app.put('/api/user/profile', authenticate);
app.post('/api/cart/*', authenticate);
```

---

### 6. 입력 검증 추가 (Zod)

**파일:** `middleware/validate.ts` (새로 생성)

```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: '입력 데이터가 유효하지 않습니다.',
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}
```

**스키마 예시:**
```typescript
// Example: Cart API validation
const addToCartSchema = z.object({
  body: z.object({
    userId: z.number().positive(),
    listingId: z.number().positive(),
    date: z.string().optional(),
    guests: z.number().min(1).max(20).optional(),
    price: z.number().min(0)
  })
});

// Apply to route
app.post('/api/cart/add',
  authenticate,
  validate(addToCartSchema),
  async (req, res) => {
    // Handler code
  }
);
```

---

## 🟡 MEDIUM - 배포 전 권장

### 7. CORS 설정 강화

```typescript
// server-api.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.CLIENT_URL || 'https://travleap.com',
        'https://www.travleap.com',
        'https://admin.travleap.com'
      ]
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));
```

---

### 8. Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
// server-api.ts
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: '로그인 시도 횟수를 초과했습니다.' }
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

---

### 9. Security Headers (Helmet)

```bash
npm install helmet
```

```typescript
// server-api.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", process.env.API_URL || '']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## ✅ 완료 체크리스트

### 긴급 (오늘)
- [x] App.tsx 누락 컴포넌트 제거
- [ ] .env에서 크리덴셜 제거 및 git history clean
- [ ] PlanetScale 비밀번호 rotation
- [ ] Anthropic API 키 revoke & regenerate
- [ ] JWT_SECRET 생성 및 .env 설정
- [ ] JWT 라이브러리 교체 (custom → jsonwebtoken)
- [ ] 하드코딩된 admin 계정 제거
- [ ] DB에 admin 계정 생성

### 중요 (이번 주)
- [ ] 인증 미들웨어 구현
- [ ] 모든 protected routes에 인증 적용
- [ ] 입력 검증 (Zod) 추가
- [ ] CORS 설정 강화
- [ ] Rate limiting 추가
- [ ] Security headers (Helmet) 추가

### 권장 (배포 전)
- [ ] TypeScript strict mode 활성화
- [ ] Error boundaries 추가
- [ ] Request size limits 설정
- [ ] Console.log 제거 (production)
- [ ] Health check 개선
- [ ] Redis 설정 (production)

---

## 📞 긴급 연락처

**발견된 보안 이슈:**
- Database credentials: EXPOSED (GitHub)
- API keys: EXPOSED (GitHub)
- Admin backdoor: EXISTS

**즉시 조치 필요:**
1. 모든 크리덴셜 rotation
2. Git history cleaning
3. 보안 패치 배포

---

**보고서 작성:** Claude Code
**마지막 업데이트:** 2025-10-16 16:40 KST
