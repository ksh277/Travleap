/**
 * 가격 캐싱 시스템
 * TTL 5분, Hit율 목표 >70%
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class PriceCache {
  private cache: Map<string, CacheEntry<any>>;
  private hits: number;
  private misses: number;
  private defaultTTL: number; // 5분

  constructor(defaultTTLMinutes: number = 5) {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.defaultTTL = defaultTTLMinutes * 60 * 1000;

    // 1분마다 만료된 항목 정리
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * 캐시 키 생성
   */
  private generateKey(params: {
    vehicleId: number;
    startDate: string;
    endDate: string;
    location?: string;
  }): string {
    return `price:${params.vehicleId}:${params.startDate}:${params.endDate}:${params.location || 'default'}`;
  }

  /**
   * 캐시에서 가져오기
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // TTL 확인
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // 만료됨
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  /**
   * 캐시에 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  /**
   * 가격 계산 결과 캐시 (헬퍼)
   */
  async getPriceOrCalculate(
    params: {
      vehicleId: number;
      startDate: string;
      endDate: string;
      location?: string;
    },
    calculator: () => Promise<any>
  ): Promise<any> {
    const key = this.generateKey(params);

    // 1. 캐시 확인
    const cached = this.get(key);
    if (cached) {
      console.log(`[Price Cache] HIT: ${key}`);
      return cached;
    }

    // 2. 계산 수행
    console.log(`[Price Cache] MISS: ${key}`);
    const result = await calculator();

    // 3. 캐시 저장
    this.set(key, result);

    return result;
  }

  /**
   * 특정 차량의 캐시 무효화
   */
  invalidateVehicle(vehicleId: number): number {
    let count = 0;
    const prefix = `price:${vehicleId}:`;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    console.log(`[Price Cache] ${vehicleId}번 차량 캐시 ${count}개 무효화`);
    return count;
  }

  /**
   * 전체 캐시 무효화
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[Price Cache] 전체 캐시 ${size}개 삭제`);
  }

  /**
   * 만료된 항목 정리
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Price Cache] 만료 항목 ${cleanedCount}개 정리`);
    }
  }

  /**
   * 캐시 통계
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
  } {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests
    };
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    console.log('[Price Cache] 통계 초기화');
  }
}

// 싱글톤 인스턴스
export const priceCache = new PriceCache(5); // 5분 TTL

export default priceCache;
