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
    const connection = connect({
      host: process.env.DATABASE_HOST,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD
    });

    if (req.method === 'GET') {
      // 장바구니 조회 (검증 포함)
      const result = await connection.execute(`
        SELECT
          c.*,
          l.id AS listing_exists,
          l.title,
          l.price_from,
          l.images,
          l.category_id,
          l.is_active,
          l.stock_quantity
        FROM cart_items c
        LEFT JOIN listings l ON c.listing_id = l.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `, [userId]);

      const invalidItemIds = [];
      const items = (result.rows || []).map(item => {
        let images = [];
        let selectedOptions = {};
        let validationStatus = 'valid';
        let validationMessage = '';

        try {
          if (item.images) images = JSON.parse(item.images);
          if (item.selected_options) selectedOptions = JSON.parse(item.selected_options);
        } catch (e) {}

        // 🔍 상품 존재 여부 확인
        if (!item.listing_exists) {
          validationStatus = 'invalid';
          validationMessage = '상품이 삭제되었습니다';
          invalidItemIds.push(item.id);
        }
        // 🔍 상품 활성화 여부 확인
        else if (!item.is_active) {
          validationStatus = 'invalid';
          validationMessage = '판매가 중단된 상품입니다';
          invalidItemIds.push(item.id);
        }
        // 🔍 재고 확인 (팝업 카테고리인 경우)
        else if (item.stock_quantity !== null && item.stock_quantity <= 0) {
          validationStatus = 'invalid';
          validationMessage = '품절된 상품입니다';
          invalidItemIds.push(item.id);
        }

        return {
          ...item,
          images: Array.isArray(images) ? images : [],
          selected_options: selectedOptions,
          validationStatus,
          validationMessage
        };
      });

      // 🗑️ 자동으로 유효하지 않은 항목 삭제 (옵션)
      if (invalidItemIds.length > 0) {
        console.log(`🗑️ [장바구니] 유효하지 않은 항목 ${invalidItemIds.length}개 발견:`, invalidItemIds);

        // 실제 삭제는 클라이언트에서 처리하도록 하고, 여기서는 로그만 남김
        // 필요시 자동 삭제를 원한다면 아래 코드 주석 해제:
        // await connection.execute(`
        //   DELETE FROM cart_items WHERE id IN (${invalidItemIds.join(',')})
        // `);
      }

      return res.status(200).json({
        success: true,
        data: items,
        invalidCount: invalidItemIds.length
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

      // 🔍 상품 존재 여부 및 활성화 상태 확인
      const listingCheck = await connection.execute(`
        SELECT id, is_active, stock_quantity
        FROM listings
        WHERE id = ?
        LIMIT 1
      `, [listing_id]);

      if (!listingCheck.rows || listingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'LISTING_NOT_FOUND',
          message: '상품을 찾을 수 없습니다.'
        });
      }

      const listing = listingCheck.rows[0];

      if (!listing.is_active) {
        return res.status(400).json({
          success: false,
          error: 'LISTING_INACTIVE',
          message: '판매가 중단된 상품입니다.'
        });
      }

      if (listing.stock_quantity !== null && listing.stock_quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'OUT_OF_STOCK',
          message: '품절된 상품입니다.'
        });
      }

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
