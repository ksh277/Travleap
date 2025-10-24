// JWT 토큰 유틸리티 (Secure Implementation)
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user' | 'partner' | 'vendor';
  name: string;
  vendorType?: string; // 'stay' (숙박) 또는 'rental' (렌트카)
  iat?: number;
  exp?: number;
}

// JWT 유틸리티 클래스 (jsonwebtoken 라이브러리 사용)
export class JWTUtils {
  // 환경변수에서 시크릿 키 가져오기
  private static get SECRET_KEY(): string {
    const secret = process.env.JWT_SECRET;

    // Production에서 시크릿이 없으면 에러
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
      // Development에서는 경고만 표시하고 임시 키 사용
      console.warn('⚠️  JWT_SECRET not set - using temporary key (NOT FOR PRODUCTION!)');
      return 'dev_temporary_secret_DO_NOT_USE_IN_PRODUCTION_' + Math.random();
    }

    return secret;
  }

  // Access Token 생성 (24시간 유효)
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const tokenPayload: any = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name
      };

      // vendorType이 있으면 토큰에 포함
      if (payload.vendorType) {
        tokenPayload.vendorType = payload.vendorType;
      }

      return jwt.sign(
        tokenPayload,
        this.SECRET_KEY,
        {
          expiresIn: '24h',
          algorithm: 'HS256',
          issuer: 'travleap',
          audience: 'travleap-users'
        }
      );
    } catch (error) {
      console.error('❌ JWT 토큰 생성 실패:', error);
      throw new Error('Failed to generate JWT token');
    }
  }

  // Refresh Token 생성 (7일 유효)
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name,
          type: 'refresh'
        },
        this.SECRET_KEY,
        {
          expiresIn: '7d',
          algorithm: 'HS256',
          issuer: 'travleap',
          audience: 'travleap-users'
        }
      );
    } catch (error) {
      console.error('❌ Refresh 토큰 생성 실패:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // JWT 토큰 검증 및 디코딩
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.SECRET_KEY, {
        algorithms: ['HS256'],
        issuer: 'travleap',
        audience: 'travleap-users'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('🔒 JWT 토큰이 만료되었습니다');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.error('❌ JWT 토큰이 유효하지 않습니다:', error.message);
      } else {
        console.error('❌ JWT 토큰 검증 실패:', error);
      }
      return null;
    }
  }

  // 토큰 디코딩 (검증 없이, 만료된 토큰도 읽기)
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('❌ JWT 토큰 디코딩 실패:', error);
      return null;
    }
  }

  // 토큰 갱신 필요 여부 체크 (만료 1시간 전)
  static needsRefresh(token: string): boolean {
    try {
      const payload = this.verifyToken(token);
      if (!payload || !payload.exp) return false;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExp = payload.exp - now;
      const oneHour = 60 * 60;

      return timeUntilExp < oneHour && timeUntilExp > 0;
    } catch {
      return false;
    }
  }

  // 토큰 갱신
  static refreshToken(oldToken: string): string | null {
    const payload = this.verifyToken(oldToken);
    if (!payload) return null;

    // 새 토큰 생성
    return this.generateToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name
    });
  }

  // 토큰 만료 시간 확인
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return null;

      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  // 토큰이 만료되었는지 확인
  static isTokenExpired(token: string): boolean {
    try {
      const payload = this.verifyToken(token);
      return payload === null;
    } catch {
      return true;
    }
  }
}

// 쿠키 관리 유틸리티
export class CookieUtils {
  // 쿠키 설정 (httpOnly는 서버에서만 설정 가능)
  static setCookie(name: string, value: string, days: number = 7): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

    // SameSite=Strict, Secure는 HTTPS에서만 작동
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? 'secure;' : '';

    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; ${secureFlag} samesite=strict`;
  }

  // 쿠키 가져오기
  static getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }

    return null;
  }

  // 쿠키 삭제
  static deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // 여러 쿠키 한번에 삭제
  static deleteMultipleCookies(names: string[]): void {
    names.forEach(name => this.deleteCookie(name));
  }
}

// 로컬스토리지 관리 유틸리티 (백업용)
export class StorageUtils {
  // 로컬스토리지에 저장
  static setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('로컬스토리지 저장 실패:', error);
    }
  }

  // 로컬스토리지에서 가져오기
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('로컬스토리지 읽기 실패:', error);
      return null;
    }
  }

  // 로컬스토리지에서 삭제
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('로컬스토리지 삭제 실패:', error);
    }
  }

  // 여러 항목 한번에 삭제
  static removeMultipleItems(keys: string[]): void {
    keys.forEach(key => this.removeItem(key));
  }
}
