/**
 * 이미지 업로드 API (Vercel Serverless)
 * Vercel Blob Storage 사용
 * - FormData (파트너 관리용, busboy)
 * - JSON base64 (차량 관리용, ImageUploader)
 *
 * 보안:
 * - JWT 인증 필수
 * - 파일 타입 검증 (MIME + Magic bytes)
 * - 파일 크기 제한 (10MB)
 * - Rate Limiting (1분에 20회)
 */

const { put } = require('@vercel/blob');
const Busboy = require('busboy');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');
const {
  validateImageFile,
  validateBase64Image,
  sanitizeFilename
} = require('../../utils/file-upload-security.cjs');

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // 인증 확인 (withAuth 미들웨어에서 설정)
  console.log('🔐 [Upload] Auth check - req.user:', req.user ? 'EXISTS' : 'NULL');
  if (!req.user) {
    console.error('❌ [Upload] No user in request - auth failed');
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    console.log('📋 [Upload] Content-Type:', contentType);

    // JSON (base64) 방식 - ImageUploader용 (차량 이미지)
    if (contentType.includes('application/json')) {
      const { image, filename, category } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          message: '이미지 데이터가 없습니다'
        });
      }

      // 파일명 새니타이징
      const safeFilename = sanitizeFilename(filename || 'image.jpg');

      // Base64 이미지 검증
      const validation = validateBase64Image(image, safeFilename);
      if (!validation.valid) {
        console.warn(`⚠️ [Upload] Invalid base64 image: ${validation.reason}`);
        return res.status(400).json({
          success: false,
          message: validation.reason
        });
      }

      // base64 디코딩
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // 파일명 생성
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const ext = safeFilename.split('.').pop() || 'jpg';
      const categoryPath = category || 'rentcar';
      const blobFilename = `${categoryPath}/${timestamp}-${randomString}.${ext}`;

      console.log('📤 [Upload] Uploading to Vercel Blob...');
      console.log('  Filename:', blobFilename);
      console.log('  Size:', buffer.length, 'bytes');
      console.log('  BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'EXISTS' : 'MISSING');

      // Vercel Blob에 업로드
      let blob;
      try {
        blob = await put(blobFilename, buffer, {
          access: 'public',
          addRandomSuffix: false,
        });

        console.log('✅ Blob 업로드 성공 (base64):', blob.url, `(user: ${req.user.id})`);
      } catch (blobError) {
        console.error('❌ [Upload] Vercel Blob upload failed:', blobError);
        throw new Error('Vercel Blob 업로드 실패: ' + blobError.message);
      }

      return res.status(200).json({
        success: true,
        url: blob.url,
      });
    }

    // FormData (multipart) 방식 - 파트너 관리용
    if (contentType.includes('multipart/form-data')) {
      const busboy = Busboy({ headers: req.headers });

      let fileBuffer;
      let filename;
      let mimeType;
      let category = 'partners'; // 기본값

      // 파일 데이터 수집
      busboy.on('file', (_fieldname, file, info) => {
        const { filename: originalFilename, mimeType: fileMimeType } = info;
        filename = originalFilename;
        mimeType = fileMimeType;

        const chunks = [];
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      // 필드 데이터 수집 (category 등)
      busboy.on('field', (fieldname, value) => {
        if (fieldname === 'category') {
          category = value;
        }
      });

      // 파싱 완료 대기
      await new Promise((resolve, reject) => {
        busboy.on('finish', resolve);
        busboy.on('error', reject);
        req.pipe(busboy);
      });

      // 파일이 없으면 에러
      if (!fileBuffer) {
        return res.status(400).json({
          success: false,
          message: '파일이 없습니다'
        });
      }

      // 파일명 새니타이징
      const safeFilename = sanitizeFilename(filename || 'image.jpg');

      // 이미지 파일 검증
      const validation = validateImageFile({
        filename: safeFilename,
        mimeType,
        buffer: fileBuffer
      });

      if (!validation.valid) {
        console.warn(`⚠️ [Upload] Invalid multipart image: ${validation.reason}`);
        return res.status(400).json({
          success: false,
          message: validation.reason
        });
      }

      // 파일명 생성
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const extension = safeFilename.split('.').pop()?.toLowerCase() || 'jpg';
      const blobFilename = `${category}/${timestamp}-${randomString}.${extension}`;

      // Vercel Blob에 업로드
      const blob = await put(blobFilename, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: mimeType,
      });

      console.log('✅ Blob 업로드 성공 (FormData):', blob.url, `(user: ${req.user.id})`);

      return res.status(200).json({
        success: true,
        url: blob.url,
      });
    }

    // 지원하지 않는 Content-Type
    return res.status(400).json({
      success: false,
      message: 'Unsupported content type. Use application/json or multipart/form-data'
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);

    // 프로덕션에서는 상세 에러 숨기기
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return res.status(500).json({
      success: false,
      message: '이미지 업로드에 실패했습니다',
      ...(isDevelopment && { error: error.message })
    });
  }
}

// 보안 미들웨어 적용: CORS → Rate Limiting → Auth (올바른 순서)
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true })
  )
);
