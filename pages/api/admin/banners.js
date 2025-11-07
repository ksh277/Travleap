/**
 * 관리자 배너 관리 API
 * GET /api/admin/banners - 배너 목록 조회
 * POST /api/admin/banners - 새 배너 생성
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 배너 목록 조회 (순서대로 정렬)
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT * FROM banners ORDER BY display_order ASC, created_at DESC`
      );

      return res.status(200).json({
        success: true,
        banners: result.rows || []
      });
    }

    // POST - 새 배너 생성
    if (req.method === 'POST') {
      const {
        image_url,
        title,
        link_url,
        display_order,
        is_active,
        media_type,
        video_url
      } = req.body;

      // 필수 필드 검증 (미디어 타입에 따라)
      if (media_type === 'video') {
        if (!video_url || video_url.trim() === '') {
          return res.status(400).json({
            success: false,
            message: '동영상 URL은 필수입니다.'
          });
        }
      } else {
        if (!image_url || image_url.trim() === '') {
          return res.status(400).json({
            success: false,
            message: '배너 이미지 URL은 필수입니다.'
          });
        }
      }

      // display_order가 없으면 마지막 순서로 설정
      let finalOrder = display_order;
      if (finalOrder === undefined || finalOrder === null) {
        const countResult = await connection.execute(
          'SELECT COUNT(*) as count FROM banners'
        );
        finalOrder = countResult.rows?.[0]?.count || 0;
      }

      const result = await connection.execute(
        `INSERT INTO banners (
          image_url,
          title,
          link_url,
          display_order,
          is_active,
          media_type,
          video_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          image_url || null,
          title || null,
          link_url || null,
          finalOrder,
          is_active !== undefined ? is_active : true,
          media_type || 'image',
          video_url || null
        ]
      );

      return res.status(201).json({
        success: true,
        message: '배너가 성공적으로 생성되었습니다.',
        bannerId: result.insertId
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Banner API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
