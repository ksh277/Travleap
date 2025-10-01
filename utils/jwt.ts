// JWT 토큰 유틸리티
export interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user' | 'partner';
  name: string;
  iat: number;
  exp: number;
}

// 간단한 JWT 시뮬레이션 (실제 프로덕션에서는 실제 JWT 라이브러리 사용)
export class JWTUtils {
  private static SECRET_KEY = 'travleap_secret_key_2024';

  // JWT 토큰 생성
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + (24 * 60 * 60) // 24시간 후 만료
    };

    // UTF-8 안전한 Base64 인코딩
    const utf8ToBase64 = (str: string): string => {
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (error) {
        console.error('Base64 인코딩 오류:', error);
        // 한글 문자를 영문으로 변경한 안전한 버전
        const safePayload = {
          ...fullPayload,
          name: payload.name.replace(/[^\x00-\x7F]/g, 'User') // 한글을 'User'로 대체
        };
        return btoa(JSON.stringify(safePayload));
      }
    };

    const header = utf8ToBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadStr = utf8ToBase64(JSON.stringify(fullPayload));
    const signature = btoa(`${header}.${payloadStr}.${this.SECRET_KEY}`);

    return `${header}.${payloadStr}.${signature}`;
  }

  // JWT 토큰 검증 및 디코딩
  static verifyToken(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // UTF-8 안전한 Base64 디코딩
      const base64ToUtf8 = (str: string): string => {
        try {
          return decodeURIComponent(escape(atob(str)));
        } catch (error) {
          console.error('Base64 디코딩 오류:', error);
          return atob(str); // 폴백으로 일반 atob 사용
        }
      };

      const payload = JSON.parse(base64ToUtf8(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      // 만료 시간 체크
      if (payload.exp < now) {
        console.log('🔒 JWT 토큰이 만료되었습니다');
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT 토큰 검증 실패:', error);
      return null;
    }
  }

  // 토큰 갱신 필요 여부 체크 (만료 1시간 전)
  static needsRefresh(token: string): boolean {
    try {
      const payload = this.verifyToken(token);
      if (!payload) return false;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExp = payload.exp - now;
      const oneHour = 60 * 60;

      return timeUntilExp < oneHour;
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
}

// 쿠키 관리 유틸리티
export class CookieUtils {
  // 쿠키 설정
  static setCookie(name: string, value: string, days: number = 7): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
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