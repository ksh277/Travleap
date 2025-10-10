/**
 * PMS 장애 및 에러 처리 전략
 *
 * 1. Circuit Breaker 패턴
 * 2. Retry with Exponential Backoff
 * 3. Fallback to Cache
 * 4. Degraded Mode (읽기 전용)
 */

import { InventoryCache, RateCache } from './cache';
import type { RoomInventory, RatePlan } from './types';

// Circuit Breaker 상태
enum CircuitState {
  CLOSED = 'CLOSED', // 정상 동작
  OPEN = 'OPEN', // 차단 (PMS 호출 안 함)
  HALF_OPEN = 'HALF_OPEN', // 복구 시도
}

// Circuit Breaker 설정
interface CircuitBreakerConfig {
  failureThreshold: number; // 연속 실패 임계값
  successThreshold: number; // HALF_OPEN에서 성공 임계값
  timeout: number; // OPEN 상태 유지 시간 (ms)
}

/**
 * Circuit Breaker 패턴 구현
 * PMS 장애 시 빠르게 실패하고 캐시로 폴백
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN 상태: PMS 호출 차단
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // 타임아웃 경과 시 HALF_OPEN으로 전환
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        console.log('Circuit breaker CLOSED (복구됨)');
      }
    }
  }

  private onFailure() {
    this.failureCount++;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      console.error(
        `Circuit breaker OPEN (${this.config.timeout}ms 동안 차단)`
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Retry with Exponential Backoff
 * PMS 일시적 오류 시 재시도
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = baseDelay * Math.pow(2, i); // Exponential backoff
      console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms:`, error);

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Fallback Strategy
 * PMS 실패 시 캐시 데이터 사용
 */
export class FallbackStrategy {
  private inventoryCache: InventoryCache;
  private rateCache: RateCache;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.inventoryCache = new InventoryCache();
    this.rateCache = new RateCache();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5, // 5번 연속 실패 시 차단
      successThreshold: 2, // 2번 성공 시 복구
      timeout: 60000, // 60초 동안 차단
    });
  }

  /**
   * PMS 호출 with Fallback
   * 1. Circuit Breaker 확인
   * 2. PMS 호출 (with retry)
   * 3. 실패 시 캐시 데이터 반환
   */
  async fetchWithFallback<T>(
    pmsFn: () => Promise<T>,
    cacheFn: () => Promise<T | null>,
    cacheKey: string
  ): Promise<{ data: T | null; source: 'pms' | 'cache' | 'error' }> {
    // Circuit Breaker가 OPEN인 경우 바로 캐시 사용
    if (this.circuitBreaker.getState() === CircuitState.OPEN) {
      console.warn('Circuit breaker OPEN, using cache');
      const cachedData = await cacheFn();
      if (cachedData) {
        return { data: cachedData, source: 'cache' };
      }
      return { data: null, source: 'error' };
    }

    try {
      // PMS 호출 (with Circuit Breaker + Retry)
      const data = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(pmsFn, 3, 500);
      });

      return { data, source: 'pms' };
    } catch (error) {
      console.error('PMS 호출 실패, 캐시 사용:', error);

      // 캐시 데이터 조회
      const cachedData = await cacheFn();
      if (cachedData) {
        return { data: cachedData, source: 'cache' };
      }

      // 캐시도 없으면 에러
      return { data: null, source: 'error' };
    }
  }

  /**
   * 재고 조회 with Fallback
   */
  async getInventoryWithFallback(
    pmsFn: () => Promise<RoomInventory[]>,
    hotelId: string,
    roomTypeId: string,
    dates: string[]
  ): Promise<{
    data: RoomInventory[];
    source: 'pms' | 'cache' | 'partial';
  }> {
    try {
      // PMS 호출
      const result = await this.fetchWithFallback(
        pmsFn,
        async () => {
          const cached = await this.inventoryCache.getInventoryRange(
            hotelId,
            roomTypeId,
            dates
          );
          const inventories = Array.from(cached.values());
          return inventories.length > 0 ? inventories : null;
        },
        `inv:${hotelId}:${roomTypeId}`
      );

      if (result.source === 'pms' && result.data) {
        // PMS 성공 시 캐시 업데이트
        await this.inventoryCache.setInventoryRange(result.data);
        return { data: result.data, source: 'pms' };
      }

      if (result.source === 'cache' && result.data) {
        return { data: result.data, source: 'cache' };
      }

      return { data: [], source: 'partial' };
    } catch (error) {
      console.error('getInventoryWithFallback 에러:', error);
      return { data: [], source: 'partial' };
    }
  }

  /**
   * 요금 조회 with Fallback
   */
  async getRatesWithFallback(
    pmsFn: () => Promise<RatePlan[]>,
    hotelId: string,
    roomTypeId: string,
    dates: string[]
  ): Promise<{ data: RatePlan[]; source: 'pms' | 'cache' | 'partial' }> {
    try {
      const result = await this.fetchWithFallback(
        pmsFn,
        async () => {
          const cached = await this.rateCache.getRateRange(
            hotelId,
            roomTypeId,
            dates
          );
          const rates = Array.from(cached.values());
          return rates.length > 0 ? rates : null;
        },
        `rate:${hotelId}:${roomTypeId}`
      );

      if (result.source === 'pms' && result.data) {
        await this.rateCache.setRateRange(result.data);
        return { data: result.data, source: 'pms' };
      }

      if (result.source === 'cache' && result.data) {
        return { data: result.data, source: 'cache' };
      }

      return { data: [], source: 'partial' };
    } catch (error) {
      console.error('getRatesWithFallback 에러:', error);
      return { data: [], source: 'partial' };
    }
  }

  /**
   * Circuit Breaker 상태 확인
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}

/**
 * Degraded Mode (읽기 전용 모드)
 * PMS 장애 시 예약 불가, 조회만 가능
 */
export class DegradedModeManager {
  private isDegraded = false;
  private degradedReason = '';

  enableDegradedMode(reason: string) {
    this.isDegraded = true;
    this.degradedReason = reason;
    console.error(`⚠️ Degraded Mode 활성화: ${reason}`);
  }

  disableDegradedMode() {
    this.isDegraded = false;
    this.degradedReason = '';
    console.log('✅ Degraded Mode 해제');
  }

  isDegradedMode(): boolean {
    return this.isDegraded;
  }

  getReason(): string {
    return this.degradedReason;
  }

  checkOperationAllowed(operation: 'read' | 'write'): {
    allowed: boolean;
    message?: string;
  } {
    if (!this.isDegraded) {
      return { allowed: true };
    }

    if (operation === 'read') {
      return {
        allowed: true,
        message: 'Degraded Mode: 캐시 데이터를 사용합니다.',
      };
    }

    return {
      allowed: false,
      message: `Degraded Mode: 현재 예약이 불가능합니다. (${this.degradedReason})`,
    };
  }
}

/**
 * 사용 예시:
 *
 * const fallbackStrategy = new FallbackStrategy();
 * const degradedManager = new DegradedModeManager();
 *
 * // 재고 조회
 * const result = await fallbackStrategy.getInventoryWithFallback(
 *   () => pmsConnector.getInventory(...),
 *   'hotel_123',
 *   'room_456',
 *   ['2025-11-01', '2025-11-02']
 * );
 *
 * if (result.source === 'cache') {
 *   console.warn('⚠️ PMS 장애로 캐시 데이터 사용 중');
 * }
 *
 * // 예약 시도
 * const opCheck = degradedManager.checkOperationAllowed('write');
 * if (!opCheck.allowed) {
 *   throw new Error(opCheck.message);
 * }
 */
