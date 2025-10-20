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

      const items = (result.rows || []).map(item => {
        let images = [];
        let selectedOptions = {};

        try {
          if (item.images) images = JSON.parse(item.images);
          if (item.selected_options) selectedOptions = JSON.parse(item.selected_options);
        } catch (e) {}

        return {
          ...item,
          images: Array.isArray(images) ? images : [],
          selected_options: selectedOptions
        };
      });

      return res.status(200).json({
        success: true,
        data: items
      });
    }

    if (req.method === 'POST') {
      // 장바구니 추가
      const {
        listing_id,
        quantity = 1,
        selected_date,
        selected_options,
        num_adults = 1,
        num_children = 0,
        num_seniors = 0,
        price_snapshot
      } = req.body;

      if (!listing_id) {
        return res.status(400).json({
          success: false,
          error: 'listing_id is required'
        });
      }

      console.log('장바구니 추가:', {
        userId,
        listing_id,
        quantity,
        selected_date,
        num_adults,
        num_children,
        num_seniors
      });

      const result = await connection.execute(`
        INSERT INTO cart_items (
          user_id, listing_id, quantity, selected_date, selected_options,
          num_adults, num_children, num_seniors, price_snapshot, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        listing_id,
        quantity,
        selected_date || null,
        JSON.stringify(selected_options || {}),
        num_adults,
        num_children,
        num_seniors,
        price_snapshot || null
      ]);

      console.log('장바구니 추가 성공:', result.insertId);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId }
      });
    }

    if (req.method === 'PUT') {
      // 장바구니 수정
      const { itemId } = req.query;
      const {
        quantity,
        selected_date,
        selected_options,
        num_adults,
        num_children,
        num_seniors,
        price_snapshot
      } = req.body;

      await connection.execute(`
        UPDATE cart_items
        SET
          quantity = COALESCE(?, quantity),
          selected_date = COALESCE(?, selected_date),
          selected_options = COALESCE(?, selected_options),
          num_adults = COALESCE(?, num_adults),
          num_children = COALESCE(?, num_children),
          num_seniors = COALESCE(?, num_seniors),
          price_snapshot = COALESCE(?, price_snapshot),
          updated_at = NOW()
        WHERE id = ? AND user_id = ?
      `, [
        quantity,
        selected_date,
        selected_options ? JSON.stringify(selected_options) : null,
        num_adults,
        num_children,
        num_seniors,
        price_snapshot,
        itemId,
        userId
      ]);

      return res.status(200).json({
        success: true
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
    console.error('장바구니 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '장바구니 처리 중 오류가 발생했습니다'
    });
  }
};
