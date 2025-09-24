import { useState, useEffect, useCallback } from 'react';
import { authService } from '../utils/auth';
import type { User } from '../types/database';

interface LoginData {
  email: string;
  password: string;
}

interface AuthState {
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: User | null;
  isLoading: boolean;
}

export function useAuthStore() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    isAdmin: false,
    user: null,
    isLoading: true
  });

  // 초기 인증 상태 복원
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setAuthState({
          isLoggedIn: !!currentUser,
          isAdmin: currentUser?.role === 'admin',
          user: currentUser,
          isLoading: false
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setAuthState({
          isLoggedIn: false,
          isAdmin: false,
          user: null,
          isLoading: false
        });
      }
    };

    initializeAuth();

    // authService 구독
    const unsubscribe = authService.subscribe((state) => {
      setAuthState({
        isLoggedIn: state.isAuthenticated,
        isAdmin: state.user?.role === 'admin',
        user: state.user,
        isLoading: state.isLoading
      });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (loginData: LoginData): Promise<{ success: boolean; message?: string; isAdmin?: boolean }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await authService.login(loginData);

      if (result.success && result.user) {
        setAuthState({
          isLoggedIn: true,
          isAdmin: result.user.role === 'admin',
          user: result.user,
          isLoading: false
        });

        return {
          success: true,
          isAdmin: result.user.role === 'admin',
          message: result.user.role === 'admin' ? '관리자로 로그인되었습니다.' : '로그인되었습니다.'
        };
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        message: result.error || '로그인에 실패했습니다.'
      };
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        message: '로그인 중 오류가 발생했습니다.'
      };
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setAuthState({
      isLoggedIn: false,
      isAdmin: false,
      user: null,
      isLoading: false
    });
  }, []);

  const updateUser = useCallback(async (userId: number, updateData: Partial<User>) => {
    const result = await authService.updateUser(userId, updateData);
    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
        isAdmin: result.user!.role === 'admin'
      }));
    }
    return result;
  }, []);

  const isAdmin = useCallback(async (): Promise<boolean> => {
    return await authService.isAdmin();
  }, []);

  const isPartner = useCallback(async (): Promise<boolean> => {
    return await authService.isPartner();
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return authService.getAccessToken();
  }, []);

  const isTokenExpired = useCallback(async (): Promise<boolean> => {
    return await authService.isTokenExpired();
  }, []);

  return {
    ...authState,
    login,
    logout,
    updateUser,
    isAdmin,
    isPartner,
    getAccessToken,
    isTokenExpired,
    validateEmail: authService.validateEmail,
    validatePassword: authService.validatePassword
  };
}