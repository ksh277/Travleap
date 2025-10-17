import { useState, useCallback, useEffect } from 'react';
import { JWTClientUtils, CookieUtils, StorageUtils, type JWTPayload } from '../utils/jwt-client';
import type { User as DatabaseUser } from '../types/database';

// useAuth에서 사용하는 간소화된 User 타입
interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'user' | 'partner' | 'vendor';
}

interface AuthState {
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: User | null;
  token: string | null;
}

// 전역 상태
let globalState: AuthState = {
  isLoggedIn: false,
  isAdmin: false,
  user: null,
  token: null
};

// 세션 복원 상태
let sessionRestored = false;

const listeners: Array<() => void> = [];

const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('리스너 실행 오류:', error);
    }
  });
};

// 토큰에서 사용자 정보 복원 (클라이언트에서는 디코딩만, 검증은 서버에서)
const restoreUserFromToken = (token: string): User | null => {
  const payload = JWTClientUtils.decodeToken(token);
  if (!payload) return null;

  // 토큰 만료 확인
  if (JWTClientUtils.isTokenExpired(token)) {
    console.log('🔒 토큰이 만료되었습니다');
    return null;
  }

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role
  };
};

// 세션 복원 함수
const restoreSession = () => {
  try {
    // 1. 쿠키에서 토큰 확인
    let token = CookieUtils.getCookie('auth_token');

    // 2. 쿠키에 없으면 로컬스토리지에서 확인 (백업)
    if (!token) {
      token = StorageUtils.getItem<string>('auth_token');
    }

    if (!token) {
      console.log('🔒 저장된 토큰이 없습니다');
      sessionRestored = true; // 토큰이 없어도 복원 완료 처리
      notifyListeners();
      return;
    }

    // 3. 토큰 검증
    const user = restoreUserFromToken(token);
    if (!user) {
      console.log('🔒 유효하지 않은 토큰입니다');
      clearSession();
      return;
    }

    // 4. 토큰 갱신 필요 여부 확인
    if (JWTClientUtils.needsRefresh(token)) {
      console.log('🔄 토큰 갱신 필요 - 서버에 요청...');
      // TODO: 서버 API로 토큰 갱신 요청
      // 지금은 일단 기존 토큰 사용
    }

    // 5. 전역 상태 복원
    globalState = {
      isLoggedIn: true,
      isAdmin: user.role === 'admin',
      user,
      token
    };

    console.log('✅ 세션 복원 완료:', {
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin'
    });

    sessionRestored = true;
    notifyListeners();
  } catch (error) {
    console.error('세션 복원 오류:', error);
    sessionRestored = true; // 오류 발생 시에도 복원 완료 처리
    clearSession();
  }
};

// 세션 저장 함수
const saveSession = (token: string) => {
  try {
    // 쿠키와 로컬스토리지 모두에 저장 (이중 백업)
    CookieUtils.setCookie('auth_token', token, 7); // 7일간 유지
    StorageUtils.setItem('auth_token', token);

    // 사용자 정보도 별도 저장 (빠른 접근용)
    if (globalState.user) {
      StorageUtils.setItem('user_info', globalState.user);
    }
  } catch (error) {
    console.error('세션 저장 오류:', error);
  }
};

// 세션 삭제 함수
const clearSession = () => {
  try {
    CookieUtils.deleteMultipleCookies(['auth_token']);
    StorageUtils.removeMultipleItems(['auth_token', 'user_info']);

    globalState = {
      isLoggedIn: false,
      isAdmin: false,
      user: null,
      token: null
    };

    sessionRestored = true; // 세션 삭제도 복원 완료로 간주
    notifyListeners();
  } catch (error) {
    console.error('세션 삭제 오류:', error);
  }
};

// 개발용으로 전역에 노출
if (typeof window !== 'undefined') {
  (window as any).globalAuthState = globalState;
  (window as any).authListeners = listeners;
  (window as any).clearAuthSession = clearSession;
  (window as any).restoreAuthSession = restoreSession;
}

export const useAuth = () => {
  const [, forceUpdate] = useState({});

  // 컴포넌트 마운트시 리스너 등록 및 세션 복원
  useEffect(() => {
    const listener = () => {
      console.log('🔄 컴포넌트 상태 업데이트 중...');
      forceUpdate({});
    };

    listeners.push(listener);
    console.log('👂 리스너 등록됨. 총 리스너 수:', listeners.length);

    // 세션 복원 (페이지 로드 시)
    if (!sessionRestored) {
      restoreSession();
    }

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log('👋 리스너 제거됨. 남은 리스너 수:', listeners.length);
      }
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('🔑 로그인 시도:', email);

    try {
      // 서버 API로 로그인 요청
      const response = await fetch('http://localhost:3004/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.log('❌ 로그인 실패:', data.error || data.message);
        return false;
      }

      const { token, user: serverUser } = data.data;

      // 사용자 정보 설정
      const user: User = {
        id: serverUser.id,
        email: serverUser.email,
        name: serverUser.name,
        phone: serverUser.phone,
        role: serverUser.role
      };

      console.log('🔑 서버에서 JWT 토큰 받음:', token.substring(0, 50) + '...');

      // 전역 상태 업데이트
      globalState = {
        isLoggedIn: true,
        isAdmin: user.role === 'admin',
        user,
        token
      };

      // 세션 저장
      saveSession(token);

      console.log('✅ 로그인 성공!');
      console.log('👤 사용자:', user);

      notifyListeners();
      return true;
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 로그아웃 중...');
    clearSession();
    console.log('✅ 로그아웃 완료');
  }, []);

  // 토큰 유효성 확인 함수 (클라이언트에서는 만료 여부만 체크)
  const validateToken = useCallback(() => {
    if (!globalState.token) return false;
    return !JWTClientUtils.isTokenExpired(globalState.token);
  }, []);

  // 토큰 갱신 함수 (서버 API 호출)
  const refreshToken = useCallback(async () => {
    if (!globalState.token) return false;

    try {
      // 서버 API로 토큰 갱신 요청
      const response = await fetch('http://localhost:3004/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${globalState.token}`
        },
      });

      const data = await response.json();

      if (data.success && data.token) {
        globalState.token = data.token;
        saveSession(data.token);
        console.log('🔄 토큰 갱신 완료');
        return true;
      }

      console.log('❌ 토큰 갱신 실패');
      logout();
      return false;
    } catch (error) {
      console.error('❌ 토큰 갱신 오류:', error);
      logout();
      return false;
    }
  }, [logout]);

  console.log('🎯 useAuth 반환 상태:', {
    isLoggedIn: globalState.isLoggedIn,
    isAdmin: globalState.isAdmin,
    user: globalState.user?.email || 'none',
    hasToken: !!globalState.token,
    sessionRestored
  });

  return {
    ...globalState,
    sessionRestored,
    login,
    logout,
    validateToken,
    refreshToken,
    // 유틸리티 함수들
    getAuthToken: () => globalState.token,
    getCurrentUser: () => globalState.user
  };
};