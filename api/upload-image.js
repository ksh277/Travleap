/**
 * 이미지 업로드 API
 * Vercel Blob Storage 사용
 */

const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Body에서 base64 이미지 받기
    const { image, filename, category } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: '이미지 데이터가 없습니다'
      });
    }

    // base64 디코딩
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 파일명 생성
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = filename ? filename.split('.').pop() : 'jpg';
    const categoryPath = category || 'rentcar';
    const blobFilename = `${categoryPath}/${timestamp}-${randomString}.${ext}`;

    // Vercel Blob에 업로드
    const blob = await put(blobFilename, buffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({
      success: false,
      message: '이미지 업로드에 실패했습니다',
      error: error.message
    });
  }
};
