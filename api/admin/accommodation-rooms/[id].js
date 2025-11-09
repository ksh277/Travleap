/**
 * 숙박 객실 개별 관리 API
 * GET /api/admin/accommodation-rooms/[id] - 특정 객실 조회
 * PUT /api/admin/accommodation-rooms/[id] - 객실 수정
 * DELETE /api/admin/accommodation-rooms/[id] - 객실 삭제
 */

const { connect } = require('@planetscale/database');

// category_id for 숙박 (stay)
const STAY_CATEGORY_ID = 1857;

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
      error: 'Room ID is required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 특정 객실 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT * FROM listings
         WHERE id = ? AND category = 'stay'`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '객실을 찾을 수 없습니다.'
        });
      }

      const room = result.rows[0];

      // JSON 필드 파싱
      if (room.amenities && typeof room.amenities === 'string') {
        try {
          room.amenities = JSON.parse(room.amenities);
        } catch (e) {
          room.amenities = [];
        }
      }
      if (room.images && typeof room.images === 'string') {
        try {
          room.images = JSON.parse(room.images);
        } catch (e) {
          room.images = [];
        }
      }

      return res.status(200).json({
        success: true,
        data: room
      });
    }

    // PUT - 객실 수정
    if (req.method === 'PUT') {
      const {
        room_code,
        room_name,
        room_type,
        floor,
        room_number,
        capacity,
        bed_type,
        bed_count,
        size_sqm,
        base_price_per_night,
        weekend_surcharge,
        view_type,
        has_balcony,
        breakfast_included,
        wifi_available,
        tv_available,
        minibar_available,
        air_conditioning,
        heating,
        bathroom_type,
        description,
        amenities,
        images,
        is_available,
        max_occupancy,
        min_nights,
        max_nights
      } = req.body;

      // 객실 존재 확인
      const existingRoom = await connection.execute(
        `SELECT id, partner_id FROM listings
         WHERE id = ? AND category = 'stay'`,
        [id]
      );

      if (!existingRoom.rows || existingRoom.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '객실을 찾을 수 없습니다.'
        });
      }

      // amenities와 images를 JSON 문자열로 변환
      const amenitiesJson = amenities
        ? (typeof amenities === 'string' ? amenities : JSON.stringify(amenities))
        : null;
      const imagesJson = images
        ? (typeof images === 'string' ? images : JSON.stringify(images))
        : null;

      // 업데이트할 필드만 동적으로 쿼리 생성
      const updates = [];
      const params = [];

      if (room_code !== undefined) {
        updates.push('room_code = ?');
        params.push(room_code);
      }
      if (room_name !== undefined) {
        updates.push('title = ?');
        params.push(room_name);
      }
      if (description !== undefined) {
        updates.push('description_md = ?');
        params.push(description);
      }
      if (room_number !== undefined) {
        updates.push('room_number = ?');
        params.push(room_number);
      }
      if (floor !== undefined) {
        updates.push('floor = ?');
        params.push(floor);
      }
      if (bed_type !== undefined) {
        updates.push('bed_type = ?');
        params.push(bed_type);
      }
      if (bed_count !== undefined) {
        updates.push('bed_count = ?');
        params.push(bed_count);
      }
      if (size_sqm !== undefined) {
        updates.push('size_sqm = ?');
        params.push(size_sqm);
      }
      if (base_price_per_night !== undefined) {
        updates.push('base_price_per_night = ?');
        updates.push('price_from = ?'); // price_from도 업데이트
        params.push(base_price_per_night);
        params.push(base_price_per_night);
      }
      if (weekend_surcharge !== undefined) {
        updates.push('weekend_surcharge = ?');
        params.push(weekend_surcharge);
      }
      if (view_type !== undefined) {
        updates.push('view_type = ?');
        params.push(view_type);
      }
      if (has_balcony !== undefined) {
        updates.push('has_balcony = ?');
        params.push(has_balcony ? 1 : 0);
      }
      if (breakfast_included !== undefined) {
        updates.push('breakfast_included = ?');
        params.push(breakfast_included ? 1 : 0);
      }
      if (wifi_available !== undefined) {
        updates.push('wifi_available = ?');
        params.push(wifi_available ? 1 : 0);
      }
      if (tv_available !== undefined) {
        updates.push('tv_available = ?');
        params.push(tv_available ? 1 : 0);
      }
      if (minibar_available !== undefined) {
        updates.push('minibar_available = ?');
        params.push(minibar_available ? 1 : 0);
      }
      if (air_conditioning !== undefined) {
        updates.push('air_conditioning = ?');
        params.push(air_conditioning ? 1 : 0);
      }
      if (heating !== undefined) {
        updates.push('heating = ?');
        params.push(heating ? 1 : 0);
      }
      if (bathroom_type !== undefined) {
        updates.push('bathroom_type = ?');
        params.push(bathroom_type);
      }
      if (max_occupancy !== undefined) {
        updates.push('max_occupancy = ?');
        params.push(max_occupancy);
      }
      if (min_nights !== undefined) {
        updates.push('min_nights = ?');
        params.push(min_nights);
      }
      if (max_nights !== undefined) {
        updates.push('max_nights = ?');
        params.push(max_nights);
      }
      if (amenitiesJson !== null) {
        updates.push('amenities = ?');
        params.push(amenitiesJson);
      }
      if (imagesJson !== null) {
        updates.push('images = ?');
        params.push(imagesJson);
      }
      if (is_available !== undefined) {
        updates.push('is_active = ?');
        params.push(is_available ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      // updated_at 추가
      updates.push('updated_at = NOW()');

      // 쿼리 실행
      params.push(id); // WHERE 조건용
      const query = `UPDATE listings SET ${updates.join(', ')} WHERE id = ? AND category = 'stay'`;

      console.log('🔄 객실 수정 쿼리:', query);
      console.log('🔄 파라미터:', params);

      const result = await connection.execute(query, params);

      console.log('✅ Accommodation room updated:', result);

      return res.status(200).json({
        success: true,
        message: '객실이 수정되었습니다.'
      });
    }

    // DELETE - 객실 삭제
    if (req.method === 'DELETE') {
      // 1. 진행 중인 예약 확인
      const activeBookings = await connection.execute(
        `SELECT COUNT(*) as count
         FROM bookings
         WHERE listing_id = ? AND status IN ('pending', 'confirmed')`,
        [id]
      );

      if (activeBookings.rows?.[0]?.count > 0) {
        return res.status(400).json({
          success: false,
          error: '진행 중인 예약이 있어 삭제할 수 없습니다.',
          activeBookings: activeBookings.rows?.[0]?.count || 0
        });
      }

      try {
        // 2. 연관 데이터 삭제 (순차적으로)

        // 과거 예약 삭제
        await connection.execute(
          'DELETE FROM bookings WHERE listing_id = ?',
          [id]
        );

        // 리뷰 삭제
        await connection.execute(
          'DELETE FROM reviews WHERE listing_id = ?',
          [id]
        );

        // 객실 삭제
        const result = await connection.execute(
          `DELETE FROM listings WHERE id = ? AND category = 'stay'`,
          [id]
        );

        console.log('Accommodation room deleted:', result);

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

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Accommodation room API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
