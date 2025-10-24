// JWT 클라이언트 유틸리티 (브라우저 전용 - jsonwebtoken 없이)

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user' | 'partner' | 'vendor';
  name: string;
  vendorType?: string; // 'stay' (숙박) 또는 'rental' (렌트카)
  iat?: number;
  exp?: number;
}

// Base64 URL 디코딩 (브라우저 호환)
function base64UrlDecode(str: string): string {
  // Base64 URL을 일반 Base64로 변환
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // 패딩 추가
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    // atob는 브라우저 내장 함수
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (error) {
    console.error('❌ Base64 디코딩 실패:', error);
    throw error;
  }
}

// JWT 클라이언트 유틸리티
export class JWTClientUtils {
  // 토큰 디코딩 (검증 없이, 클라이언트에서는 검증하지 않음 - 서버가 검증)
  static decodeToken(token: string): JWTPayload | null {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = base64UrlDecode(parts[1]);
      return JSON.parse(payload) as JWTPayload;
    } catch (error) {
      console.error('❌ JWT 토큰 디코딩 실패:', error);
      return null;
    }
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
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  // 토큰 갱신 필요 여부 체크 (만료 1시간 전)
  static needsRefresh(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return false;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExp = payload.exp - now;
      const oneHour = 60 * 60;

      return timeUntilExp < oneHour && timeUntilExp > 0;
    } catch {
      return false;
    }
  }
}

// 쿠키 관리 유틸리티
export class CookieUtils {
  // 쿠키 설정
  static setCookie(name: string, value: string, days: number = 7): void {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

      // 쿠키 속성 배열로 구성 (공백 문제 방지)
      const attributes = [
        `${name}=${encodeURIComponent(value)}`,
        `expires=${expires.toUTCString()}`,
        'path=/',
        'SameSite=Lax'
      ];

      if (isSecure) {
        attributes.push('Secure');
      }

      // 세미콜론과 공백으로 조인
      const cookieString = attributes.join('; ');
      document.cookie = cookieString;

      console.log('🍪 쿠키 설정 완료:', name, '(만료:', expires.toLocaleString(), ')');
      console.log('🍪 쿠키 문자열:', cookieString);

      // 설정 확인
      const verification = this.getCookie(name);
      if (!verification) {
        console.error('❌ 쿠키 설정 후 즉시 읽기 실패. 브라우저 설정을 확인하세요.');
        throw new Error('Cookie setting failed - browser may have blocked cookies');
      }

      console.log('✅ 쿠키 검증 완료');
    } catch (error) {
      console.error('❌ 쿠키 설정 실패:', error);
      throw error; // 상위로 예외 전파
    }
  }

  // 쿠키 가져오기
  static getCookie(name: string): string | null {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');

      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          const value = c.substring(nameEQ.length, c.length);
          // URL 디코딩
          return decodeURIComponent(value);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ 쿠키 읽기 실패:', error);
      return null;
    }
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

// 로컬스토리지 관리 유틸리티
export class StorageUtils {
  // 로컬스토리지에 저장
  static setItem(key: string, value: any): void {
    try {
      // 문자열이면 그대로 저장, 객체면 JSON.stringify
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      console.log(`💾 localStorage 저장 완료: ${key}`);
    } catch (error) {
      console.error('❌ 로컬스토리지 저장 실패:', error);
      throw error; // 상위로 예외 전파
    }
  }

  // 로컬스토리지에서 가져오기
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      // JSON 파싱 시도, 실패하면 문자열 그대로 반환
      try {
        return JSON.parse(item) as T;
      } catch {
        // JSON 파싱 실패 시 문자열 그대로 반환 (JWT 토큰 같은 경우)
        return item as T;
      }
    } catch (error) {
      console.error('❌ 로컬스토리지 읽기 실패:', error);
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
