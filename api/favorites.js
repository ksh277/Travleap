const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    if (req.method === 'GET') {
      // 즐겨찾기 조회
      const result = await connection.execute(`
        SELECT
          f.*,
          l.title,
          l.price_from,
          l.images,
          l.category_id,
          l.location
        FROM favorites f
        LEFT JOIN listings l ON f.listing_id = l.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
      `, [userId]);

      const favorites = (result.rows || []).map(fav => {
        let images = [];
        try {
          if (fav.images) images = JSON.parse(fav.images);
        } catch (e) {}

        return {
          ...fav,
          images: Array.isArray(images) ? images : []
        };
      });

      return res.status(200).json({
        success: true,
        data: favorites
      });
    }

    if (req.method === 'POST') {
      // 즐겨찾기 추가
      const { listing_id } = req.body;

      if (!listing_id) {
        return res.status(400).json({
          success: false,
          error: 'listing_id is required'
        });
      }

      // 중복 체크
      const checkResult = await connection.execute(`
        SELECT id FROM favorites
        WHERE user_id = ? AND listing_id = ?
        LIMIT 1
      `, [userId, listing_id]);

      if (checkResult.rows && checkResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'ALREADY_EXISTS',
          message: '이미 즐겨찾기에 추가된 상품입니다.'
        });
      }

      const result = await connection.execute(`
        INSERT INTO favorites (user_id, listing_id, created_at)
        VALUES (?, ?, NOW())
      `, [userId, listing_id]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId }
      });
    }

    if (req.method === 'DELETE') {
      // 즐겨찾기 삭제
      const { listing_id } = req.query;

      if (!listing_id) {
        return res.status(400).json({
          success: false,
          error: 'listing_id is required'
        });
      }

      await connection.execute(`
        DELETE FROM favorites
        WHERE user_id = ? AND listing_id = ?
      `, [userId, listing_id]);

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('즐겨찾기 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '즐겨찾기 처리 중 오류가 발생했습니다'
    });
  }
};
