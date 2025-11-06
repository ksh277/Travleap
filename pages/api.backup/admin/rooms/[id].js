/**
 * 객실 개별 관리 API (listings 테이블 사용)
 * PUT /api/admin/rooms/[id] - 객실 수정
 * DELETE /api/admin/rooms/[id] - 객실 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // PUT - 객실 수정
    if (req.method === 'PUT') {
      console.log(`📥 [PUT] 객실 수정 요청 (id: ${id})`);

      const {
        listing_name,
        description,
        location,
        address,
        price_from,
        images
      } = req.body;

      // 객실 존재 확인
      const roomCheck = await connection.execute(
        'SELECT id FROM listings WHERE id = ? AND category = "stay"',
        [id]
      );

      if (!roomCheck.rows || roomCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '객실을 찾을 수 없습니다.'
        });
      }

      // 업데이트할 필드 구성
      const updates = [];
      const values = [];

      if (listing_name !== undefined) { updates.push('title = ?'); values.push(listing_name); }
      if (description !== undefined) { updates.push('description_md = ?'); values.push(description); }
      if (location !== undefined) { updates.push('location = ?'); values.push(location); }
      if (address !== undefined) { updates.push('address = ?'); values.push(address); }
      if (price_from !== undefined) {
        updates.push('price_from = ?');
        values.push(parseFloat(price_from));
        updates.push('base_price_per_night = ?');
        values.push(parseFloat(price_from));
      }
      if (images !== undefined) {
        const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images;
        updates.push('images = ?');
        values.push(imagesJson);
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const query = `UPDATE listings SET ${updates.join(', ')} WHERE id = ? AND category = 'stay'`;

      await connection.execute(query, values);

      console.log('✅ 객실 수정 완료:', { id, listing_name });

      return res.status(200).json({
        success: true,
        message: '객실이 수정되었습니다.'
      });
    }

    // DELETE - 객실 삭제
    if (req.method === 'DELETE') {
      console.log(`📥 [DELETE] 객실 삭제 요청 (id: ${id})`);

      // 객실 존재 확인
      const roomCheck = await connection.execute(
        'SELECT id, title FROM listings WHERE id = ? AND category = "stay"',
        [id]
      );

      if (!roomCheck.rows || roomCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '객실을 찾을 수 없습니다.'
        });
      }

      const roomName = roomCheck.rows[0].title;

      // 객실 삭제
      await connection.execute(
        'DELETE FROM listings WHERE id = ? AND category = "stay"',
        [id]
      );

      console.log('✅ 객실 삭제 완료:', { id, roomName });

      return res.status(200).json({
        success: true,
        message: '객실이 삭제되었습니다.'
      });
    }

    // GET - 객실 상세 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id,
          partner_id,
          title as room_name,
          description_md as description,
          location,
          address,
          price_from,
          base_price_per_night,
          images,
          amenities,
          is_active as is_available,
          created_at,
          updated_at
        FROM listings
        WHERE id = ? AND category = 'stay'`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '객실을 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Room [id] API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
