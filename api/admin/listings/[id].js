/**
 * 관리자 개별 상품 관리 API
 * DELETE /api/admin/listings/[id] - 상품 삭제
 * PUT /api/admin/listings/[id] - 상품 정보 수정
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
    return res.status(400).json({ success: false, error: 'Listing ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // DELETE - 상품 삭제
    if (req.method === 'DELETE') {
      console.log(`🗑️ [DELETE] 상품 삭제 요청 (ID: ${id})`);

      // 1. 진행 중인 예약 확인 (관리자는 강제 삭제 가능)
      const forceDelete = req.query.force === 'true';

      if (!forceDelete) {
        const activeBookings = await connection.execute(
          `SELECT COUNT(*) as count
           FROM bookings
           WHERE listing_id = ? AND status IN ('pending', 'confirmed', 'paid')`,
          [id]
        );

        if (activeBookings.rows[0].count > 0) {
          console.log(`⚠️ 진행 중인 예약 ${activeBookings.rows[0].count}건 발견`);
          return res.status(400).json({
            success: false,
            error: '진행 중인 예약이 있어 삭제할 수 없습니다.',
            activeBookings: activeBookings.rows[0].count,
            hint: '강제 삭제하려면 force=true 파라미터를 추가하세요.'
          });
        }
      } else {
        console.log('🔧 [강제 삭제 모드] 예약 확인 건너뜀');
      }

      try {
        // 2-1. 장바구니 항목 삭제
        await connection.execute(
          'DELETE FROM cart_items WHERE listing_id = ?',
          [id]
        );

        // 2-2. 과거 예약 삭제
        await connection.execute(
          'DELETE FROM bookings WHERE listing_id = ?',
          [id]
        );

        // 2-3. 리뷰 삭제
        await connection.execute(
          'DELETE FROM reviews WHERE listing_id = ?',
          [id]
        );

        // 2-4. 즐겨찾기 삭제
        await connection.execute(
          'DELETE FROM user_favorites WHERE listing_id = ?',
          [id]
        );

        // 2-5. 상품 삭제 (listings 테이블)
        const result = await connection.execute(
          'DELETE FROM listings WHERE id = ?',
          [id]
        );

        if (result.rowsAffected === 0) {
          return res.status(404).json({
            success: false,
            error: '상품을 찾을 수 없습니다.'
          });
        }

        console.log(`✅ 상품 삭제 완료 (ID: ${id})`);

        return res.status(200).json({
          success: true,
          message: '상품이 성공적으로 삭제되었습니다.'
        });

      } catch (deleteError) {
        console.error('❌ Listing deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          error: '상품 삭제 중 오류가 발생했습니다.',
          details: deleteError.message
        });
      }
    }

    // PUT/PATCH - 상품 정보 수정
    if (req.method === 'PUT' || req.method === 'PATCH') {
      console.log(`📝 [PUT] 상품 업데이트 요청 (ID: ${id}):`, req.body);

      const listingData = req.body;

      // 업데이트할 필드들을 동적으로 구성
      const updates = [];
      const values = [];

      if (listingData.title !== undefined) {
        updates.push('title = ?');
        values.push(listingData.title);
      }
      if (listingData.description !== undefined) {
        updates.push('short_description = ?');
        values.push(listingData.description);
      }
      if (listingData.longDescription !== undefined) {
        updates.push('description_md = ?');
        values.push(listingData.longDescription);
      }
      if (listingData.price !== undefined) {
        updates.push('price_from = ?');
        values.push(listingData.price);
      }
      if (listingData.childPrice !== undefined) {
        updates.push('child_price = ?');
        values.push(listingData.childPrice);
      }
      if (listingData.infantPrice !== undefined) {
        updates.push('infant_price = ?');
        values.push(listingData.infantPrice);
      }
      if (listingData.location !== undefined) {
        updates.push('location = ?');
        values.push(listingData.location);
      }
      if (listingData.detailedAddress !== undefined) {
        updates.push('address = ?');
        values.push(listingData.detailedAddress);
      }
      if (listingData.meetingPoint !== undefined) {
        updates.push('meeting_point = ?');
        values.push(listingData.meetingPoint);
      }
      if (listingData.category_id !== undefined) {
        updates.push('category_id = ?');
        values.push(listingData.category_id);
      }
      if (listingData.category !== undefined) {
        updates.push('category = ?');
        values.push(listingData.category);
      }
      if (listingData.partner_id !== undefined) {
        updates.push('partner_id = ?');
        values.push(listingData.partner_id);
      }
      if (listingData.images !== undefined) {
        updates.push('images = ?');
        values.push(
          Array.isArray(listingData.images)
            ? JSON.stringify(listingData.images)
            : listingData.images
        );
      }
      if (listingData.maxCapacity !== undefined) {
        updates.push('max_capacity = ?');
        values.push(listingData.maxCapacity);
      }
      if (listingData.highlights !== undefined) {
        updates.push('highlights = ?');
        values.push(
          Array.isArray(listingData.highlights)
            ? JSON.stringify(listingData.highlights.filter(h => h && h.trim()))
            : listingData.highlights
        );
      }
      if (listingData.included !== undefined) {
        updates.push('included = ?');
        values.push(
          Array.isArray(listingData.included)
            ? JSON.stringify(listingData.included.filter(i => i && i.trim()))
            : listingData.included
        );
      }
      if (listingData.excluded !== undefined) {
        updates.push('excluded = ?');
        values.push(
          Array.isArray(listingData.excluded)
            ? JSON.stringify(listingData.excluded.filter(e => e && e.trim()))
            : listingData.excluded
        );
      }
      if (listingData.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(listingData.is_active ? 1 : 0);
      }
      if (listingData.is_published !== undefined) {
        updates.push('is_published = ?');
        values.push(listingData.is_published ? 1 : 0);
      }
      if (listingData.featured !== undefined) {
        updates.push('is_featured = ?');
        values.push(listingData.featured ? 1 : 0);
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
        rowsAffected: result.rowsAffected,
        insertId: result.insertId
      });

      if (result.rowsAffected === 0) {
        console.warn(`⚠️ 경고: 업데이트된 행이 없습니다. 상품 ID ${id}가 존재하지 않을 수 있습니다.`);
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다.'
        });
      }

      // ⭐ 중요: 업데이트된 데이터를 다시 조회해서 반환
      const updatedResult = await connection.execute(
        `SELECT
          l.*,
          c.name_ko as category_name,
          c.slug as category_slug,
          p.business_name as partner_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.id = ?`,
        [id]
      );

      console.log(`✅ 업데이트된 상품 데이터 조회 완료`);

      return res.status(200).json({
        success: true,
        data: updatedResult.rows[0] || null,
        message: '상품 정보가 업데이트되었습니다.',
        rowsAffected: result.rowsAffected
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Listing API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
