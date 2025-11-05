/**
 * CORS 미들웨어
 *
 * 보안 강화를 위한 CORS 설정:
 * - 프로덕션: 특정 도메인만 허용
 * - 개발: localhost 허용
 * - 공개 API: 와일드카드 허용 가능
 */

/**
 * 허용된 Origin 목록
 */
function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // 기본값: 프로덕션 도메인 + 개발 환경
  return [
    'https://travelap.vercel.app',
    'https://www.travelap.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  ];
}

/**
 * CORS 헤더 설정
 *
 * @param {Object} res - Response 객체
 * @param {Object} req - Request 객체 (origin 확인용)
 * @param {Object} options - 옵션
 * @param {boolean} options.allowAnyOrigin - 모든 도메인 허용 (공개 API용)
 * @param {string[]} options.allowedMethods - 허용할 HTTP 메서드
 * @param {string[]} options.allowedHeaders - 허용할 헤더
 * @param {boolean} options.credentials - 인증 정보 포함 여부
 */
function setCorsHeaders(res, req, options = {}) {
  const {
    allowAnyOrigin = false,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true
  } = options;

  if (allowAnyOrigin) {
    // 공개 API: 모든 도메인 허용
    res.setHeader('Access-Control-Allow-Origin', '*');
    // * 사용 시 credentials는 false여야 함
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'false');
    }
  } else {
    // 보안 API: 요청 origin 확인 후 단일 origin 반환
    const requestOrigin = req.headers.origin || req.headers.Origin;
    const allowedOrigins = getAllowedOrigins();

    // 요청 origin이 허용 목록에 있으면 해당 origin 반환
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      // 요청 origin이 없거나 허용되지 않으면 첫 번째 허용 origin 사용 (fallback)
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
  }

  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
}

/**
 * CORS 미들웨어 (공개 API용)
 *
 * @param {Function} handler - API 핸들러
 * @returns {Function} CORS가 적용된 핸들러
 */
function withCors(handler, options = {}) {
  return async function (req, res) {
    // CORS 헤더 설정 (req 전달)
    setCorsHeaders(res, req, { ...options, allowAnyOrigin: options.public || false });

    // OPTIONS 요청 처리 (preflight)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // 실제 핸들러 실행
    return handler(req, res);
  };
}

/**
 * 보안 CORS 미들웨어 (인증 필요한 API용)
 *
 * @param {Function} handler - API 핸들러
 * @returns {Function} 보안 CORS가 적용된 핸들러
 */
function withSecureCors(handler) {
  return withCors(handler, {
    public: false,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  });
}

/**
 * 공개 API CORS 미들웨어
 *
 * @param {Function} handler - API 핸들러
 * @returns {Function} 공개 CORS가 적용된 핸들러
 */
function withPublicCors(handler) {
  return withCors(handler, {
    public: true,
    credentials: false
  });
}

module.exports = {
  setCorsHeaders,
  withCors,
  withSecureCors,
  withPublicCors,
  getAllowedOrigins
};
