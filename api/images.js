/**
 * 이미지 관리 API
 * GET /api/images - 모든 이미지 목록 조회
 * POST /api/images - 이미지 업로드/등록
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // 이미지 목록 조회 (home_banners 테이블에서)
      try {
        const result = await connection.execute(`
          SELECT
            id,
            image_url,
            title,
            subtitle,
            link_url,
            is_active,
            display_order,
            created_at
          FROM home_banners
          WHERE is_active = 1
          ORDER BY display_order ASC, created_at DESC
        `);

        return res.status(200).json({
          success: true,
          data: result || []
        });
      } catch (dbError) {
        // 테이블이 없거나 쿼리 에러 시 빈 배열 반환
        console.warn('⚠️ home_banners 테이블 조회 실패:', dbError.message);
        return res.status(200).json({
          success: true,
          data: [],
          message: 'No images available'
        });
      }
    }

    if (req.method === 'POST') {
      // 이미지 등록
      const { image_url, title, subtitle, link_url, display_order } = req.body;

      if (!image_url) {
        return res.status(400).json({
          success: false,
          error: 'image_url is required'
        });
      }

      const result = await connection.execute(
        `INSERT INTO home_banners (
          image_url, title, subtitle, link_url, is_active, display_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())`,
        [
          image_url,
          title || '',
          subtitle || '',
          link_url || '',
          display_order || 0
        ]
      );

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '이미지가 등록되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ Images API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
