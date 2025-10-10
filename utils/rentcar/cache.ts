/**
 * 렌트카 Redis 캐시 레이어
 */

import type { CarSearchResult, QuoteResponse } from './types';
import { CacheKeys, CacheTTL } from './types';

// Redis 클라이언트 인터페이스 (PMS와 동일)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// 간단한 메모리 캐시 (개발용)
class InMemoryCache implements RedisClient {
  private cache = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ex?: number): Promise<void> {
    const expiresAt = ex ? Date.now() + ex * 1000 : Infinity;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Redis 클라이언트 (싱글톤)
let redisClient: RedisClient;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    // 개발 환경에서는 인메모리 캐시 사용
    redisClient = new InMemoryCache();
  }
  return redisClient;
}

/**
 * 검색 결과 캐시
 */
export class CarSearchCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  /**
   * 검색 결과 저장
   */
  async setSearchResults(
    pickupPlaceId: string,
    pickupAt: string,
    results: CarSearchResult[]
  ): Promise<void> {
    const key = CacheKeys.search(pickupPlaceId, pickupAt);
    await this.redis.set(
      key,
      JSON.stringify(results),
      CacheTTL.search
    );
  }

  /**
   * 검색 결과 조회
   */
  async getSearchResults(
    pickupPlaceId: string,
    pickupAt: string
  ): Promise<CarSearchResult[] | null> {
    const key = CacheKeys.search(pickupPlaceId, pickupAt);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  /**
   * 검색 결과 무효화
   */
  async invalidateSearch(pickupPlaceId: string, pickupAt: string): Promise<void> {
    const key = CacheKeys.search(pickupPlaceId, pickupAt);
    await this.redis.del(key);
  }
}

/**
 * RateKey 캐시 (Quote 결과)
 */
export class RateKeyCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  /**
   * RateKey 저장
   */
  async setRateKey(
    rateKey: string,
    quoteData: QuoteResponse
  ): Promise<void> {
    const key = CacheKeys.rateKey(rateKey);
    await this.redis.set(
      key,
      JSON.stringify(quoteData),
      CacheTTL.rateKey // 15분
    );
  }

  /**
   * RateKey 조회
   */
  async getRateKey(rateKey: string): Promise<QuoteResponse | null> {
    const key = CacheKeys.rateKey(rateKey);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  /**
   * RateKey 존재 확인
   */
  async rateKeyExists(rateKey: string): Promise<boolean> {
    const key = CacheKeys.rateKey(rateKey);
    return await this.redis.exists(key);
  }

  /**
   * RateKey 무효화
   */
  async invalidateRateKey(rateKey: string): Promise<void> {
    const key = CacheKeys.rateKey(rateKey);
    await this.redis.del(key);
  }
}

/**
 * 장소 정보 캐시
 */
export class PlaceInfoCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  /**
   * 장소 정보 저장
   */
  async setPlaceInfo(
    placeId: string,
    placeInfo: any
  ): Promise<void> {
    const key = CacheKeys.placeInfo(placeId);
    await this.redis.set(
      key,
      JSON.stringify(placeInfo),
      CacheTTL.placeInfo // 24시간
    );
  }

  /**
   * 장소 정보 조회
   */
  async getPlaceInfo(placeId: string): Promise<any | null> {
    const key = CacheKeys.placeInfo(placeId);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
}

/**
 * 차량 이미지 캐시 (CDN hotlink 방지)
 */
export class VehicleImageCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  /**
   * 이미지 URL 캐싱
   *
   * 공급업체 CDN 이미지를 우리 서버로 복사하고 캐싱
   */
  async cacheImage(originalUrl: string): Promise<string> {
    const cacheKey = `car:image:${this.hashUrl(originalUrl)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return cached; // 이미 캐싱된 URL 반환
    }

    // TODO: 실제로는 이미지를 다운로드하고 CDN에 업로드
    // 1. fetch(originalUrl)로 이미지 다운로드
    // 2. S3/CloudFlare/Supabase Storage에 업로드
    // 3. 새 URL 반환
    const cachedUrl = await this.uploadToCDN(originalUrl);

    // 캐싱 (7일)
    await this.redis.set(cacheKey, cachedUrl, 604800);

    return cachedUrl;
  }

  private hashUrl(url: string): string {
    // 간단한 해시 함수 (실제로는 crypto 사용)
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async uploadToCDN(originalUrl: string): Promise<string> {
    // TODO: 실제 CDN 업로드 로직
    // 임시로 원본 URL 반환
    return originalUrl;

    // 실제 구현 예시:
    // const response = await fetch(originalUrl);
    // const buffer = await response.arrayBuffer();
    // const filename = `cars/${Date.now()}-${this.hashUrl(originalUrl)}.jpg`;
    // const { data } = await supabase.storage
    //   .from('car-images')
    //   .upload(filename, buffer);
    // return data.publicUrl;
  }

  /**
   * 차량 이미지 목록 일괄 캐싱
   */
  async cacheImages(imageUrls: string[]): Promise<string[]> {
    return Promise.all(imageUrls.map((url) => this.cacheImage(url)));
  }
}
