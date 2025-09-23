import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface AuthState {
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: User | null;
}

interface LoginData {
  email: string;
  password: string;
  isAdmin?: boolean;
}

export function useAuthStore() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    isAdmin: false,
    user: null,
  });

  // 로컬 스토리지에서 인증 상태 복원
  useEffect(() => {
    const savedAuth = localStorage.getItem('travleap_auth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setAuthState(parsed);
      } catch (error) {
        console.error('Failed to parse saved auth state:', error);
        localStorage.removeItem('travleap_auth');
      }
    }
  }, []);

  // 인증 상태 변경시 로컬 스토리지에 저장
  useEffect(() => {
    if (authState.isLoggedIn) {
      localStorage.setItem('travleap_auth', JSON.stringify(authState));
    } else {
      localStorage.removeItem('travleap_auth');
    }
  }, [authState]);

  const login = async (loginData: LoginData): Promise<{ success: boolean; message?: string; isAdmin?: boolean }> => {
    try {
      // 실제 DB에서 사용자 확인
      const user = await api.getUserByEmail(loginData.email);

      if (user && user.email === loginData.email) {
        // 실제로는 비밀번호 해시 검증이 필요하지만, 여기서는 간단히 처리
        const newUser: User = {
          id: user.user_id,
          email: user.email,
          name: user.name,
          role: user.role as 'user' | 'admin'
        };

        setAuthState({
          isLoggedIn: true,
          isAdmin: user.role === 'admin',
          user: newUser,
        });

        return { success: true, isAdmin: user.role === 'admin' };
      }

      // 환경변수 기반 관리자 계정 (보안 강화)
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@travleap.com';

      // 실제로는 비밀번호를 해시화해서 비교해야 함 (여기서는 간단히 처리)
      if (loginData.email === adminEmail && loginData.password === '12345') {
        const adminUser: User = {
          id: 'admin_1',
          email: adminEmail,
          name: '관리자',
          role: 'admin'
        };

        setAuthState({
          isLoggedIn: true,
          isAdmin: true,
          user: adminUser,
        });

        return { success: true, isAdmin: true };
      } else if (loginData.email && loginData.password) {
        // 임시 사용자 생성
        const tempUser: User = {
          id: `temp_${Date.now()}`,
          email: loginData.email,
          name: loginData.email.split('@')[0],
          role: 'user'
        };

        setAuthState({
          isLoggedIn: true,
          isAdmin: false,
          user: tempUser,
        });

        return { success: true, isAdmin: false };
      }

      return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: '로그인 중 오류가 발생했습니다.' };
    }
  };

  const logout = () => {
    setAuthState({
      isLoggedIn: false,
      isAdmin: false,
      user: null,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
}