/**
 * 숙박 벤더 개별 관리 API
 * GET /api/admin/accommodation-vendors/[id] - 특정 벤더 조회
 * PUT /api/admin/accommodation-vendors/[id] - 벤더 수정
 * DELETE /api/admin/accommodation-vendors/[id] - 벤더 삭제
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

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Vendor ID is required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 특정 벤더 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        'SELECT * FROM accommodation_vendors WHERE id = ?',
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    // PUT - 벤더 수정
    if (req.method === 'PUT') {
      const {
        business_name,
        brand_name,
        business_number,
        contact_name,
        contact_email,
        contact_phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id,
        status
      } = req.body;

      const result = await connection.execute(
        `UPDATE accommodation_vendors SET
          business_name = COALESCE(?, business_name),
          brand_name = COALESCE(?, brand_name),
          business_number = COALESCE(?, business_number),
          contact_name = COALESCE(?, contact_name),
          contact_email = COALESCE(?, contact_email),
          contact_phone = COALESCE(?, contact_phone),
          description = COALESCE(?, description),
          logo_url = COALESCE(?, logo_url),
          pms_provider = COALESCE(?, pms_provider),
          pms_api_key = COALESCE(?, pms_api_key),
          pms_property_id = COALESCE(?, pms_property_id),
          status = COALESCE(?, status),
          updated_at = NOW()
        WHERE id = ?`,
        [
          business_name,
          brand_name,
          business_number,
          contact_name,
          contact_email,
          contact_phone,
          description,
          logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          status,
          id
        ]
      );

      console.log('Accommodation vendor updated:', result);

      return res.status(200).json({
        success: true,
        message: '벤더가 수정되었습니다.'
      });
    }

    // DELETE - 벤더 삭제
    if (req.method === 'DELETE') {
      // 1. 진행 중인 예약 확인 (테이블/컬럼이 있는 경우만)
      try {
        const activeBookings = await connection.execute(
          `SELECT COUNT(*) as count
           FROM bookings
           WHERE accommodation_vendor_id = ? AND status IN ('pending', 'confirmed')`,
          [id]
        );

        if (activeBookings.rows?.[0]?.count > 0) {
          return res.status(400).json({
            success: false,
            error: '진행 중인 예약이 있어 삭제할 수 없습니다.',
            activeBookings: activeBookings.rows?.[0]?.count || 0
          });
        }
      } catch (checkError) {
        console.warn('⚠️ Unable to check active bookings (column may not exist):', checkError.message);
        // 예약 확인 실패 시 경고와 함께 계속 진행
      }

      try {
        // 2. 연관 데이터 삭제 (순차적으로, 각각 try-catch로 안전하게)
        let deletedRooms = 0;
        let deletedBookings = 0;
        let deletedReviews = 0;

        // 객실 삭제
        try {
          const roomsResult = await connection.execute(
            'DELETE FROM accommodation_rooms WHERE vendor_id = ?',
            [id]
          );
          deletedRooms = roomsResult.rowsAffected || 0;
          console.log(`✅ Deleted ${deletedRooms} rooms`);
        } catch (e) {
          console.warn('⚠️ Failed to delete rooms (table or column may not exist):', e.message);
        }

        // 과거 예약 삭제 (accommodation_vendor_id 컬럼이 있는 경우만)
        try {
          const bookingsResult = await connection.execute(
            'DELETE FROM bookings WHERE accommodation_vendor_id = ?',
            [id]
          );
          deletedBookings = bookingsResult.rowsAffected || 0;
          console.log(`✅ Deleted ${deletedBookings} bookings`);
        } catch (e) {
          console.warn('⚠️ Failed to delete bookings (column may not exist):', e.message);
        }

        // 리뷰 삭제 (accommodation_vendor_id 컬럼이 있는 경우만)
        try {
          const reviewsResult = await connection.execute(
            'DELETE FROM reviews WHERE accommodation_vendor_id = ?',
            [id]
          );
          deletedReviews = reviewsResult.rowsAffected || 0;
          console.log(`✅ Deleted ${deletedReviews} reviews`);
        } catch (e) {
          console.warn('⚠️ Failed to delete reviews (column may not exist):', e.message);
        }

        // 벤더 삭제 (최종)
        const result = await connection.execute(
          'DELETE FROM accommodation_vendors WHERE id = ?',
          [id]
        );

        console.log('✅ Accommodation vendor deleted:', {
          vendor_id: id,
          rooms: deletedRooms,
          bookings: deletedBookings,
          reviews: deletedReviews
        });

        return res.status(200).json({
          success: true,
          message: '벤더가 성공적으로 삭제되었습니다.',
          deleted: {
            vendor: 1,
            rooms: deletedRooms,
            bookings: deletedBookings,
            reviews: deletedReviews
          }
        });

      } catch (deleteError) {
        console.error('❌ Vendor deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          error: '벤더 삭제 중 오류가 발생했습니다.',
          details: deleteError.message
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Accommodation vendor API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
