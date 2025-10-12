import React from 'react';
import { api } from './api';
import type { User } from '../types/database';
import { SignJWT, jwtVerify } from 'jose';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

class AuthService {
  private storageKey = 'travleap_token';
  private refreshKey = 'travleap_refresh';
  private listeners: ((state: AuthState) => void)[] = [];
  private jwtSecret = new TextEncoder().encode('your-secret-key-travleap-2025'); // 실제 환경에서는 환경변수 사용

  constructor() {
    // 페이지 로드시 저장된 사용자 정보 복원
    this.restoreUser();
  }

  // 상태 변경 리스너 등록
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(state: AuthState) {
    this.listeners.forEach(listener => listener(state));
  }

  // JWT 토큰 생성
  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(this.jwtSecret);

    const refreshPayload: JWTPayload = {
      ...payload
    };

    const refreshToken = await new SignJWT(refreshPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(this.jwtSecret);

    return { accessToken, refreshToken };
  }

  // JWT 토큰 검증
  private async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      // payload에 필요한 속성들이 있는지 확인
      if (payload && typeof payload.userId === 'number' && typeof payload.email === 'string' && typeof payload.role === 'string') {
        return {
          userId: payload.userId as number,
          email: payload.email as string,
          role: payload.role as string,
          exp: payload.exp,
          iat: payload.iat
        };
      }
      return null;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // 현재 사용자 상태 가져오기
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem(this.storageKey);
      if (!token) return null;

      const payload = await this.verifyToken(token);
      if (!payload) {
        // 토큰이 만료되었으면 리프레시 토큰으로 갱신 시도
        const refreshResult = await this.refreshToken();
        if (!refreshResult) {
          this.removeTokens();
          return null;
        }
        return refreshResult;
      }

      // 토큰이 유효하면 DB에서 최신 사용자 정보 가져오기
      const user = await api.getUserById(payload.userId);
      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      this.removeTokens();
      return null;
    }
  }

  // 토큰 갱신
  private async refreshToken(): Promise<User | null> {
    try {
      const refreshToken = localStorage.getItem(this.refreshKey);
      if (!refreshToken) return null;

      const payload = await this.verifyToken(refreshToken);
      if (!payload) {
        this.removeTokens();
        return null;
      }

      // 새로운 토큰 생성
      const user = await api.getUserById(payload.userId);
      if (!user) {
        this.removeTokens();
        return null;
      }

      const tokens = await this.generateTokens(user);
      this.saveTokens(tokens.accessToken, tokens.refreshToken);
      return user;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.removeTokens();
      return null;
    }
  }

  // 토큰 저장
  private saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(this.storageKey, accessToken);
    localStorage.setItem(this.refreshKey, refreshToken);
  }

  // 토큰 제거
  private removeTokens() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.refreshKey);
  }

  // 페이지 로드시 사용자 정보 복원
  private async restoreUser() {
    const user = await this.getCurrentUser();
    this.notifyListeners({
      user,
      isAuthenticated: !!user,
      isLoading: false
    });
  }

  // 로그인
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      this.notifyListeners({
        user: null,
        isAuthenticated: false,
        isLoading: true
      });

      // 이메일로 사용자 조회
      const user = await api.getUserByEmail(credentials.email);

      if (!user) {
        const error = '등록되지 않은 이메일입니다.';
        this.notifyListeners({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
        return { success: false, error };
      }

      // 비밀번호 검증 (간단한 해시 비교)
      const expectedHash = `hashed_${credentials.password}`;
      if (user.password_hash !== expectedHash) {
        const error = '비밀번호가 올바르지 않습니다.';
        this.notifyListeners({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
        return { success: false, error };
      }

      // 로그인 성공 - JWT 토큰 생성
      const tokens = await this.generateTokens(user);
      this.saveTokens(tokens.accessToken, tokens.refreshToken);

      this.notifyListeners({
        user,
        isAuthenticated: true,
        isLoading: false
      });

      return { success: true, user };

    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = '로그인에 실패했습니다. 다시 시도해주세요.';
      this.notifyListeners({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      return { success: false, error: errorMessage };
    }
  }

  // 회원가입
  async register(userData: RegisterData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      this.notifyListeners({
        user: null,
        isAuthenticated: false,
        isLoading: true
      });

      // 이메일 중복 확인
      const existingUser = await api.getUserByEmail(userData.email);
      if (existingUser) {
        const error = '이미 사용 중인 이메일입니다.';
        this.notifyListeners({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
        return { success: false, error };
      }

      // 사용자 생성
      const result = await api.createUser({
        user_id: `user_${Date.now()}`,
        email: userData.email,
        password_hash: this.hashPassword(userData.password), // 실제로는 백엔드에서 해싱
        name: userData.name,
        phone: userData.phone || '',
        role: 'user',
        preferred_language: 'ko',
        preferred_currency: 'KRW',
        marketing_consent: false
      });

      if (!result.success || !result.data) {
        const error = result.error || '회원가입에 실패했습니다.';
        this.notifyListeners({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
        return { success: false, error };
      }

      // 자동 로그인 - JWT 토큰 생성
      const tokens = await this.generateTokens(result.data);
      this.saveTokens(tokens.accessToken, tokens.refreshToken);

      this.notifyListeners({
        user: result.data,
        isAuthenticated: true,
        isLoading: false
      });

      return { success: true, user: result.data };

    } catch (error) {
      console.error('Registration failed:', error);
      const errorMessage = '회원가입에 실패했습니다. 다시 시도해주세요.';
      this.notifyListeners({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      return { success: false, error: errorMessage };
    }
  }

  // 로그아웃
  logout() {
    this.removeTokens();
    this.notifyListeners({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  }

  // 사용자 정보 업데이트
  async updateUser(userId: number, updateData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.id !== userId) {
        return { success: false, error: '권한이 없습니다.' };
      }

      // API를 통해 사용자 정보 업데이트 (실제 구현 필요)
      const updatedUser = { ...currentUser, ...updateData };

      // 새로운 토큰 생성 (사용자 정보가 변경되었으므로)
      const tokens = await this.generateTokens(updatedUser);
      this.saveTokens(tokens.accessToken, tokens.refreshToken);

      this.notifyListeners({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false
      });

      return { success: true, user: updatedUser };

    } catch (error) {
      console.error('User update failed:', error);
      return { success: false, error: '사용자 정보 업데이트에 실패했습니다.' };
    }
  }

  // 관리자 권한 확인
  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'admin';
  }

  // 파트너 권한 확인
  async isPartner(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'partner' || user?.role === 'admin';
  }

  // 토큰에서 사용자 정보 추출 (서버에서 사용할 수 있도록)
  async getUserFromToken(token: string): Promise<User | null> {
    const payload = await this.verifyToken(token);
    if (!payload) return null;

    return await api.getUserById(payload.userId);
  }

  // 현재 액세스 토큰 가져오기
  getAccessToken(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  // 토큰 만료 체크
  async isTokenExpired(): Promise<boolean> {
    const token = localStorage.getItem(this.storageKey);
    if (!token) return true;

    const payload = await this.verifyToken(token);
    return !payload;
  }

  // 비밀번호 해싱 (실제로는 백엔드에서 처리)
  private hashPassword(password: string): string {
    // 실제 환경에서는 bcrypt 등을 사용
    return `hashed_${password}`;
  }

  // 이메일 유효성 검사
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 비밀번호 유효성 검사
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
    }

    if (!/[A-Za-z]/.test(password)) {
      errors.push('비밀번호는 영문자를 포함해야 합니다.');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('비밀번호는 숫자를 포함해야 합니다.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();

// React 훅
export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  React.useEffect(() => {
    // 초기 사용자 상태 확인
    const initAuth = async () => {
      const user = await authService.getCurrentUser();
      setAuthState({
        user,
        isAuthenticated: !!user,
        isLoading: false
      });
    };

    initAuth();

    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const login = async (credentials: LoginCredentials) => {
    return await authService.login(credentials);
  };

  const register = async (userData: RegisterData) => {
    return await authService.register(userData);
  };

  const logout = () => {
    authService.logout();
  };

  const updateUser = async (userId: number, updateData: Partial<User>) => {
    return await authService.updateUser(userId, updateData);
  };

  const isAdmin = async () => {
    return await authService.isAdmin();
  };

  const isPartner = async () => {
    return await authService.isPartner();
  };

  return {
    ...authState,
    login,
    register,
    logout,
    updateUser,
    isAdmin,
    isPartner,
    getAccessToken: authService.getAccessToken.bind(authService),
    isTokenExpired: authService.isTokenExpired.bind(authService),
    validateEmail: authService.validateEmail,
    validatePassword: authService.validatePassword
  };
}

export default authService;