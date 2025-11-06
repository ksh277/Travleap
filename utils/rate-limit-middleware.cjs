/**
 * API Rate Limiting 미들웨어
 *
 * DoS/DDoS 공격 방지를 위한 요청 제한
 * - IP 기반 요청 수 제한
 * - Sliding window 알고리즘 사용
 * - 메모리 기반 (간단한 구현)
 */

// 메모리 기반 저장소 (프로덕션에서는 Redis 권장)
const requestStore = new Map();

/**
 * Rate Limit 설정 프리셋
 */
const RATE_LIMIT_PRESETS = {
  // 엄격한 제한 (인증 API)
  strict: {
    windowMs: 15 * 60 * 1000, // 15분
    maxRequests: 5,           // 5회
    message: '너무 많은 시도가 감지되었습니다. 15분 후 다시 시도해주세요.'
  },

  // 일반 제한 (대부분의 API)
  standard: {
    windowMs: 1 * 60 * 1000,  // 1분
    maxRequests: 60,          // 60회
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  },

  // 느슨한 제한 (공개 API)
  relaxed: {
    windowMs: 1 * 60 * 1000,  // 1분
    maxRequests: 120,         // 120회
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  },

  // 결제 API (매우 엄격)
  payment: {
    windowMs: 5 * 60 * 1000,  // 5분
    maxRequests: 3,           // 3회
    message: '결제 시도 횟수를 초과했습니다. 5분 후 다시 시도해주세요.'
  }
};

/**
 * 클라이언트 IP 추출
 */
function getClientIp(req) {
  // Vercel/CloudFlare 등 프록시 환경 고려
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress ||
         'unknown';
}

/**
 * 만료된 요청 기록 정리
 */
function cleanupExpiredRecords(windowMs) {
  const now = Date.now();
  const expiredKeys = [];

  for (const [key, data] of requestStore.entries()) {
    if (now - data.windowStart > windowMs) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach(key => requestStore.delete(key));
}

/**
 * Rate Limit 체크
 */
function checkRateLimit(identifier, options) {
  const { windowMs, maxRequests } = options;
  const now = Date.now();

  // 기록 조회 또는 생성
  let record = requestStore.get(identifier);

  if (!record || now - record.windowStart > windowMs) {
    // 새로운 윈도우 시작
    record = {
      windowStart: now,
      requests: []
    };
    requestStore.set(identifier, record);
  }

  // 현재 윈도우 내의 요청만 필터링
  record.requests = record.requests.filter(
    timestamp => now - timestamp < windowMs
  );

  // 요청 수 체크
  if (record.requests.length >= maxRequests) {
    const oldestRequest = record.requests[0];
    const resetTime = oldestRequest + windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);

    return {
      allowed: false,
      current: record.requests.length,
      limit: maxRequests,
      retryAfter
    };
  }

  // 새 요청 기록
  record.requests.push(now);
  requestStore.set(identifier, record);

  return {
    allowed: true,
    current: record.requests.length,
    limit: maxRequests,
    remaining: maxRequests - record.requests.length
  };
}

/**
 * Rate Limit 미들웨어
 *
 * @param {Object} options - 설정 옵션
 * @param {string} options.preset - 프리셋 이름 ('strict', 'standard', 'relaxed', 'payment')
 * @param {number} options.windowMs - 시간 윈도우 (밀리초)
 * @param {number} options.maxRequests - 최대 요청 수
 * @param {string} options.message - 제한 초과 메시지
 * @param {Function} options.keyGenerator - 커스텀 키 생성 함수
 * @param {boolean} options.skipSuccessfulRequests - 성공한 요청은 카운트 안함
 */
function rateLimit(options = {}) {
  // 프리셋 또는 커스텀 설정
  const preset = options.preset ? RATE_LIMIT_PRESETS[options.preset] : null;
  const config = preset ? { ...preset, ...options } : {
    windowMs: options.windowMs || RATE_LIMIT_PRESETS.standard.windowMs,
    maxRequests: options.maxRequests || RATE_LIMIT_PRESETS.standard.maxRequests,
    message: options.message || RATE_LIMIT_PRESETS.standard.message
  };

  // 주기적으로 만료된 기록 정리 (5분마다)
  const cleanupInterval = setInterval(() => {
    cleanupExpiredRecords(config.windowMs);
  }, 5 * 60 * 1000);

  // Cleanup on process exit
  if (typeof process !== 'undefined') {
    process.on('exit', () => clearInterval(cleanupInterval));
  }

  return function rateLimitMiddleware(req, res, next) {
    // 커스텀 키 또는 IP 사용
    const identifier = options.keyGenerator
      ? options.keyGenerator(req)
      : getClientIp(req);

    // Rate limit 체크
    const result = checkRateLimit(identifier, config);

    // 헤더 추가
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining || 0);

    if (!result.allowed) {
      res.setHeader('X-RateLimit-Reset', Date.now() + (result.retryAfter * 1000));
      res.setHeader('Retry-After', result.retryAfter);

      console.warn(`⚠️ [Rate Limit] ${identifier} exceeded limit: ${result.current}/${result.limit}`);

      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: config.message,
        retryAfter: result.retryAfter
      });
    }

    // 요청 허용
    next();
  };
}

/**
 * Rate Limit 미들웨어를 함수 핸들러에 적용
 */
function withRateLimit(handler, options = {}) {
  const limiter = rateLimit(options);

  return async function (req, res) {
    // Rate limit 체크
    return new Promise((resolve) => {
      limiter(req, res, () => {
        resolve(handler(req, res));
      });
    });
  };
}

/**
 * 프리셋별 미들웨어
 */
function withStrictRateLimit(handler) {
  return withRateLimit(handler, { preset: 'strict' });
}

function withStandardRateLimit(handler) {
  return withRateLimit(handler, { preset: 'standard' });
}

function withRelaxedRateLimit(handler) {
  return withRateLimit(handler, { preset: 'relaxed' });
}

function withPaymentRateLimit(handler) {
  return withRateLimit(handler, { preset: 'payment' });
}

/**
 * 통계 조회 (디버깅용)
 */
function getRateLimitStats() {
  const stats = {
    totalIdentifiers: requestStore.size,
    records: []
  };

  for (const [identifier, data] of requestStore.entries()) {
    stats.records.push({
      identifier,
      requests: data.requests.length,
      windowStart: new Date(data.windowStart).toISOString()
    });
  }

  return stats;
}

/**
 * Rate limit 초기화 (테스트용)
 */
function resetRateLimit(identifier = null) {
  if (identifier) {
    requestStore.delete(identifier);
  } else {
    requestStore.clear();
  }
}

module.exports = {
  rateLimit,
  withRateLimit,
  withStrictRateLimit,
  withStandardRateLimit,
  withRelaxedRateLimit,
  withPaymentRateLimit,
  getRateLimitStats,
  resetRateLimit,
  RATE_LIMIT_PRESETS
};
