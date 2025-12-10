import { useState, useCallback, useEffect } from 'react';
import { JWTClientUtils, CookieUtils, StorageUtils, type JWTPayload } from '../utils/jwt-client';
import type { User as DatabaseUser } from '../types/database';

// useAuth에서 사용하는 간소화된 User 타입
interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'md_admin' | 'user' | 'partner' | 'vendor';
  vendorType?: string; // 'stay' (숙박) 또는 'rental' (렌트카) 등
  vendorId?: number;   // 벤더 ID (관리자가 설정한 listing_id)
  partnerId?: number;  // 파트너 ID (가맹점)
  businessName?: string; // 파트너 사업자명
  postal_code?: string;
  address?: string;
  detail_address?: string;
}

// 권한 관련 헬퍼 함수들
const rolePermissions = {
  // 최고관리자인가? (admin 또는 super_admin)
  isSuperAdmin: (role: string | undefined) => role && ['super_admin', 'admin'].includes(role),
  // MD 관리자 이상인가?
  isMDAdminOrAbove: (role: string | undefined) => role && ['super_admin', 'admin', 'md_admin'].includes(role),
  // 파트너인가?
  isPartner: (role: string | undefined) => role === 'partner',
  // 벤더인가?
  isVendor: (role: string | undefined) => role === 'vendor',
  // 관리자 레벨인가? (MD 이상 - 관리자 페이지 접근 가능)
  isAdminLevel: (role: string | undefined) => role && ['super_admin', 'admin', 'md_admin'].includes(role),
  // 특정 권한 체크
  canManagePartners: (role: string | undefined) => role && ['super_admin', 'admin', 'md_admin'].includes(role),
  canApproveCoupons: (role: string | undefined) => role && ['super_admin', 'admin', 'md_admin'].includes(role),
  canManageAds: (role: string | undefined) => role && ['super_admin', 'admin', 'md_admin'].includes(role),
  canManagePayments: (role: string | undefined) => role && ['super_admin', 'admin'].includes(role), // 결제는 최고관리자만
  canManageSystem: (role: string | undefined) => role && ['super_admin', 'admin'].includes(role),   // 시스템 설정은 최고관리자만
  canViewAllStats: (role: string | undefined) => role && ['super_admin', 'admin', 'md_admin'].includes(role),
  canUseCouponScanner: (role: string | undefined) => role === 'partner', // 쿠폰 스캐너는 파트너만
};

interface AuthState {
  isLoggedIn: boolean;
  isAdmin: boolean;        // 레거시 - SUPER_ADMIN과 동일
  isSuperAdmin: boolean;   // 최고관리자 (어썸 본사)
  isMDAdmin: boolean;      // MD 관리자 이상
  isPartner: boolean;      // 입점자 (가맹점 사장)
  isVendor: boolean;       // 벤더
  user: User | null;
  token: string | null;
}

// 전역 상태
let globalState: AuthState = {
  isLoggedIn: false,
  isAdmin: false,
  isSuperAdmin: false,
  isMDAdmin: false,
  isPartner: false,
  isVendor: false,
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

  const user: User = {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role
  };

  // partnerId가 있으면 추가
  if (payload.partnerId) {
    user.partnerId = payload.partnerId;
  }

  // vendorId가 있으면 추가 (관리자가 설정한 listing_id)
  if (payload.vendorId) {
    user.vendorId = payload.vendorId;
  }

  // vendorType이 있으면 추가
  if (payload.vendorType) {
    user.vendorType = payload.vendorType;
  }

  return user;
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
      isAdmin: rolePermissions.isSuperAdmin(user.role) || false,
      isSuperAdmin: rolePermissions.isSuperAdmin(user.role) || false,
      isMDAdmin: rolePermissions.isMDAdminOrAbove(user.role) || false,
      isPartner: rolePermissions.isPartner(user.role) || false,
      isVendor: rolePermissions.isVendor(user.role) || false,
      user,
      token
    };

    console.log('✅ 세션 복원 완료:', {
      email: user.email,
      role: user.role,
      isSuperAdmin: globalState.isSuperAdmin,
      isMDAdmin: globalState.isMDAdmin,
      isPartner: globalState.isPartner
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
    console.log('✅ 쿠키 저장 완료');

    StorageUtils.setItem('auth_token', token);
    console.log('✅ localStorage 저장 완료');

    // 사용자 정보도 별도 저장 (빠른 접근용)
    if (globalState.user) {
      StorageUtils.setItem('user_info', globalState.user);
    }

    // 저장 검증: 쿠키와 localStorage 중 최소 하나는 성공해야 함
    const cookieVerify = CookieUtils.getCookie('auth_token');
    const storageVerify = StorageUtils.getItem<string>('auth_token');

    if (!cookieVerify && !storageVerify) {
      throw new Error('세션 저장 실패: 쿠키와 localStorage 모두 저장되지 않았습니다.');
    }

    if (!cookieVerify) {
      console.warn('⚠️ 쿠키 저장 실패 - localStorage만 사용됩니다.');
    }

    if (!storageVerify) {
      console.warn('⚠️ localStorage 저장 실패 - 쿠키만 사용됩니다.');
    }

    console.log('✅ 세션 저장 검증 완료');
  } catch (error) {
    console.error('❌ 세션 저장 오류:', error);
    throw error; // 오류를 상위로 전파
  }
};

// 세션 삭제 함수
const clearSession = () => {
  try {
    CookieUtils.deleteMultipleCookies(['auth_token']);
    StorageUtils.removeMultipleItems(['auth_token', 'user_info']);

    // 🔒 보안: 장바구니 localStorage도 삭제 (계정 간 데이터 격리)
    localStorage.removeItem('travleap_cart');
    console.log('🗑️ 장바구니 localStorage 삭제 완료');

    globalState = {
      isLoggedIn: false,
      isAdmin: false,
      isSuperAdmin: false,
      isMDAdmin: false,
      isPartner: false,
      isVendor: false,
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

  const login = useCallback(async (email: string, password: string, recaptchaToken?: string | null): Promise<boolean> => {
    console.log('🔑 로그인 시도:', email);

    try {
      // API URL: Vercel 및 로컬 모두 상대 경로 사용
      const loginUrl = '/api/login';

      console.log('🌐 API URL:', loginUrl);

      // 서버 API로 로그인 요청 (reCAPTCHA 토큰 포함)
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
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

      // partnerId가 있으면 추가 (파트너/가맹점용)
      if (serverUser.partnerId) {
        user.partnerId = serverUser.partnerId;
      }

      // vendorId가 있으면 추가 (관리자가 설정한 listing_id)
      if (serverUser.vendorId) {
        user.vendorId = serverUser.vendorId;
      }

      // vendorType이 있으면 추가 (숙박/렌트카 구분용)
      if (serverUser.vendorType) {
        user.vendorType = serverUser.vendorType;
      }

      console.log('🔑 서버에서 JWT 토큰 받음:', token.substring(0, 50) + '...');

      // 전역 상태 업데이트
      globalState = {
        isLoggedIn: true,
        isAdmin: rolePermissions.isSuperAdmin(user.role) || false,
        isSuperAdmin: rolePermissions.isSuperAdmin(user.role) || false,
        isMDAdmin: rolePermissions.isMDAdminOrAbove(user.role) || false,
        isPartner: rolePermissions.isPartner(user.role) || false,
        isVendor: rolePermissions.isVendor(user.role) || false,
        user,
        token
      };

      // 세션 저장 (오류 발생 시 사용자에게 알림)
      try {
        saveSession(token);
      } catch (saveError) {
        console.error('❌ 세션 저장 실패:', saveError);
        // 세션 저장 실패 시 로그인 상태 초기화
        globalState = {
          isLoggedIn: false,
          isAdmin: false,
          isSuperAdmin: false,
          isMDAdmin: false,
          isPartner: false,
          isVendor: false,
          user: null,
          token: null
        };
        alert('로그인은 성공했지만 세션 저장에 실패했습니다.\n브라우저 쿠키 설정을 확인해주세요.\n\n오류: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
        return false;
      }

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
      // API URL: Vercel 및 로컬 모두 상대 경로 사용
      const apiUrl = '/api/auth?action=refresh';

      console.log('🔄 토큰 갱신 시도:', apiUrl);

      // 서버 API로 토큰 갱신 요청
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${globalState.token}`
        },
      });

      const data = await response.json();

      if (data.success && data.token) {
        globalState.token = data.token;

        // 갱신된 토큰 저장 (실패 시 로그아웃)
        try {
          saveSession(data.token);
          console.log('🔄 토큰 갱신 완료');
          notifyListeners();
          return true;
        } catch (saveError) {
          console.error('❌ 갱신된 토큰 저장 실패:', saveError);
          logout();
          return false;
        }
      }

      console.log('❌ 토큰 갱신 실패:', data.error || 'Unknown error');
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
    isSuperAdmin: globalState.isSuperAdmin,
    isMDAdmin: globalState.isMDAdmin,
    isPartner: globalState.isPartner,
    user: globalState.user?.email || 'none',
    role: globalState.user?.role || 'none',
    hasToken: !!globalState.token,
    sessionRestored,
    isLoading: !sessionRestored
  });

  // 권한 체크 헬퍼 함수들
  const userRole = globalState.user?.role;

  return {
    ...globalState,
    sessionRestored,
    isLoading: !sessionRestored, // 세션 복원 중이면 로딩 상태
    isAuthenticated: globalState.isLoggedIn, // 로그인 여부 (isLoggedIn과 동일)
    login,
    logout,
    validateToken,
    refreshToken,
    // 유틸리티 함수들
    getAuthToken: () => globalState.token,
    getCurrentUser: () => globalState.user,
    // 권한 체크 함수들
    canManagePartners: () => rolePermissions.canManagePartners(userRole),
    canApproveCoupons: () => rolePermissions.canApproveCoupons(userRole),
    canManageAds: () => rolePermissions.canManageAds(userRole),
    canManagePayments: () => rolePermissions.canManagePayments(userRole),
    canManageSystem: () => rolePermissions.canManageSystem(userRole),
    canViewAllStats: () => rolePermissions.canViewAllStats(userRole),
    canUseCouponScanner: () => rolePermissions.canUseCouponScanner(userRole),
  };
};

// rolePermissions export (다른 컴포넌트에서 사용 가능)
export { rolePermissions };