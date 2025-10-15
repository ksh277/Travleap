/**
 * Redis Fallback - 메모리 기반 임시 저장소
 *
 * Redis가 없을 때 개발/테스트용으로 사용
 * 프로덕션에서는 반드시 실제 Redis 사용!
 */

interface CacheItem {
  value: string;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 만료된 항목 정리 (1분마다)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK' | null> {
    const expiresAt = ttl ? Date.now() + ttl : Infinity;

    // NX 모드: key가 없을 때만 설정
    if (mode === 'NX' && this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      if (existing.expiresAt > Date.now()) {
        return null; // 이미 존재함
      }
    }

    this.cache.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      const item = this.cache.get(key);
      if (item && item.expiresAt > Date.now()) {
        count++;
      }
    }
    return count;
  }

  async pttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return -2; // key doesn't exist

    if (item.expiresAt === Infinity) return -1; // no expiry

    const ttl = item.expiresAt - Date.now();
    return ttl > 0 ? ttl : -2;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const item = this.cache.get(key)!;
        if (item.expiresAt > Date.now()) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  async eval(script: string, numKeys: number, ...args: string[]): Promise<number> {
    // Lua 스크립트 시뮬레이션 (단순 삭제 스크립트만 지원)
    const key = args[0];
    const token = args[1];

    const item = this.cache.get(key);
    if (item && item.value === token) {
      this.cache.delete(key);
      return 1;
    }

    return 0;
  }

  async quit(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  // Redis 호환 메서드 추가
  on(event: string, callback: (...args: any[]) => void): void {
    if (event === 'connect') {
      setTimeout(() => callback(), 0);
    }
  }

  async subscribe(channel: string, callback?: (err: Error | null) => void): Promise<void> {
    if (callback) callback(null);
  }

  async publish(channel: string, message: string): Promise<number> {
    return 0; // No subscribers in memory mode
  }
}

let memoryCache: MemoryCache | null = null;

export function createRedisFallback(): MemoryCache {
  if (!memoryCache) {
    memoryCache = new MemoryCache();
    console.warn('⚠️ [Redis Fallback] Using in-memory cache. Install Redis for production!');
  }
  return memoryCache;
}

export function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL && process.env.REDIS_URL !== '';
}
