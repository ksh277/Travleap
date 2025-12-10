/**
 * 해외 IP 차단 + 초대 코드 기반 가입 제한 미들웨어
 *
 * 기능:
 * 1. 해외 IP 차단 (한국 IP만 허용)
 * 2. 초대 코드 기반 회원가입 제한
 * 3. 스팸 패턴 필터링
 */

// 한국 IP 대역 (주요 ISP)
// 참고: 실제 운영 환경에서는 MaxMind GeoIP DB 또는 외부 API 사용 권장
const KOREA_IP_RANGES = [
  // KT
  { start: '1.208.0.0', end: '1.255.255.255' },
  { start: '14.32.0.0', end: '14.63.255.255' },
  { start: '27.0.0.0', end: '27.35.255.255' },
  { start: '39.0.0.0', end: '39.31.255.255' },
  { start: '58.224.0.0', end: '58.239.255.255' },
  { start: '110.8.0.0', end: '110.15.255.255' },
  { start: '118.32.0.0', end: '118.47.255.255' },
  { start: '119.192.0.0', end: '119.207.255.255' },
  { start: '175.192.0.0', end: '175.223.255.255' },
  { start: '211.32.0.0', end: '211.63.255.255' },
  { start: '218.144.0.0', end: '218.159.255.255' },
  { start: '218.232.0.0', end: '218.239.255.255' },

  // SKT/SKB
  { start: '27.96.0.0', end: '27.127.255.255' },
  { start: '61.32.0.0', end: '61.47.255.255' },
  { start: '61.72.0.0', end: '61.111.255.255' },
  { start: '112.160.0.0', end: '112.191.255.255' },
  { start: '115.88.0.0', end: '115.95.255.255' },
  { start: '122.32.0.0', end: '122.63.255.255' },
  { start: '203.224.0.0', end: '203.255.255.255' },

  // LGU+
  { start: '1.176.0.0', end: '1.207.255.255' },
  { start: '106.240.0.0', end: '106.255.255.255' },
  { start: '114.200.0.0', end: '114.207.255.255' },
  { start: '117.111.0.0', end: '117.111.255.255' },
  { start: '182.208.0.0', end: '182.231.255.255' },
  { start: '211.192.0.0', end: '211.255.255.255' },

  // 주요 클라우드/데이터센터 (한국 리전)
  { start: '52.78.0.0', end: '52.79.255.255' }, // AWS Seoul
  { start: '13.124.0.0', end: '13.125.255.255' }, // AWS Seoul
  { start: '34.64.0.0', end: '34.127.255.255' }, // GCP Asia
  { start: '35.184.0.0', end: '35.247.255.255' }, // GCP
];

// 허용된 IP (화이트리스트) - 개발/테스트용
const WHITELISTED_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  // 개발 환경
  '192.168.0.0/16',
  '10.0.0.0/8',
  '172.16.0.0/12',
];

// 유효한 초대 코드 목록 (실제 운영 시 DB에서 관리)
const VALID_INVITE_CODES = [
  'TRAVLEAP2024',
  'SHINAN2024',
  'AWESOMEPLAN',
  'VIP2024',
  'PARTNER2024',
  'STAFF2024',
];

// 스팸 이름 패턴
const SPAM_NAME_PATTERNS = [
  /스톤/i,
  /stone/i,
  /spam/i,
  /test/i,
  /admin/i,
  /[0-9]{6,}/,  // 연속 숫자 6개 이상
  /(.)\1{4,}/,   // 같은 문자 5개 이상 반복
];

// 스팸 이메일 패턴
const SPAM_EMAIL_PATTERNS = [
  /tempmail/i,
  /guerrilla/i,
  /mailinator/i,
  /10minutemail/i,
  /throwaway/i,
  /yopmail/i,
  /sharklasers/i,
  /spam/i,
];

/**
 * IP 주소를 숫자로 변환
 */
function ipToNumber(ip) {
  if (!ip || ip === 'unknown') return 0;

  // IPv6 로컬호스트 처리
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return ipToNumber('127.0.0.1');
  }

  // IPv4-mapped IPv6 주소 처리
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  const parts = ip.split('.');
  if (parts.length !== 4) return 0;

  return parts.reduce((acc, part, i) => {
    return acc + (parseInt(part, 10) << (24 - i * 8));
  }, 0) >>> 0;
}

/**
 * IP가 한국 IP 대역에 속하는지 확인
 */
function isKoreanIp(ip) {
  // 화이트리스트 체크
  if (isWhitelisted(ip)) {
    return true;
  }

  const ipNum = ipToNumber(ip);
  if (ipNum === 0) return false;

  for (const range of KOREA_IP_RANGES) {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);

    if (ipNum >= startNum && ipNum <= endNum) {
      return true;
    }
  }

  return false;
}

/**
 * 화이트리스트 체크 (개발 환경, 로컬호스트 등)
 */
function isWhitelisted(ip) {
  if (!ip) return false;

  // 정확히 일치하는 경우
  if (WHITELISTED_IPS.includes(ip)) {
    return true;
  }

  // ::ffff: 접두사 제거
  const cleanIp = ip.replace('::ffff:', '');
  if (WHITELISTED_IPS.includes(cleanIp)) {
    return true;
  }

  // 로컬호스트
  if (cleanIp === '127.0.0.1' || ip === '::1') {
    return true;
  }

  // 사설 IP 대역 체크
  const ipNum = ipToNumber(cleanIp);

  // 10.0.0.0/8
  if (ipNum >= ipToNumber('10.0.0.0') && ipNum <= ipToNumber('10.255.255.255')) {
    return true;
  }

  // 172.16.0.0/12
  if (ipNum >= ipToNumber('172.16.0.0') && ipNum <= ipToNumber('172.31.255.255')) {
    return true;
  }

  // 192.168.0.0/16
  if (ipNum >= ipToNumber('192.168.0.0') && ipNum <= ipToNumber('192.168.255.255')) {
    return true;
  }

  return false;
}

/**
 * 클라이언트 IP 추출
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.connection?.remoteAddress ||
         'unknown';
}

/**
 * 스팸 이름 패턴 체크
 */
function isSpamName(name) {
  if (!name) return false;

  for (const pattern of SPAM_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }

  return false;
}

/**
 * 스팸 이메일 체크
 */
function isSpamEmail(email) {
  if (!email) return false;

  for (const pattern of SPAM_EMAIL_PATTERNS) {
    if (pattern.test(email)) {
      return true;
    }
  }

  return false;
}

/**
 * 초대 코드 검증
 */
function isValidInviteCode(code) {
  if (!code) return false;
  return VALID_INVITE_CODES.includes(code.toUpperCase().trim());
}

/**
 * 해외 IP 차단 미들웨어
 */
function withGeoBlock(handler, options = {}) {
  const {
    enabled = true,
    allowedCountries = ['KR'],
    logBlocked = true
  } = options;

  return async function (req, res) {
    if (!enabled) {
      return handler(req, res);
    }

    const ip = getClientIp(req);

    // 한국 IP가 아니면 차단
    if (!isKoreanIp(ip)) {
      if (logBlocked) {
        console.warn(`🚫 [GeoBlock] 해외 IP 차단: ${ip} - ${req.url}`);
      }

      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: '해외에서의 접근이 제한되어 있습니다. (Access from overseas is restricted.)'
      });
    }

    return handler(req, res);
  };
}

/**
 * 초대 코드 기반 회원가입 제한 미들웨어
 */
function withInviteCodeRequired(handler, options = {}) {
  const {
    enabled = true,
    bypassRoles = ['admin', 'super_admin']
  } = options;

  return async function (req, res) {
    if (!enabled) {
      return handler(req, res);
    }

    // POST 요청만 체크 (회원가입)
    if (req.method !== 'POST') {
      return handler(req, res);
    }

    const { invite_code, inviteCode } = req.body || {};
    const code = invite_code || inviteCode;

    if (!isValidInviteCode(code)) {
      console.warn(`🚫 [InviteCode] 잘못된 초대 코드: ${code || '없음'} - IP: ${getClientIp(req)}`);

      return res.status(403).json({
        success: false,
        error: 'INVALID_INVITE_CODE',
        message: '유효한 초대 코드가 필요합니다. 관리자에게 문의해주세요.'
      });
    }

    // 요청에 검증된 코드 표시
    req.validatedInviteCode = code;

    return handler(req, res);
  };
}

/**
 * 스팸 필터 미들웨어
 */
function withSpamFilter(handler, options = {}) {
  const {
    enabled = true,
    checkName = true,
    checkEmail = true
  } = options;

  return async function (req, res) {
    if (!enabled) {
      return handler(req, res);
    }

    // POST 요청만 체크
    if (req.method !== 'POST') {
      return handler(req, res);
    }

    const { name, username, email } = req.body || {};

    // 이름 스팸 체크
    if (checkName && (isSpamName(name) || isSpamName(username))) {
      console.warn(`🚫 [SpamFilter] 스팸 이름 감지: ${name || username} - IP: ${getClientIp(req)}`);

      return res.status(400).json({
        success: false,
        error: 'INVALID_NAME',
        message: '사용할 수 없는 이름입니다.'
      });
    }

    // 이메일 스팸 체크
    if (checkEmail && isSpamEmail(email)) {
      console.warn(`🚫 [SpamFilter] 스팸 이메일 감지: ${email} - IP: ${getClientIp(req)}`);

      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: '사용할 수 없는 이메일 주소입니다. 실제 이메일을 사용해주세요.'
      });
    }

    return handler(req, res);
  };
}

/**
 * 통합 보안 미들웨어 (해외IP차단 + 초대코드 + 스팸필터)
 */
function withSecureSignup(handler, options = {}) {
  const {
    geoBlockEnabled = true,
    inviteCodeEnabled = false, // 기본값 비활성화 (필요시 true로)
    spamFilterEnabled = true
  } = options;

  let wrappedHandler = handler;

  // 스팸 필터 적용
  if (spamFilterEnabled) {
    wrappedHandler = withSpamFilter(wrappedHandler);
  }

  // 초대 코드 적용
  if (inviteCodeEnabled) {
    wrappedHandler = withInviteCodeRequired(wrappedHandler);
  }

  // 해외 IP 차단 적용
  if (geoBlockEnabled) {
    wrappedHandler = withGeoBlock(wrappedHandler);
  }

  return wrappedHandler;
}

/**
 * IP 정보 확인 (디버깅용)
 */
function getIpInfo(ip) {
  return {
    ip,
    isKorean: isKoreanIp(ip),
    isWhitelisted: isWhitelisted(ip),
    ipNumber: ipToNumber(ip)
  };
}

module.exports = {
  withGeoBlock,
  withInviteCodeRequired,
  withSpamFilter,
  withSecureSignup,
  isKoreanIp,
  isWhitelisted,
  isSpamName,
  isSpamEmail,
  isValidInviteCode,
  getClientIp,
  getIpInfo,
  VALID_INVITE_CODES
};
