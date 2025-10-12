/**
 * 권한 관리 시스템
 * Phase 7-1: Permission Management & Row-Level Security
 *
 * 기능:
 * - Role-based Access Control (RBAC)
 * - Resource-level permissions
 * - Row-level security (데이터 소유권)
 * - Permission checking utilities
 */

import { AppError, ErrorCode } from './error-handler';
import { logger } from './logger';

// ============================================
// 권한 정의
// ============================================

export enum Role {
  // 시스템 관리자
  SUPER_ADMIN = 'super_admin',

  // 플랫폼 관리자
  PLATFORM_ADMIN = 'platform_admin',

  // 벤더 관리자 (렌트카 업체)
  VENDOR_ADMIN = 'vendor_admin',

  // 벤더 직원
  VENDOR_STAFF = 'vendor_staff',

  // 일반 사용자
  USER = 'user',

  // 게스트 (비회원)
  GUEST = 'guest'
}

export enum Permission {
  // Vendor 권한
  VENDOR_CREATE = 'vendor:create',
  VENDOR_READ = 'vendor:read',
  VENDOR_UPDATE = 'vendor:update',
  VENDOR_DELETE = 'vendor:delete',
  VENDOR_APPROVE = 'vendor:approve',

  // Vehicle 권한
  VEHICLE_CREATE = 'vehicle:create',
  VEHICLE_READ = 'vehicle:read',
  VEHICLE_UPDATE = 'vehicle:update',
  VEHICLE_DELETE = 'vehicle:delete',
  VEHICLE_MANAGE_OWN = 'vehicle:manage_own',

  // Booking 권한
  BOOKING_CREATE = 'booking:create',
  BOOKING_READ = 'booking:read',
  BOOKING_UPDATE = 'booking:update',
  BOOKING_DELETE = 'booking:delete',
  BOOKING_CONFIRM = 'booking:confirm',
  BOOKING_CANCEL = 'booking:cancel',
  BOOKING_READ_OWN = 'booking:read_own',
  BOOKING_MANAGE_OWN = 'booking:manage_own',

  // Location 권한
  LOCATION_CREATE = 'location:create',
  LOCATION_READ = 'location:read',
  LOCATION_UPDATE = 'location:update',
  LOCATION_DELETE = 'location:delete',

  // Rate Plan 권한
  RATE_PLAN_CREATE = 'rate_plan:create',
  RATE_PLAN_READ = 'rate_plan:read',
  RATE_PLAN_UPDATE = 'rate_plan:update',
  RATE_PLAN_DELETE = 'rate_plan:delete',

  // Statistics 권한
  STATS_READ_ALL = 'stats:read_all',
  STATS_READ_OWN = 'stats:read_own',

  // User Management 권한
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete'
}

// ============================================
// Role-Permission 매핑
// ============================================

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // 모든 권한
    ...Object.values(Permission)
  ],

  [Role.PLATFORM_ADMIN]: [
    // Vendor 관리
    Permission.VENDOR_CREATE,
    Permission.VENDOR_READ,
    Permission.VENDOR_UPDATE,
    Permission.VENDOR_DELETE,
    Permission.VENDOR_APPROVE,

    // 모든 데이터 읽기
    Permission.VEHICLE_READ,
    Permission.BOOKING_READ,
    Permission.LOCATION_READ,
    Permission.RATE_PLAN_READ,

    // 통계
    Permission.STATS_READ_ALL,

    // 사용자 관리
    Permission.USER_READ,
    Permission.USER_UPDATE
  ],

  [Role.VENDOR_ADMIN]: [
    // 자신의 벤더 정보 관리
    Permission.VENDOR_READ,
    Permission.VENDOR_UPDATE,

    // 차량 관리
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_DELETE,
    Permission.VEHICLE_MANAGE_OWN,

    // 예약 관리
    Permission.BOOKING_READ,
    Permission.BOOKING_UPDATE,
    Permission.BOOKING_CONFIRM,
    Permission.BOOKING_CANCEL,
    Permission.BOOKING_MANAGE_OWN,

    // 지점 관리
    Permission.LOCATION_CREATE,
    Permission.LOCATION_READ,
    Permission.LOCATION_UPDATE,
    Permission.LOCATION_DELETE,

    // 요금제 관리
    Permission.RATE_PLAN_CREATE,
    Permission.RATE_PLAN_READ,
    Permission.RATE_PLAN_UPDATE,
    Permission.RATE_PLAN_DELETE,

    // 자신의 통계만
    Permission.STATS_READ_OWN
  ],

  [Role.VENDOR_STAFF]: [
    // 읽기 권한
    Permission.VENDOR_READ,
    Permission.VEHICLE_READ,
    Permission.LOCATION_READ,
    Permission.RATE_PLAN_READ,

    // 예약 관리
    Permission.BOOKING_READ,
    Permission.BOOKING_UPDATE,
    Permission.BOOKING_MANAGE_OWN,

    // 자신의 통계만
    Permission.STATS_READ_OWN
  ],

  [Role.USER]: [
    // 예약 관련
    Permission.BOOKING_CREATE,
    Permission.BOOKING_READ_OWN,
    Permission.BOOKING_CANCEL,

    // 조회
    Permission.VENDOR_READ,
    Permission.VEHICLE_READ,
    Permission.LOCATION_READ
  ],

  [Role.GUEST]: [
    // 공개 정보만
    Permission.VENDOR_READ,
    Permission.VEHICLE_READ,
    Permission.LOCATION_READ
  ]
};

// ============================================
// 사용자 인터페이스
// ============================================

export interface User {
  id: number;
  email: string;
  role: Role;
  vendor_id?: number; // 벤더 관리자/직원인 경우
}

// ============================================
// 권한 체크 함수
// ============================================

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;

  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * 사용자가 모든 권한을 가지고 있는지 확인
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;

  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * 권한이 없으면 에러를 던지는 헬퍼
 */
export function requirePermission(user: User | null, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    logger.warn('Permission denied', { userId: user?.id, permission, role: user?.role });
    throw new AppError(
      ErrorCode.FORBIDDEN,
      `Permission denied: ${permission}`,
      '해당 작업을 수행할 권한이 없습니다.',
      undefined,
      { permission, role: user?.role },
      true
    );
  }
}

/**
 * 여러 권한 중 하나라도 필요
 */
export function requireAnyPermission(user: User | null, permissions: Permission[]): void {
  if (!hasAnyPermission(user, permissions)) {
    logger.warn('Permission denied (any)', { userId: user?.id, permissions, role: user?.role });
    throw new AppError(
      ErrorCode.FORBIDDEN,
      `Permission denied: one of ${permissions.join(', ')}`,
      '해당 작업을 수행할 권한이 없습니다.',
      undefined,
      { permissions, role: user?.role },
      true
    );
  }
}

// ============================================
// Row-Level Security (데이터 소유권)
// ============================================

/**
 * 벤더 소유권 확인
 */
export function canAccessVendor(user: User | null, vendorId: number): boolean {
  if (!user) return false;

  // 슈퍼/플랫폼 관리자는 모든 벤더 접근 가능
  if (user.role === Role.SUPER_ADMIN || user.role === Role.PLATFORM_ADMIN) {
    return true;
  }

  // 벤더 관리자/직원은 자신의 벤더만
  if (user.role === Role.VENDOR_ADMIN || user.role === Role.VENDOR_STAFF) {
    return user.vendor_id === vendorId;
  }

  return false;
}

/**
 * 벤더 소유권 확인 (에러 던지기)
 */
export function requireVendorAccess(user: User | null, vendorId: number): void {
  if (!canAccessVendor(user, vendorId)) {
    logger.warn('Vendor access denied', { userId: user?.id, vendorId, userVendorId: user?.vendor_id });
    throw new AppError(
      ErrorCode.FORBIDDEN,
      `Access denied to vendor ${vendorId}`,
      '해당 벤더의 데이터에 접근할 권한이 없습니다.',
      undefined,
      { vendorId, userVendorId: user?.vendor_id },
      true
    );
  }
}

/**
 * 예약 소유권 확인
 */
export function canAccessBooking(user: User | null, booking: { user_id: number; vendor_id: number }): boolean {
  if (!user) return false;

  // 슈퍼/플랫폼 관리자는 모든 예약 접근 가능
  if (user.role === Role.SUPER_ADMIN || user.role === Role.PLATFORM_ADMIN) {
    return true;
  }

  // 벤더 관리자/직원은 자신의 벤더 예약만
  if (user.role === Role.VENDOR_ADMIN || user.role === Role.VENDOR_STAFF) {
    return user.vendor_id === booking.vendor_id;
  }

  // 일반 사용자는 자신의 예약만
  if (user.role === Role.USER) {
    return user.id === booking.user_id;
  }

  return false;
}

/**
 * 예약 소유권 확인 (에러 던지기)
 */
export function requireBookingAccess(user: User | null, booking: { user_id: number; vendor_id: number }): void {
  if (!canAccessBooking(user, booking)) {
    logger.warn('Booking access denied', { userId: user?.id, bookingUserId: booking.user_id, bookingVendorId: booking.vendor_id });
    throw new AppError(
      ErrorCode.FORBIDDEN,
      'Access denied to booking',
      '해당 예약에 접근할 권한이 없습니다.',
      undefined,
      { bookingUserId: booking.user_id, bookingVendorId: booking.vendor_id },
      true
    );
  }
}

// ============================================
// 권한 데코레이터 (미들웨어 패턴)
// ============================================

/**
 * API 함수를 권한 체크로 래핑
 */
export function withPermission<T extends (...args: any[]) => Promise<any>>(
  permission: Permission,
  fn: T
): (user: User | null, ...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (user: User | null, ...args: Parameters<T>) => {
    requirePermission(user, permission);
    return await fn(...args);
  };
}

/**
 * 벤더 소유권 체크와 함께 래핑
 */
export function withVendorAccess<T extends (vendorId: number, ...args: any[]) => Promise<any>>(
  fn: T
): (user: User | null, vendorId: number, ...args: Parameters<T> extends [number, ...infer R] ? R : never) => Promise<ReturnType<T>> {
  return async (user: User | null, vendorId: number, ...args: any[]) => {
    requireVendorAccess(user, vendorId);
    return await fn(vendorId, ...args);
  };
}

// ============================================
// 유틸리티
// ============================================

/**
 * 사용자의 모든 권한 목록 조회
 */
export function getUserPermissions(user: User | null): Permission[] {
  if (!user) return [];
  return ROLE_PERMISSIONS[user.role] || [];
}

/**
 * 역할 권한 매트릭스 조회 (관리자용)
 */
export function getPermissionMatrix(): Record<Role, Permission[]> {
  return { ...ROLE_PERMISSIONS };
}

export default {
  Role,
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  canAccessVendor,
  requireVendorAccess,
  canAccessBooking,
  requireBookingAccess,
  withPermission,
  withVendorAccess,
  getUserPermissions,
  getPermissionMatrix
};
