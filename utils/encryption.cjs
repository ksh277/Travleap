/**
 * 고객 정보 암호화/복호화 유틸리티
 *
 * AES-256-GCM 알고리즘 사용
 * - 대칭키 암호화
 * - 인증 태그를 통한 무결성 검증
 * - IV(Initialization Vector)로 동일 데이터도 다르게 암호화
 */

const crypto = require('crypto');

// 암호화 키 (환경변수에서 로드)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-character-key-change-me-now!'; // 32 bytes
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES에서 사용하는 IV 길이

/**
 * 데이터 암호화
 * @param {string} text - 암호화할 평문
 * @returns {string} - 암호화된 텍스트 (iv:authTag:encrypted 형식)
 */
function encrypt(text) {
  if (!text) return null;

  try {
    // 랜덤 IV 생성 (동일한 평문도 매번 다르게 암호화)
    const iv = crypto.randomBytes(IV_LENGTH);

    // 암호화 키가 32바이트가 아니면 해시로 변환
    const key = Buffer.from(
      crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('hex').substring(0, 64),
      'hex'
    );

    // Cipher 생성
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 암호화 실행
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 인증 태그 추출 (데이터 무결성 검증용)
    const authTag = cipher.getAuthTag();

    // IV : AuthTag : Encrypted 형식으로 반환
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 데이터 복호화
 * @param {string} encryptedText - 암호화된 텍스트 (iv:authTag:encrypted 형식)
 * @returns {string} - 복호화된 평문
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;

  try {
    // IV, AuthTag, Encrypted 분리
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // 암호화 키 재생성 (암호화할 때와 동일한 방식)
    const key = Buffer.from(
      crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('hex').substring(0, 64),
      'hex'
    );

    // Decipher 생성
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // 복호화 실행
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    // 복호화 실패 시 원본 반환 (하위 호환성)
    return encryptedText;
  }
}

/**
 * 전화번호 암호화 (하이픈 제거 후 암호화)
 * @param {string} phone - 전화번호
 * @returns {string} - 암호화된 전화번호
 */
function encryptPhone(phone) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return encrypt(cleanPhone);
}

/**
 * 전화번호 복호화 (복호화 후 하이픈 추가)
 * @param {string} encryptedPhone - 암호화된 전화번호
 * @returns {string} - 복호화된 전화번호 (010-1234-5678 형식)
 */
function decryptPhone(encryptedPhone) {
  if (!encryptedPhone) return null;
  const phone = decrypt(encryptedPhone);

  // 010-1234-5678 형식으로 변환
  if (phone && phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

/**
 * 이메일 암호화
 * @param {string} email - 이메일
 * @returns {string} - 암호화된 이메일
 */
function encryptEmail(email) {
  if (!email) return null;
  return encrypt(email.toLowerCase());
}

/**
 * 이메일 복호화
 * @param {string} encryptedEmail - 암호화된 이메일
 * @returns {string} - 복호화된 이메일
 */
function decryptEmail(encryptedEmail) {
  return decrypt(encryptedEmail);
}

/**
 * 객체의 특정 필드만 암호화
 * @param {Object} obj - 원본 객체
 * @param {Array<string>} fields - 암호화할 필드명 배열
 * @returns {Object} - 암호화된 객체
 */
function encryptFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  for (const field of fields) {
    if (result[field]) {
      if (field.includes('phone')) {
        result[field] = encryptPhone(result[field]);
      } else if (field.includes('email')) {
        result[field] = encryptEmail(result[field]);
      } else {
        result[field] = encrypt(result[field]);
      }
    }
  }

  return result;
}

/**
 * 객체의 특정 필드만 복호화
 * @param {Object} obj - 암호화된 객체
 * @param {Array<string>} fields - 복호화할 필드명 배열
 * @returns {Object} - 복호화된 객체
 */
function decryptFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  for (const field of fields) {
    if (result[field]) {
      if (field.includes('phone')) {
        result[field] = decryptPhone(result[field]);
      } else if (field.includes('email')) {
        result[field] = decryptEmail(result[field]);
      } else {
        result[field] = decrypt(result[field]);
      }
    }
  }

  return result;
}

/**
 * 예약 정보 암호화 (표준 필드)
 * @param {Object} booking - 예약 객체
 * @returns {Object} - 암호화된 예약 객체
 */
function encryptBooking(booking) {
  return encryptFields(booking, [
    'customer_name',
    'customer_phone',
    'customer_email',
    'customer_address'
  ]);
}

/**
 * 예약 정보 복호화 (표준 필드)
 * @param {Object} booking - 암호화된 예약 객체
 * @returns {Object} - 복호화된 예약 객체
 */
function decryptBooking(booking) {
  return decryptFields(booking, [
    'customer_name',
    'customer_phone',
    'customer_email',
    'customer_address'
  ]);
}

/**
 * 마스킹 처리 (표시용)
 * @param {string} text - 원본 텍스트
 * @param {number} visibleStart - 앞에서 보이는 글자 수
 * @param {number} visibleEnd - 뒤에서 보이는 글자 수
 * @returns {string} - 마스킹 처리된 텍스트
 */
function mask(text, visibleStart = 2, visibleEnd = 2) {
  if (!text || text.length <= visibleStart + visibleEnd) return text;

  const start = text.substring(0, visibleStart);
  const end = text.substring(text.length - visibleEnd);
  const middle = '*'.repeat(text.length - visibleStart - visibleEnd);

  return `${start}${middle}${end}`;
}

/**
 * 전화번호 마스킹 (예: 010-****-5678)
 * @param {string} phone - 전화번호
 * @returns {string} - 마스킹된 전화번호
 */
function maskPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9]/g, '');

  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-****-${clean.slice(7)}`;
  }
  return mask(phone, 3, 2);
}

/**
 * 이메일 마스킹 (예: te**@example.com)
 * @param {string} email - 이메일
 * @returns {string} - 마스킹된 이메일
 */
function maskEmail(email) {
  if (!email) return null;

  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const username = parts[0];
  const domain = parts[1];

  const maskedUsername = username.length > 2
    ? `${username[0]}${username[1]}${'*'.repeat(username.length - 2)}`
    : username;

  return `${maskedUsername}@${domain}`;
}

module.exports = {
  encrypt,
  decrypt,
  encryptPhone,
  decryptPhone,
  encryptEmail,
  decryptEmail,
  encryptFields,
  decryptFields,
  encryptBooking,
  decryptBooking,
  mask,
  maskPhone,
  maskEmail
};
