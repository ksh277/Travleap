/**
 * Redis 기반 재고 락 시스템
 *
 * 기능:
 * - 원자적 락 획득/해제 (SET NX PX)
 * - 토큰 기반 소유자 검증
 * - 자동 만료 (TTL)
 * - 재시도 로직 (지수 백오프)
 *
 * 키 규칙:
 * - 렌트카: lock:rentcar:{vehicleId}:{pickupDateISO}:{dropoffDateISO}
 * - 숙박: lock:lodging:{roomId}:{checkinDate}:{checkoutDate}
 * - 일반: lock:booking:{listingId}:{startDate}:{endDate}
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { createRedisFallback, isRedisAvailable } from '../../utils/redis-fallback';

// 환경변수 설정
const REDIS_URL = process.env.REDIS_URL || '';
const HOLD_TTL_MS = parseInt(process.env.HOLD_TTL_MS || '600000'); // 10분 기본값
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 100;

interface LockAcquireResult {
  ok: boolean;
  token?: string;
  message?: string;
  retries?: number;
}

class InventoryLock {
  private redis: Redis | any;
  private readonly lockPrefix = 'lock:';
  private usingFallback = false;

  constructor() {
    if (isRedisAvailable()) {
      this.redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // 재연결
          }
          return false;
        }
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected for InventoryLock');
      });

      this.redis.on('error', (err) => {
        console.error('❌ Redis error:', err);
        console.warn('⚠️ Falling back to in-memory cache');
        this.redis = createRedisFallback();
        this.usingFallback = true;
      });
    } else {
      console.warn('⚠️ [InventoryLock] No REDIS_URL configured, using in-memory cache');
      this.redis = createRedisFallback();
      this.usingFallback = true;
    }
  }

  /**
   * 락 키 생성
   * @param resource 리소스 타입 (rentcar, lodging, booking)
   * @param params 파라미터 (vehicleId, dates 등)
   */
  private buildLockKey(resource: string, ...params: string[]): string {
    return `${this.lockPrefix}${resource}:${params.join(':')}`;
  }

  /**
   * 락 획득 (원자적, 지수 백오프 재시도)
   * @param key 락 키
   * @param ttlMs TTL (밀리초)
   * @returns 성공 시 {ok: true, token}, 실패 시 {ok: false}
   */
  async acquire(key: string, ttlMs: number = HOLD_TTL_MS): Promise<LockAcquireResult> {
    const token = uuidv4(); // 소유자 토큰
    let retries = 0;

    while (retries <= MAX_RETRIES) {
      try {
        console.log(`🔒 [Lock Acquire] Attempt ${retries + 1}/${MAX_RETRIES + 1}: ${key}`);

        // SET NX PX: key가 없으면 설정하고 TTL 지정 (원자적)
        const result = await this.redis.set(key, token, 'PX', ttlMs, 'NX');

        if (result === 'OK') {
          console.log(`✅ [Lock Acquired] ${key} (token: ${token.substring(0, 8)}..., ttl: ${ttlMs}ms, retries: ${retries})`);
          return { ok: true, token, retries };
        }

        // 락 실패 - 재시도
        if (retries < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retries); // 지수 백오프
          console.log(`⏳ [Lock Retry] ${key} after ${delay}ms`);
          await this.sleep(delay);
          retries++;
        } else {
          console.log(`❌ [Lock Failed] ${key} - max retries reached`);
          return {
            ok: false,
            message: 'Lock acquisition failed after retries',
            retries
          };
        }

      } catch (error) {
        console.error(`❌ [Lock Error] ${key}:`, error);

        if (retries < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retries);
          await this.sleep(delay);
          retries++;
        } else {
          return {
            ok: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            retries
          };
        }
      }
    }

    return { ok: false, message: 'Lock acquisition failed', retries };
  }

  /**
   * 락 해제 (소유자 검증)
   * @param key 락 키
   * @param token 소유자 토큰
   */
  async release(key: string, token: string): Promise<void> {
    try {
      console.log(`🔓 [Lock Release] ${key} (token: ${token.substring(0, 8)}...)`);

      // Lua 스크립트: 토큰 검증 후 삭제 (원자적)
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, key, token);

      if (result === 1) {
        console.log(`✅ [Lock Released] ${key}`);
      } else {
        console.log(`⚠️ [Lock Release Failed] ${key} - token mismatch or already expired`);
      }

    } catch (error) {
      console.error(`❌ [Lock Release Error] ${key}:`, error);
    }
  }

  /**
   * 락 상태 확인
   * @param key 락 키
   */
  async isLocked(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ [Lock Check Error] ${key}:`, error);
      return false;
    }
  }

  /**
   * 락 TTL 확인 (남은 시간 ms)
   * @param key 락 키
   */
  async getTTL(key: string): Promise<number> {
    try {
      const ttl = await this.redis.pttl(key);
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      console.error(`❌ [Lock TTL Error] ${key}:`, error);
      return 0;
    }
  }

  /**
   * 모든 락 조회 (디버깅/모니터링용)
   * @param pattern 패턴 (예: lock:rentcar:*)
   */
  async listLocks(pattern: string = 'lock:*'): Promise<string[]> {
    try {
      const keys = await this.redis.keys(pattern);
      return keys;
    } catch (error) {
      console.error(`❌ [Lock List Error]:`, error);
      return [];
    }
  }

  /**
   * 만료된 락 강제 삭제 (정리용)
   * @param key 락 키
   */
  async forceRelease(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`🗑️ [Lock Force Released] ${key}`);
    } catch (error) {
      console.error(`❌ [Lock Force Release Error] ${key}:`, error);
    }
  }

  /**
   * Redis 연결 종료
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    console.log('🔌 Redis disconnected');
  }

  /**
   * Sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 헬퍼 메서드 ====================

  /**
   * 렌트카 락 키 생성
   */
  lockKeyRentcar(vehicleId: string, pickupDate: string, dropoffDate: string): string {
    return this.buildLockKey('rentcar', vehicleId, pickupDate, dropoffDate);
  }

  /**
   * 숙박 락 키 생성
   */
  lockKeyLodging(roomId: string, checkinDate: string, checkoutDate: string): string {
    return this.buildLockKey('lodging', roomId, checkinDate, checkoutDate);
  }

  /**
   * 일반 예약 락 키 생성
   */
  lockKeyBooking(listingId: string, startDate: string, endDate?: string): string {
    const params = endDate ? [listingId, startDate, endDate] : [listingId, startDate];
    return this.buildLockKey('booking', ...params);
  }
}

// 싱글톤 인스턴스
export const inventoryLock = new InventoryLock();

// 메트릭 수집 (선택 사항)
export const metrics = {
  lockAcquired: 0,
  lockFailed: 0,
  lockReleased: 0,
  totalRetries: 0,

  record: (event: 'acquired' | 'failed' | 'released', retries: number = 0) => {
    if (event === 'acquired') metrics.lockAcquired++;
    else if (event === 'failed') metrics.lockFailed++;
    else if (event === 'released') metrics.lockReleased++;
    metrics.totalRetries += retries;
  },

  reset: () => {
    metrics.lockAcquired = 0;
    metrics.lockFailed = 0;
    metrics.lockReleased = 0;
    metrics.totalRetries = 0;
  },

  getStats: () => ({
    lockAcquired: metrics.lockAcquired,
    lockFailed: metrics.lockFailed,
    lockReleased: metrics.lockReleased,
    totalRetries: metrics.totalRetries,
    successRate: metrics.lockAcquired / (metrics.lockAcquired + metrics.lockFailed) || 0
  })
};
