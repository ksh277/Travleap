/**
 * 관리자 상품 관리 API
 * DELETE /api/admin/listings/[id] - 상품 삭제
 * PUT /api/admin/listings/[id] - 상품 수정
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Listing ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // DELETE - 상품 삭제
    if (req.method === 'DELETE') {
      console.log(`🗑️  [Listing Delete] Starting deletion for listing_id = ${id}`);

      // 1. 리뷰 삭제
      try {
        await connection.execute('DELETE FROM reviews WHERE listing_id = ?', [id]);
        console.log(`  ✅ Reviews deleted for listing ${id}`);
      } catch (error) {
        console.warn(`  ⚠️  Reviews deletion warning:`, error.message);
      }

      // 2. 즐겨찾기 삭제
      try {
        await connection.execute('DELETE FROM favorites WHERE listing_id = ?', [id]);
        console.log(`  ✅ Favorites deleted for listing ${id}`);
      } catch (error) {
        console.warn(`  ⚠️  Favorites deletion warning:`, error.message);
      }

      // 3. 장바구니 아이템 삭제
      try {
        await connection.execute('DELETE FROM cart_items WHERE listing_id = ?', [id]);
        console.log(`  ✅ Cart items deleted for listing ${id}`);
      } catch (error) {
        console.warn(`  ⚠️  Cart items deletion warning:`, error.message);
      }

      // 4. 상품 자체 삭제
      const result = await connection.execute('DELETE FROM listings WHERE id = ?', [id]);

      console.log(`  ✅ Listing ${id} deleted successfully. Result:`, result);

      return res.status(200).json({
        success: true,
        message: '상품이 성공적으로 삭제되었습니다.'
      });
    }

    // PUT - 상품 수정
    if (req.method === 'PUT') {
      const {
        title,
        description_md,
        short_description,
        price_from,
        price_to,
        currency,
        images,
        lat,
        lng,
        location,
        duration,
        max_capacity,
        min_capacity,
        category_id,
        partner_id,
        is_published,
        featured_score,
        partner_boost,
        sponsored_until,
        start_date,
        end_date
      } = req.body;

      // JSON 필드 처리
      const imagesJson = images ? (typeof images === 'string' ? images : JSON.stringify(images)) : null;

      const result = await connection.execute(
        `UPDATE listings SET
          title = COALESCE(?, title),
          description_md = COALESCE(?, description_md),
          short_description = COALESCE(?, short_description),
          price_from = COALESCE(?, price_from),
          price_to = COALESCE(?, price_to),
          currency = COALESCE(?, currency),
          images = COALESCE(?, images),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          location = COALESCE(?, location),
          duration = COALESCE(?, duration),
          max_capacity = COALESCE(?, max_capacity),
          min_capacity = COALESCE(?, min_capacity),
          category_id = COALESCE(?, category_id),
          partner_id = COALESCE(?, partner_id),
          is_published = COALESCE(?, is_published),
          featured_score = COALESCE(?, featured_score),
          partner_boost = COALESCE(?, partner_boost),
          sponsored_until = COALESCE(?, sponsored_until),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          updated_at = NOW()
        WHERE id = ?`,
        [
          title,
          description_md,
          short_description,
          price_from,
          price_to,
          currency,
          imagesJson,
          lat,
          lng,
          location,
          duration,
          max_capacity,
          min_capacity,
          category_id,
          partner_id,
          is_published,
          featured_score,
          partner_boost,
          sponsored_until,
          start_date,
          end_date,
          id
        ]
      );

      console.log('Update result:', result);

      return res.status(200).json({
        success: true,
        message: '상품이 성공적으로 수정되었습니다.',
        data: { id }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Listing API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
