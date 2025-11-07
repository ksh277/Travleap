/**
 * 입력값 검증 유틸리티
 *
 * XSS, SQL Injection, 악의적인 입력 방지
 */

/**
 * XSS 공격 방지 - HTML 태그 제거
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQL Injection 방지 - 위험한 문자 검증
 */
function containsSqlInjection(input) {
  if (typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(;\s*DROP\s+TABLE)/i,
    /(--|\#|\/\*|\*\/)/,
    /('\s*OR\s*'1'\s*=\s*'1)/i,
    /('\s*OR\s*1\s*=\s*1)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * 이메일 형식 검증
 */
function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * 전화번호 형식 검증 (한국)
 */
function isValidPhoneNumber(phone) {
  if (typeof phone !== 'string') {
    return false;
  }

  // 한국 전화번호: 010-1234-5678, 01012345678, +82-10-1234-5678
  const phoneRegex = /^(\+82-?|0)?\d{2,3}-?\d{3,4}-?\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * URL 형식 검증
 */
function isValidUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 숫자 범위 검증
 */
function isNumberInRange(value, min, max) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * 문자열 길이 검증
 */
function isValidLength(str, minLength, maxLength) {
  if (typeof str !== 'string') {
    return false;
  }

  const length = str.trim().length;
  return length >= minLength && length <= maxLength;
}

/**
 * 파일 확장자 검증
 */
function isValidFileExtension(filename, allowedExtensions) {
  if (typeof filename !== 'string') {
    return false;
  }

  const ext = filename.toLowerCase().split('.').pop();
  return allowedExtensions.includes(ext);
}

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
function isValidDate(dateString) {
  if (typeof dateString !== 'string') {
    return false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * UUID 형식 검증
 */
function isValidUuid(uuid) {
  if (typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 객체 입력 검증 (스키마 기반)
 */
function validateSchema(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required 체크
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field}은(는) 필수 항목입니다.` });
      continue;
    }

    // 값이 없고 required가 아니면 스킵
    if (!value && !rules.required) {
      continue;
    }

    // Type 체크
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push({ field, message: `${field}은(는) ${rules.type} 타입이어야 합니다.` });
        continue;
      }
    }

    // 문자열 검증
    if (rules.type === 'string') {
      // 길이 검증
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({ field, message: `${field}은(는) 최소 ${rules.minLength}자 이상이어야 합니다.` });
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({ field, message: `${field}은(는) 최대 ${rules.maxLength}자 이하여야 합니다.` });
      }

      // SQL Injection 체크
      if (containsSqlInjection(value)) {
        errors.push({ field, message: `${field}에 허용되지 않는 문자가 포함되어 있습니다.` });
      }

      // 패턴 검증
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({ field, message: rules.patternMessage || `${field}의 형식이 올바르지 않습니다.` });
      }
    }

    // 숫자 검증
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({ field, message: `${field}은(는) ${rules.min} 이상이어야 합니다.` });
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({ field, message: `${field}은(는) ${rules.max} 이하여야 합니다.` });
      }
    }

    // 배열 검증
    if (rules.type === 'array') {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push({ field, message: `${field}은(는) 최소 ${rules.minItems}개 이상이어야 합니다.` });
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({ field, message: `${field}은(는) 최대 ${rules.maxItems}개 이하여야 합니다.` });
      }
    }

    // 커스텀 검증
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value, data);
      if (customError) {
        errors.push({ field, message: customError });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 일반적인 검증 스키마
 */
const commonSchemas = {
  // 사용자 등록
  userRegistration: {
    email: {
      required: true,
      type: 'string',
      maxLength: 255,
      validate: (value) => isValidEmail(value) ? null : '올바른 이메일 형식이 아닙니다.'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 100
    },
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50
    },
    phone: {
      required: false,
      type: 'string',
      validate: (value) => {
        if (!value) return null;
        return isValidPhoneNumber(value) ? null : '올바른 전화번호 형식이 아닙니다.';
      }
    }
  },

  // 결제 정보
  payment: {
    amount: {
      required: true,
      type: 'number',
      min: 100,
      max: 100000000
    },
    paymentKey: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 200
    },
    orderId: {
      required: true,
      type: 'string',
      minLength: 6,
      maxLength: 64
    }
  }
};

module.exports = {
  sanitizeHtml,
  containsSqlInjection,
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  isNumberInRange,
  isValidLength,
  isValidFileExtension,
  isValidDate,
  isValidUuid,
  validateSchema,
  commonSchemas
};
