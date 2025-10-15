/**
 * Idempotency 미들웨어
 *
 * 기능:
 * - 중복 요청 방지 (네트워크 재시도, 중복 클릭)
 * - Idempotency-Key 헤더 기반 요청 식별
 * - 첫 요청 결과 Redis에 캐시 (24시간 TTL)
 * - 동일 키로 재요청 시 캐시된 결과 반환
 *
 * 적용 라우트:
 * - POST /api/bookings/create
 * - POST /api/payments/*
 * - POST /api/bookings/cancel|extend|return-inspect
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { createRedisFallback, isRedisAvailable } from '../utils/redis-fallback';

const REDIS_URL = process.env.REDIS_URL || '';
const IDEMPOTENCY_TTL_SEC = 86400; // 24시간

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

class IdempotencyManager {
  private redis: Redis | any;
  private readonly keyPrefix = 'idempotency:';

  constructor() {
    if (isRedisAvailable()) {
      this.redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected for Idempotency');
      });

      this.redis.on('error', (err: Error) => {
        console.error('❌ Idempotency Redis error:', err);
        this.redis = createRedisFallback();
      });
    } else {
      console.warn('⚠️ [Idempotency] No REDIS_URL configured, using in-memory cache');
      this.redis = createRedisFallback();
    }
  }

  /**
   * Idempotency 키 생성
   * @param idempotencyKey 클라이언트 제공 UUID
   * @param route API 경로
   * @param userId 사용자 ID (선택)
   */
  private buildKey(idempotencyKey: string, route: string, userId?: string): string {
    const components = [this.keyPrefix, route, idempotencyKey];
    if (userId) components.push(userId);
    return components.join(':');
  }

  /**
   * 캐시된 응답 조회
   */
  async getCache(key: string): Promise<CachedResponse | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      const response: CachedResponse = JSON.parse(cached);
      console.log(`🔁 [Idempotency] Cache HIT: ${key}`);
      return response;
    } catch (error) {
      console.error(`❌ [Idempotency] Cache read error:`, error);
      return null;
    }
  }

  /**
   * 응답 캐시 저장
   */
  async setCache(key: string, response: CachedResponse): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(response),
        'EX',
        IDEMPOTENCY_TTL_SEC
      );
      console.log(`💾 [Idempotency] Cache SET: ${key} (TTL: ${IDEMPOTENCY_TTL_SEC}s)`);
    } catch (error) {
      console.error(`❌ [Idempotency] Cache write error:`, error);
    }
  }

  /**
   * 캐시 삭제 (롤백/취소 시)
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`🗑️ [Idempotency] Cache invalidated: ${key}`);
    } catch (error) {
      console.error(`❌ [Idempotency] Cache delete error:`, error);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

const idempotencyManager = new IdempotencyManager();

/**
 * Idempotency 미들웨어
 *
 * 사용법:
 * ```
 * router.post('/bookings/create', idempotencyMiddleware, createBookingHandler);
 * ```
 */
export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Idempotency-Key 헤더 필수
  if (!idempotencyKey) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key 헤더가 필요합니다. UUID 형식의 고유 키를 제공해주세요.'
    });
    return;
  }

  // UUID 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key는 유효한 UUID 형식이어야 합니다.'
    });
    return;
  }

  const route = req.path;
  const userId = (req as any).user?.id || (req as any).userId || undefined;

  const cacheKey = idempotencyManager['buildKey'](idempotencyKey, route, userId);

  console.log(`🔑 [Idempotency] Request: ${req.method} ${route} (key: ${idempotencyKey.substring(0, 8)}...)`);

  // 1. 캐시 확인
  idempotencyManager.getCache(cacheKey).then(cached => {
    if (cached) {
      // 캐시된 응답 반환
      console.log(`✅ [Idempotency] Returning cached response`);
      res.status(cached.statusCode);

      // 헤더 복원
      Object.keys(cached.headers).forEach(key => {
        res.setHeader(key, cached.headers[key]);
      });

      res.setHeader('X-Idempotency-Replay', 'true');
      res.json(cached.body);
      return;
    }

    // 2. 캐시 없음 - 요청 처리 계속
    console.log(`🔄 [Idempotency] Processing new request`);

    // 원본 res.json 함수 저장
    const originalJson = res.json.bind(res);

    // res.json 오버라이드 (응답 캐싱)
    res.json = function(body: any) {
      const statusCode = res.statusCode;

      // 성공 응답만 캐시 (2xx, 3xx)
      if (statusCode >= 200 && statusCode < 400) {
        const cachedResponse: CachedResponse = {
          statusCode,
          headers: {
            'content-type': 'application/json'
          },
          body,
          timestamp: Date.now()
        };

        // 비동기 캐시 저장 (응답 지연 방지)
        idempotencyManager.setCache(cacheKey, cachedResponse).catch(err => {
          console.error(`❌ [Idempotency] Cache save failed:`, err);
        });
      }

      // 원본 응답 전송
      return originalJson(body);
    };

    // 다음 미들웨어/핸들러로 진행
    next();
  }).catch(error => {
    console.error(`❌ [Idempotency] Middleware error:`, error);
    // 에러 발생 시에도 요청 계속 진행 (가용성 우선)
    next();
  });
}

/**
 * 조건부 Idempotency 미들웨어
 * Idempotency-Key가 있으면 적용, 없으면 통과
 *
 * 사용법:
 * ```
 * router.post('/bookings/create', optionalIdempotencyMiddleware, handler);
 * ```
 */
export function optionalIdempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    // Idempotency-Key 없으면 그냥 통과
    next();
    return;
  }

  // 있으면 idempotencyMiddleware 적용
  idempotencyMiddleware(req, res, next);
}

/**
 * Idempotency 키 생성 헬퍼 (클라이언트용)
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Idempotency 캐시 수동 무효화
 * (결제 취소, 예약 취소 등에서 사용)
 */
export async function invalidateIdempotencyCache(
  idempotencyKey: string,
  route: string,
  userId?: string
): Promise<void> {
  const key = idempotencyManager['buildKey'](idempotencyKey, route, userId);
  await idempotencyManager.invalidate(key);
}

export { idempotencyManager };
