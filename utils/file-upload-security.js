/**
 * 파일 업로드 보안 유틸리티
 *
 * - 파일 타입 검증 (MIME type, Magic bytes)
 * - 파일 크기 제한
 * - 악성 파일 차단 (실행 파일, 스크립트)
 * - 이미지 파일 검증
 * - CSV Injection 방지
 */

/**
 * 허용되는 파일 MIME 타입
 */
const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  csv: [
    'text/csv',
    'application/csv',
    'text/plain'
  ]
};

/**
 * 허용되는 파일 확장자
 */
const ALLOWED_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
  csv: ['csv', 'txt']
};

/**
 * 파일 크기 제한 (바이트)
 */
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,      // 10MB
  document: 20 * 1024 * 1024,    // 20MB
  csv: 5 * 1024 * 1024,          // 5MB
  default: 10 * 1024 * 1024      // 10MB
};

/**
 * 위험한 파일 확장자 (실행 파일, 스크립트)
 */
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
  'msi', 'app', 'deb', 'rpm', 'dmg', 'pkg', 'sh', 'bash',
  'php', 'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py', 'rb'
];

/**
 * Magic bytes (파일 시그니처) - 실제 파일 타입 검증
 */
const MAGIC_BYTES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0],  // JPEG JFIF
    [0xFF, 0xD8, 0xFF, 0xE1],  // JPEG Exif
    [0xFF, 0xD8, 0xFF, 0xE2],  // JPEG
    [0xFF, 0xD8, 0xFF, 0xE3]   // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],  // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]   // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46] // RIFF (WebP는 8-11 바이트에 WEBP 존재)
  ],
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46]  // %PDF
  ]
};

/**
 * 파일 확장자 추출
 */
function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  return filename.toLowerCase().split('.').pop() || '';
}

/**
 * 파일 확장자 검증
 */
function isValidExtension(filename, category = 'image') {
  const extension = getFileExtension(filename);

  // 위험한 확장자 차단
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      reason: `위험한 파일 형식입니다: .${extension}`
    };
  }

  // 허용된 확장자 확인
  const allowedExts = ALLOWED_EXTENSIONS[category] || ALLOWED_EXTENSIONS.image;
  if (!allowedExts.includes(extension)) {
    return {
      valid: false,
      reason: `허용되지 않는 파일 형식입니다. 허용: ${allowedExts.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * MIME 타입 검증
 */
function isValidMimeType(mimeType, category = 'image') {
  const allowedTypes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.image;

  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      reason: `허용되지 않는 파일 타입입니다: ${mimeType}`
    };
  }

  return { valid: true };
}

/**
 * 파일 크기 검증
 */
function isValidFileSize(fileSize, category = 'image') {
  const maxSize = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default;

  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      reason: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

/**
 * Magic bytes 검증 (실제 파일 내용 기반)
 */
function verifyMagicBytes(buffer, expectedMimeType) {
  const signatures = MAGIC_BYTES[expectedMimeType];
  if (!signatures) {
    // Magic bytes가 정의되지 않은 타입은 MIME만으로 검증
    return { valid: true };
  }

  // Buffer의 처음 몇 바이트 확인
  const fileHeader = Array.from(buffer.slice(0, 12));

  for (const signature of signatures) {
    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (fileHeader[i] !== signature[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    reason: '파일 내용이 확장자와 일치하지 않습니다. (위장된 파일)'
  };
}

/**
 * 이미지 파일 전체 검증
 */
function validateImageFile({ filename, mimeType, buffer }) {
  // 1. 파일명 검증
  if (!filename) {
    return { valid: false, reason: '파일명이 없습니다.' };
  }

  // 2. 확장자 검증
  const extCheck = isValidExtension(filename, 'image');
  if (!extCheck.valid) {
    return extCheck;
  }

  // 3. MIME 타입 검증
  if (mimeType) {
    const mimeCheck = isValidMimeType(mimeType, 'image');
    if (!mimeCheck.valid) {
      return mimeCheck;
    }
  }

  // 4. 파일 크기 검증
  if (buffer) {
    const sizeCheck = isValidFileSize(buffer.length, 'image');
    if (!sizeCheck.valid) {
      return sizeCheck;
    }

    // 5. Magic bytes 검증 (SVG 제외)
    if (mimeType && mimeType !== 'image/svg+xml') {
      const magicCheck = verifyMagicBytes(buffer, mimeType);
      if (!magicCheck.valid) {
        return magicCheck;
      }
    }
  }

  return { valid: true };
}

/**
 * CSV 파일 검증 및 Injection 방지
 */
function validateCSVFile({ filename, buffer }) {
  // 1. 확장자 검증
  const extCheck = isValidExtension(filename, 'csv');
  if (!extCheck.valid) {
    return extCheck;
  }

  // 2. 파일 크기 검증
  if (buffer) {
    const sizeCheck = isValidFileSize(buffer.length, 'csv');
    if (!sizeCheck.valid) {
      return sizeCheck;
    }
  }

  return { valid: true };
}

/**
 * CSV Injection 방지 - 셀 값 새니타이징
 */
function sanitizeCSVCell(value) {
  if (typeof value !== 'string') {
    return value;
  }

  // CSV injection 공격 문자 (=, +, -, @)
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];

  // 첫 글자가 위험한 문자면 ' (작은따옴표) 추가
  if (dangerousChars.some(char => value.startsWith(char))) {
    return `'${value}`;
  }

  return value;
}

/**
 * CSV 내용 전체 새니타이징
 */
function sanitizeCSVContent(csvContent) {
  if (typeof csvContent !== 'string') {
    return csvContent;
  }

  const lines = csvContent.split('\n');
  const sanitizedLines = lines.map(line => {
    const cells = line.split(',');
    const sanitizedCells = cells.map(cell => {
      const trimmed = cell.trim().replace(/^"/, '').replace(/"$/, '');
      return sanitizeCSVCell(trimmed);
    });
    return sanitizedCells.join(',');
  });

  return sanitizedLines.join('\n');
}

/**
 * Base64 이미지 검증
 */
function validateBase64Image(base64String, filename = 'image.jpg') {
  try {
    // Base64 prefix 제거
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

    // Base64 디코딩
    const buffer = Buffer.from(base64Data, 'base64');

    // MIME 타입 추출
    const mimeMatch = base64String.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // 이미지 검증
    return validateImageFile({
      filename,
      mimeType,
      buffer
    });
  } catch (error) {
    return {
      valid: false,
      reason: 'Base64 디코딩 실패: 올바른 이미지 형식이 아닙니다.'
    };
  }
}

/**
 * 파일 업로드 미들웨어
 */
function withFileUploadValidation(handler, options = {}) {
  const {
    category = 'image',
    required = true,
    maxSize = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default
  } = options;

  return async function (req, res) {
    try {
      // OPTIONS 요청은 통과
      if (req.method === 'OPTIONS') {
        return handler(req, res);
      }

      // 파일 검증 로직은 handler 내부에서 validateImageFile, validateCSVFile 호출
      // 이 미들웨어는 설정만 req에 전달
      req.fileUploadConfig = {
        category,
        required,
        maxSize
      };

      return handler(req, res);
    } catch (error) {
      console.error('File upload validation error:', error);
      return res.status(500).json({
        success: false,
        error: '파일 검증 중 오류가 발생했습니다.'
      });
    }
  };
}

/**
 * 파일명 새니타이징 (경로 조작 공격 방지)
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }

  return filename
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_') // 특수문자 제거
    .replace(/\.{2,}/g, '_')                // .. (경로 조작) 방지
    .replace(/^\./, '_')                    // 숨김 파일 방지
    .substring(0, 255);                     // 길이 제한
}

module.exports = {
  // 검증 함수
  validateImageFile,
  validateCSVFile,
  validateBase64Image,
  isValidExtension,
  isValidMimeType,
  isValidFileSize,
  verifyMagicBytes,

  // 새니타이징
  sanitizeCSVCell,
  sanitizeCSVContent,
  sanitizeFilename,

  // 미들웨어
  withFileUploadValidation,

  // 상수
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  FILE_SIZE_LIMITS,
  DANGEROUS_EXTENSIONS
};
