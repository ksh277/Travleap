/**
 * PII (Personally Identifiable Information) 마스킹 유틸리티
 *
 * 목적:
 * - 개인정보 보호를 위한 마스킹 처리
 * - 로그, API 응답, 관리자 페이지에서 민감 정보 보호
 *
 * 사용법:
 * const { maskDriverLicense, maskPhone, maskEmail } = require('./utils/pii-masking');
 * const masked = maskPhone('010-1234-5678'); // '010-****-5678'
 */

/**
 * 운전면허번호 마스킹
 *
 * 형식: 12-34-567890-12
 * 마스킹: 12-**-******-12 (중간 부분 마스킹, 앞뒤 2자리씩 표시)
 *
 * @param {string} license - 운전면허번호
 * @returns {string} 마스킹된 운전면허번호
 */
function maskDriverLicense(license) {
  if (!license || typeof license !== 'string') {
    return '***-**-******-**';
  }

  // 하이픈 제거
  const cleaned = license.replace(/-/g, '');

  if (cleaned.length < 8) {
    return '***-**-******-**';
  }

  // 형식: 12-34-567890-12 → 12-**-******-12
  // 앞 2자리, 뒤 2자리만 표시
  const first = cleaned.substring(0, 2);
  const last = cleaned.substring(cleaned.length - 2);
  const middle = '*'.repeat(cleaned.length - 4);

  return `${first}-**-${middle}-${last}`;
}

/**
 * 전화번호 마스킹
 *
 * 형식: 010-1234-5678
 * 마스킹: 010-****-5678 (중간 번호 마스킹)
 *
 * @param {string} phone - 전화번호
 * @returns {string} 마스킹된 전화번호
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '***-****-****';
  }

  // 하이픈 제거
  const cleaned = phone.replace(/[-\s]/g, '');

  if (cleaned.length === 11) {
    // 010-1234-5678 → 010-****-5678
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // 02-1234-5678 → 02-****-5678
    return `${cleaned.substring(0, 2)}-****-${cleaned.substring(6)}`;
  } else {
    // 기타: 전체 마스킹
    return '***-****-****';
  }
}

/**
 * 이메일 마스킹
 *
 * 형식: hong@example.com
 * 마스킹: ho**@example.com (@ 앞 2자리만 표시)
 *
 * @param {string} email - 이메일 주소
 * @returns {string} 마스킹된 이메일
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '****@****.com';
  }

  const [localPart, domain] = email.split('@');

  if (localPart.length <= 2) {
    // 너무 짧으면 첫 글자만 표시
    return `${localPart[0]}***@${domain}`;
  }

  // 앞 2자리만 표시, 나머지 마스킹
  const visiblePart = localPart.substring(0, 2);
  const maskedPart = '*'.repeat(localPart.length - 2);

  return `${visiblePart}${maskedPart}@${domain}`;
}

/**
 * 주민등록번호 마스킹
 *
 * 형식: 900101-1234567
 * 마스킹: 900101-*******  (뒷자리 전체 마스킹)
 *
 * @param {string} ssn - 주민등록번호
 * @returns {string} 마스킹된 주민등록번호
 */
function maskSSN(ssn) {
  if (!ssn || typeof ssn !== 'string') {
    return '******-*******';
  }

  const cleaned = ssn.replace(/-/g, '');

  if (cleaned.length !== 13) {
    return '******-*******';
  }

  // 앞 6자리만 표시, 뒷자리 전체 마스킹
  return `${cleaned.substring(0, 6)}-*******`;
}

/**
 * 신용카드 번호 마스킹
 *
 * 형식: 1234-5678-9012-3456
 * 마스킹: 1234-****-****-3456 (첫 4자리, 마지막 4자리만 표시)
 *
 * @param {string} cardNumber - 신용카드 번호
 * @returns {string} 마스킹된 신용카드 번호
 */
function maskCardNumber(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return '****-****-****-****';
  }

  const cleaned = cardNumber.replace(/[-\s]/g, '');

  if (cleaned.length !== 16) {
    return '****-****-****-****';
  }

  // 첫 4자리, 마지막 4자리만 표시
  return `${cleaned.substring(0, 4)}-****-****-${cleaned.substring(12)}`;
}

/**
 * 이름 마스킹
 *
 * 형식: 홍길동
 * 마스킹: 홍*동 (중간 글자 마스킹)
 *
 * @param {string} name - 이름
 * @returns {string} 마스킹된 이름
 */
function maskName(name) {
  if (!name || typeof name !== 'string') {
    return '***';
  }

  if (name.length === 1) {
    return '*';
  } else if (name.length === 2) {
    return `${name[0]}*`;
  } else {
    // 3글자 이상: 첫 글자와 마지막 글자만 표시
    const middle = '*'.repeat(name.length - 2);
    return `${name[0]}${middle}${name[name.length - 1]}`;
  }
}

/**
 * 주소 마스킹
 *
 * 형식: 서울특별시 강남구 테헤란로 123 ABC빌딩 456호
 * 마스킹: 서울특별시 강남구 테헤란로 *** (상세 주소 마스킹)
 *
 * @param {string} address - 주소
 * @returns {string} 마스킹된 주소
 */
function maskAddress(address) {
  if (!address || typeof address !== 'string') {
    return '***시 ***구 ***로 ***';
  }

  // 도로명 주소: 시/군/구까지만 표시
  const parts = address.split(' ');

  if (parts.length <= 3) {
    return address; // 너무 짧으면 그대로 반환
  }

  // 앞 3개 부분만 표시 (예: 서울특별시 강남구 테헤란로)
  return `${parts.slice(0, 3).join(' ')} ***`;
}

/**
 * 객체의 PII 필드 자동 마스킹
 *
 * 특정 필드명이 포함된 경우 자동으로 마스킹 처리
 *
 * @param {object} obj - 마스킹할 객체
 * @param {object} options - 마스킹 옵션
 * @param {boolean} options.deep - 중첩 객체도 마스킹할지 여부 (기본: true)
 * @returns {object} 마스킹된 객체
 */
function maskPIIFields(obj, options = { deep: true }) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const masked = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // 필드명 기반 자동 마스킹
    if (lowerKey.includes('license') || lowerKey.includes('driver_license')) {
      masked[key] = maskDriverLicense(value);
    } else if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel')) {
      masked[key] = maskPhone(value);
    } else if (lowerKey.includes('email')) {
      masked[key] = maskEmail(value);
    } else if (lowerKey.includes('ssn') || lowerKey.includes('social_security')) {
      masked[key] = maskSSN(value);
    } else if (lowerKey.includes('card_number') || lowerKey.includes('card_no')) {
      masked[key] = maskCardNumber(value);
    } else if (lowerKey.includes('name') && !lowerKey.includes('display_name') && !lowerKey.includes('vendor_name')) {
      // display_name, vendor_name 등은 마스킹 제외
      masked[key] = maskName(value);
    } else if (lowerKey.includes('address')) {
      masked[key] = maskAddress(value);
    } else if (options.deep && typeof value === 'object' && value !== null) {
      // 중첩 객체 재귀적으로 마스킹
      masked[key] = maskPIIFields(value, options);
    } else {
      // 마스킹 불필요한 필드는 그대로
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * 로그용 PII 마스킹
 *
 * 로그에 출력할 때 자동으로 PII 필드를 마스킹
 *
 * @param {any} data - 로그 데이터
 * @returns {any} 마스킹된 데이터
 */
function maskForLog(data) {
  if (typeof data === 'string') {
    // 문자열에서 이메일 패턴 마스킹
    return data.replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*@/g, '$1***@');
  } else if (typeof data === 'object' && data !== null) {
    return maskPIIFields(data, { deep: true });
  } else {
    return data;
  }
}

module.exports = {
  maskDriverLicense,
  maskPhone,
  maskEmail,
  maskSSN,
  maskCardNumber,
  maskName,
  maskAddress,
  maskPIIFields,
  maskForLog
};
