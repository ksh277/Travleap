/**
 * 캐싱 전략 유틸리티
 *
 * Phase 4 성능 최적화: 메모리 기반 캐시 (In-Memory Cache)
 * - Redis 대안: 서버리스/엣지 환경에서도 사용 가능
 * - TTL(Time To Live) 지원
 * - LRU(Least Recently Used) 캐시 정책
 * - 타입 안전성
 *
 * 향후 확장: Redis 연동 시 이 인터페이스 유지하면서 구현체만 변경 가능
 */

import { cacheLogger } from './logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number; // milliseconds

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 캐시에서 데이터 조회
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      cacheLogger.miss(key);
      return null;
    }

    // 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      cacheLogger.miss(key);
      return null;
    }

    // 접근 통계 업데이트 (LRU)
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    cacheLogger.hit(key);
    return entry.data as T;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // 캐시 크기 제한 확인 - LRU 정책으로 오래된 항목 제거
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: Date.now()
    });

    cacheLogger.set(key, ttl);
  }

  /**
   * 특정 키의 캐시 삭제
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 패턴 매칭으로 캐시 삭제 (예: 'rentcar:vendor:*')
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 모든 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * LRU 정책: 가장 적게/오래전에 접근된 항목 제거
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // 점수: 접근 횟수가 적고, 마지막 접근이 오래될수록 낮음
      const score = entry.accessCount * 1000 + (Date.now() - entry.lastAccessedAt);

      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * 캐시 통계
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 만료된 항목 정리 (주기적으로 실행 권장)
   */
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

// 싱글톤 인스턴스
export const cache = new CacheManager(1000, 5 * 60 * 1000); // 1000 items, 5분 TTL

// 주기적 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * 캐시 키 생성 헬퍼
 */
export const CacheKeys = {
  // Rentcar Vendor
  vendorList: () => 'rentcar:vendors:list',
  vendor: (id: number) => `rentcar:vendor:${id}`,
  vendorStats: (id: number) => `rentcar:vendor:${id}:stats`,

  // Rentcar Vehicle
  vehicleList: (vendorId?: number, filters?: string) =>
    vendorId
      ? `rentcar:vehicles:vendor:${vendorId}${filters ? `:${filters}` : ''}`
      : `rentcar:vehicles:all${filters ? `:${filters}` : ''}`,
  vehicle: (id: number) => `rentcar:vehicle:${id}`,

  // Rentcar Booking
  bookingList: (filters?: string) => `rentcar:bookings:list${filters ? `:${filters}` : ''}`,
  booking: (id: number) => `rentcar:booking:${id}`,

  // Rentcar Location
  locationList: (vendorId: number) => `rentcar:locations:vendor:${vendorId}`,

  // Rentcar Statistics
  adminStats: () => 'rentcar:stats:admin',

  // Rate Plans
  ratePlans: (vendorId: number) => `rentcar:rate-plans:vendor:${vendorId}`,

  // Insurance Plans
  insurancePlans: (vendorId: number) => `rentcar:insurance:vendor:${vendorId}`,

  // Extras
  extras: (vendorId: number) => `rentcar:extras:vendor:${vendorId}`
};

/**
 * 캐시 무효화 헬퍼
 */
export const CacheInvalidation = {
  // 특정 벤더 관련 모든 캐시 무효화
  invalidateVendor: (vendorId: number) => {
    cache.delete(CacheKeys.vendor(vendorId));
    cache.delete(CacheKeys.vendorStats(vendorId));
    cache.deletePattern(`rentcar:vehicles:vendor:${vendorId}*`);
    cache.deletePattern(`rentcar:locations:vendor:${vendorId}*`);
    cache.deletePattern(`rentcar:rate-plans:vendor:${vendorId}*`);
    cache.deletePattern(`rentcar:insurance:vendor:${vendorId}*`);
    cache.deletePattern(`rentcar:extras:vendor:${vendorId}*`);
    cache.delete(CacheKeys.vendorList());
    cache.delete(CacheKeys.adminStats());
  },

  // 특정 차량 관련 캐시 무효화
  invalidateVehicle: (vehicleId: number, vendorId?: number) => {
    cache.delete(CacheKeys.vehicle(vehicleId));
    if (vendorId) {
      cache.deletePattern(`rentcar:vehicles:vendor:${vendorId}*`);
    }
    cache.deletePattern('rentcar:vehicles:all*');
    cache.delete(CacheKeys.adminStats());
  },

  // 예약 관련 캐시 무효화
  invalidateBooking: (bookingId: number, vendorId?: number) => {
    cache.delete(CacheKeys.booking(bookingId));
    cache.deletePattern('rentcar:bookings:list*');
    if (vendorId) {
      cache.delete(CacheKeys.vendorStats(vendorId));
    }
    cache.delete(CacheKeys.adminStats());
  },

  // 전체 렌트카 캐시 무효화
  invalidateAll: () => {
    cache.deletePattern('rentcar:*');
  }
};

/**
 * 캐시 미들웨어 데코레이터
 * API 함수에 캐싱 로직을 자동으로 추가
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = keyGenerator(...args);

    // 캐시 확인
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cached;
    }

    console.log(`[Cache MISS] ${cacheKey}`);

    // 캐시 미스: 원본 함수 실행
    const result = await fn(...args);

    // 결과 캐싱
    if (result && result.success) {
      cache.set(cacheKey, result, ttl);
    }

    return result;
  }) as T;
}

export default cache;
