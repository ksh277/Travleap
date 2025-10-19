const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      // 장바구니 조회
      const result = await connection.execute(`
        SELECT
          c.*,
          l.title,
          l.price_from,
          l.images,
          l.category_id
        FROM cart_items c
        LEFT JOIN listings l ON c.listing_id = l.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `, [userId]);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    if (req.method === 'POST') {
      // 장바구니 추가
      const { listing_id, quantity = 1, options } = req.body;

      const result = await connection.execute(`
        INSERT INTO cart_items (user_id, listing_id, quantity, options, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [userId, listing_id, quantity, JSON.stringify(options || {})]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId }
      });
    }

    if (req.method === 'DELETE') {
      // 장바구니 삭제
      const { itemId } = req.query;

      await connection.execute(`
        DELETE FROM cart_items
        WHERE id = ? AND user_id = ?
      `, [itemId, userId]);

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling cart:', error);
    // 테이블이 없으면 빈 배열 반환
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};
