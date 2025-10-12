import { useState, useCallback, useEffect } from 'react';
import { JWTUtils, CookieUtils, StorageUtils, type JWTPayload } from '../utils/jwt';
import type { User as DatabaseUser } from '../types/database';

// useAuth에서 사용하는 간소화된 User 타입
interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'user' | 'partner';
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

// 토큰에서 사용자 정보 복원
const restoreUserFromToken = (token: string): User | null => {
  const payload = JWTUtils.verifyToken(token);
  if (!payload) return null;

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
    if (JWTUtils.needsRefresh(token)) {
      console.log('🔄 토큰 갱신 중...');
      const newToken = JWTUtils.refreshToken(token);
      if (newToken) {
        token = newToken;
        saveSession(token);
        console.log('✅ 토큰 갱신 완료');
      } else {
        console.log('❌ 토큰 갱신 실패');
        clearSession();
        return;
      }
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
      // DB에서 직접 조회
      const { db } = await import('../utils/database-cloud');

      console.log('📊 DB 쿼리 실행...');
      const users = await db.query<any>(`
        SELECT * FROM users WHERE email = ? LIMIT 1
      `, [email]);

      console.log('📊 쿼리 결과:', users);

      if (!users || users.length === 0) {
        console.log('❌ 사용자를 찾을 수 없음');
        return false;
      }

      const dbUser = users[0];
      console.log('✅ 사용자 찾음:', {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        password_hash: dbUser.password_hash
      });

      // 비밀번호 검증
      const expectedHash = `hashed_${password}`;
      console.log('🔐 비밀번호 검증:', {
        입력한비밀번호: password,
        기대값: expectedHash,
        실제값: dbUser.password_hash,
        일치: dbUser.password_hash === expectedHash
      });

      if (dbUser.password_hash !== expectedHash) {
        console.log('❌ 비밀번호 불일치');
        return false;
      }

      // 로그인 성공
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        role: dbUser.role
      };

      const token = `token_${dbUser.id}_${Date.now()}`;

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

  // 토큰 유효성 확인 함수
  const validateToken = useCallback(() => {
    if (!globalState.token) return false;
    return JWTUtils.verifyToken(globalState.token) !== null;
  }, []);

  // 토큰 갱신 함수
  const refreshToken = useCallback(() => {
    if (!globalState.token) return false;

    const newToken = JWTUtils.refreshToken(globalState.token);
    if (newToken) {
      globalState.token = newToken;
      saveSession(newToken);
      console.log('🔄 토큰 갱신 완료');
      return true;
    }

    console.log('❌ 토큰 갱신 실패');
    logout();
    return false;
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