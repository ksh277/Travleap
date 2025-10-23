/**
 * 이미지 업로드 API (Vercel 호환)
 * Vercel Blob Storage 사용 + busboy로 파일 파싱
 */

const { put } = require('@vercel/blob');
const Busboy = require('busboy');

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
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

    // 파일명 생성
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = filename?.split('.').pop()?.toLowerCase() || 'jpg';
    const blobFilename = `${category}/${timestamp}-${randomString}.${extension}`;

    // Vercel Blob에 업로드
    const blob = await put(blobFilename, fileBuffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: mimeType,
    });

    console.log('✅ Blob 업로드 성공:', blob.url);

    return res.status(200).json({
      success: true,
      url: blob.url,
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    return res.status(500).json({
      success: false,
      message: '이미지 업로드에 실패했습니다',
      error: error.message
    });
  }
};
