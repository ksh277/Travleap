/**
 * 관리자 객실 관리 API
 * DELETE /api/admin/rooms/[id] - 객실 삭제
 * PUT /api/admin/rooms/[id] - 객실 정보 수정
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Room ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // DELETE - 객실 삭제
    if (req.method === 'DELETE') {
      // 1. 진행 중인 예약 확인
      const activeBookings = await connection.execute(
        `SELECT COUNT(*) as count
         FROM bookings
         WHERE listing_id = ? AND status IN ('pending', 'confirmed')`,
        [id]
      );

      if (activeBookings[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: '진행 중인 예약이 있어 삭제할 수 없습니다.',
          activeBookings: activeBookings[0].count
        });
      }

      try {
        // 2-1. 과거 예약 삭제
        await connection.execute(
          'DELETE FROM bookings WHERE listing_id = ?',
          [id]
        );

        // 2-2. 리뷰 삭제
        await connection.execute(
          'DELETE FROM reviews WHERE listing_id = ?',
          [id]
        );

        // 2-3. 객실 삭제 (listings 테이블)
        const result = await connection.execute(
          'DELETE FROM listings WHERE id = ?',
          [id]
        );

        if (resultAffected === 0) {
          return res.status(404).json({
            success: false,
            error: '객실을 찾을 수 없습니다.'
          });
        }

        return res.status(200).json({
          success: true,
          message: '객실이 성공적으로 삭제되었습니다.'
        });

      } catch (deleteError) {
        console.error('Room deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          error: '객실 삭제 중 오류가 발생했습니다.',
          details: deleteError.message
        });
      }
    }

    // PUT/PATCH - 객실 정보 수정
    if (req.method === 'PUT' || req.method === 'PATCH') {
      console.log(`📝 [PUT] 객실 업데이트 요청 (ID: ${id}):`, req.body);

      const {
        title,
        listing_name,
        short_description,
        description,
        description_md,
        price_from,
        price_to,
        location,
        address,
        images,
        amenities,
        is_active,
        is_featured,
        max_capacity,
        min_capacity
      } = req.body;

      // 업데이트할 필드들을 동적으로 구성
      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (listing_name !== undefined) {
        updates.push('title = ?');
        values.push(listing_name);
      }
      if (short_description !== undefined) {
        updates.push('short_description = ?');
        values.push(short_description);
      }
      if (description !== undefined) {
        updates.push('description_md = ?');
        values.push(description);
      }
      if (description_md !== undefined) {
        updates.push('description_md = ?');
        values.push(description_md);
      }
      if (location !== undefined) {
        updates.push('location = ?');
        values.push(location);
      }
      if (address !== undefined) {
        updates.push('address = ?');
        values.push(address);
      }
      if (price_from !== undefined) {
        updates.push('price_from = ?');
        values.push(price_from);
      }
      if (price_to !== undefined) {
        updates.push('price_to = ?');
        values.push(price_to);
      }
      if (images !== undefined) {
        updates.push('images = ?');
        values.push(JSON.stringify(images));
      }
      if (amenities !== undefined) {
        updates.push('amenities = ?');
        values.push(JSON.stringify(amenities));
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }
      if (is_featured !== undefined) {
        updates.push('is_featured = ?');
        values.push(is_featured ? 1 : 0);
      }
      if (max_capacity !== undefined) {
        updates.push('max_capacity = ?');
        values.push(max_capacity);
      }
      if (min_capacity !== undefined) {
        updates.push('min_capacity = ?');
        values.push(min_capacity);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 항목이 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const updateQuery = `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`;
      console.log(`🔄 실행할 UPDATE 쿼리:`, { query: updateQuery, values });

      const result = await connection.execute(updateQuery, values);

      console.log(`✅ UPDATE 결과:`, {
        rowsAffected: resultAffected,
        insertId: result.insertId
      });

      if (resultAffected === 0) {
        console.warn(`⚠️ 경고: 업데이트된 행이 없습니다. 객실 ID ${id}가 존재하지 않을 수 있습니다.`);
      }

      return res.status(200).json({
        success: true,
        message: '객실 정보가 업데이트되었습니다.',
        rowsAffected: resultAffected
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Room API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
