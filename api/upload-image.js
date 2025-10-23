/**
 * 이미지 업로드 API
 * Vercel Blob Storage 사용
 */

const { put } = require('@vercel/blob');
const { IncomingForm } = require('formidable');
const fs = require('fs');

module.exports.config = {
  api: {
    bodyParser: false, // formidable 사용을 위해 비활성화
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // formidable로 파일 파싱
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '파일이 없습니다'
      });
    }

    // 카테고리 확인
    const category = fields.category?.[0] || fields.category || 'rentcar';

    // 파일 읽기
    const fileBuffer = fs.readFileSync(file.filepath);

    // 파일명 생성
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.originalFilename?.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${category}/${timestamp}-${randomString}.${extension}`;

    // Vercel Blob에 업로드
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    // 임시 파일 삭제
    fs.unlinkSync(file.filepath);

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
}
