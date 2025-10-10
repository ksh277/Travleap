/**
 * Redis 캐시 레이어
 * 재고/요금 데이터를 Redis에 캐싱하여 성능 향상
 */

import type { RoomInventory, RatePlan } from './types';
import { CacheKeys, CacheTTL } from './types';

// Redis 클라이언트 인터페이스 (실제 프로젝트에서는 ioredis 등 사용)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex?: number): Promise<void>;
  del(key: string): Promise<void>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(keyValues: Record<string, string>): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// 간단한 메모리 캐시 구현 (개발용 - 실제로는 Redis 사용)
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

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async mset(keyValues: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(keyValues)) {
      await this.set(key, value);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // 개발용: 캐시 전체 삭제
  clear(): void {
    this.cache.clear();
  }
}

// Redis 클라이언트 (싱글톤)
let redisClient: RedisClient;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    // 실제 프로덕션에서는 ioredis 사용
    // import Redis from 'ioredis';
    // redisClient = new Redis(process.env.REDIS_URL);

    // 개발 환경에서는 인메모리 캐시 사용
    redisClient = new InMemoryCache();
  }
  return redisClient;
}

// 재고 캐시 관리
export class InventoryCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  // 재고 조회 (캐시 우선)
  async getInventory(
    hotelId: string,
    roomTypeId: string,
    date: string
  ): Promise<RoomInventory | null> {
    const key = CacheKeys.inventory(hotelId, roomTypeId, date);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  // 재고 저장
  async setInventory(inventory: RoomInventory): Promise<void> {
    const key = CacheKeys.inventory(
      inventory.hotelId,
      inventory.roomTypeId,
      inventory.date
    );

    await this.redis.set(
      key,
      JSON.stringify({
        ...inventory,
        updatedAt: new Date().toISOString(),
      }),
      CacheTTL.inventory
    );
  }

  // 여러 날짜의 재고 일괄 조회
  async getInventoryRange(
    hotelId: string,
    roomTypeId: string,
    dates: string[]
  ): Promise<Map<string, RoomInventory>> {
    const keys = dates.map((date) =>
      CacheKeys.inventory(hotelId, roomTypeId, date)
    );
    const values = await this.redis.mget(keys);

    const result = new Map<string, RoomInventory>();

    values.forEach((value, index) => {
      if (value) {
        try {
          const inventory = JSON.parse(value);
          result.set(dates[index], inventory);
        } catch {
          // 파싱 실패 시 무시
        }
      }
    });

    return result;
  }

  // 여러 날짜의 재고 일괄 저장
  async setInventoryRange(inventories: RoomInventory[]): Promise<void> {
    const keyValues: Record<string, string> = {};

    for (const inv of inventories) {
      const key = CacheKeys.inventory(inv.hotelId, inv.roomTypeId, inv.date);
      keyValues[key] = JSON.stringify({
        ...inv,
        updatedAt: new Date().toISOString(),
      });
    }

    await this.redis.mset(keyValues);

    // TTL 설정
    for (const key of Object.keys(keyValues)) {
      await this.redis.expire(key, CacheTTL.inventory);
    }
  }

  // 재고 감소 (예약 시)
  async decrementInventory(
    hotelId: string,
    roomTypeId: string,
    date: string,
    quantity: number = 1
  ): Promise<boolean> {
    const inventory = await this.getInventory(hotelId, roomTypeId, date);

    if (!inventory || inventory.available < quantity) {
      return false; // 재고 부족
    }

    inventory.available -= quantity;
    inventory.updatedAt = new Date();

    await this.setInventory(inventory);
    return true;
  }

  // 재고 복구 (예약 취소 시)
  async incrementInventory(
    hotelId: string,
    roomTypeId: string,
    date: string,
    quantity: number = 1
  ): Promise<void> {
    const inventory = await this.getInventory(hotelId, roomTypeId, date);

    if (inventory) {
      inventory.available += quantity;
      inventory.updatedAt = new Date();
      await this.setInventory(inventory);
    }
  }

  // 재고 무효화 (PMS 웹훅 수신 시)
  async invalidateInventory(
    hotelId: string,
    roomTypeId: string,
    date: string
  ): Promise<void> {
    const key = CacheKeys.inventory(hotelId, roomTypeId, date);
    await this.redis.del(key);
  }
}

// 요금 캐시 관리
export class RateCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  // 요금 조회
  async getRate(
    hotelId: string,
    roomTypeId: string,
    date: string
  ): Promise<RatePlan | null> {
    const key = CacheKeys.rate(hotelId, roomTypeId, date);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  // 요금 저장
  async setRate(rate: RatePlan): Promise<void> {
    const key = CacheKeys.rate(rate.hotelId, rate.roomTypeId, rate.date);
    await this.redis.set(key, JSON.stringify(rate), CacheTTL.rate);
  }

  // 여러 날짜의 요금 일괄 조회
  async getRateRange(
    hotelId: string,
    roomTypeId: string,
    dates: string[]
  ): Promise<Map<string, RatePlan>> {
    const keys = dates.map((date) => CacheKeys.rate(hotelId, roomTypeId, date));
    const values = await this.redis.mget(keys);

    const result = new Map<string, RatePlan>();

    values.forEach((value, index) => {
      if (value) {
        try {
          const rate = JSON.parse(value);
          result.set(dates[index], rate);
        } catch {
          // 파싱 실패 시 무시
        }
      }
    });

    return result;
  }

  // 여러 날짜의 요금 일괄 저장
  async setRateRange(rates: RatePlan[]): Promise<void> {
    const keyValues: Record<string, string> = {};

    for (const rate of rates) {
      const key = CacheKeys.rate(rate.hotelId, rate.roomTypeId, rate.date);
      keyValues[key] = JSON.stringify(rate);
    }

    await this.redis.mset(keyValues);

    // TTL 설정
    for (const key of Object.keys(keyValues)) {
      await this.redis.expire(key, CacheTTL.rate);
    }
  }

  // 요금 무효화
  async invalidateRate(
    hotelId: string,
    roomTypeId: string,
    date: string
  ): Promise<void> {
    const key = CacheKeys.rate(hotelId, roomTypeId, date);
    await this.redis.del(key);
  }
}

// Hold 캐시 관리 (단기 재고 잠금)
export class HoldCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || getRedisClient();
  }

  // Hold 생성
  async createHold(
    holdId: string,
    hotelId: string,
    roomTypeId: string,
    dates: string[],
    quantity: number,
    ttlSeconds: number = CacheTTL.hold
  ): Promise<void> {
    const key = CacheKeys.hold(holdId);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.redis.set(
      key,
      JSON.stringify({
        id: holdId,
        hotelId,
        roomTypeId,
        dates,
        quantity,
        expiresAt: expiresAt.toISOString(),
      }),
      ttlSeconds
    );
  }

  // Hold 조회
  async getHold(holdId: string): Promise<any | null> {
    const key = CacheKeys.hold(holdId);
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  // Hold 해제
  async releaseHold(holdId: string): Promise<void> {
    const key = CacheKeys.hold(holdId);
    await this.redis.del(key);
  }

  // Hold 확인 (존재 여부)
  async holdExists(holdId: string): Promise<boolean> {
    const key = CacheKeys.hold(holdId);
    return await this.redis.exists(key);
  }
}
