/**
 * 숙박 객실 관리 API
 * GET /api/admin/accommodation-rooms - 객실 목록 조회
 * POST /api/admin/accommodation-rooms - 객실 생성
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 객실 목록 조회
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let query = 'SELECT * FROM accommodation_rooms';
      let params = [];

      if (vendor_id) {
        query += ' WHERE vendor_id = ?';
        params.push(vendor_id);
      }

      query += ' ORDER BY created_at DESC';

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST - 객실 생성
    if (req.method === 'POST') {
      const {
        vendor_id,
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

      // 필수 필드 검증
      if (!vendor_id || !room_code || !room_name || !room_type) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (vendor_id, room_code, room_name, room_type)'
        });
      }

      // 중복 room_code 확인
      const existingRoom = await connection.execute(
        'SELECT id FROM accommodation_rooms WHERE vendor_id = ? AND room_code = ?',
        [vendor_id, room_code]
      );

      if (existingRoom.rows && existingRoom.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: `객실 코드 "${room_code}"가 이미 존재합니다.`
        });
      }

      // 객실 생성
      const result = await connection.execute(
        `INSERT INTO accommodation_rooms (
          vendor_id, room_code, room_name, room_type, floor, room_number,
          capacity, bed_type, bed_count, size_sqm, base_price_per_night, weekend_surcharge,
          view_type, has_balcony, breakfast_included, wifi_available, tv_available,
          minibar_available, air_conditioning, heating, bathroom_type,
          description, amenities, images, is_available, max_occupancy,
          min_nights, max_nights, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, NOW(), NOW()
        )`,
        [
          vendor_id, room_code, room_name, room_type, floor || null, room_number || room_code,
          capacity || 2, bed_type || 'double', bed_count || 1, size_sqm || 30, base_price_per_night || 0, weekend_surcharge || 0,
          view_type || 'city', has_balcony || false, breakfast_included || false, wifi_available || true, tv_available || true,
          minibar_available || false, air_conditioning || true, heating || true, bathroom_type || 'shower',
          description || '', amenities || '[]', images || '[]', is_available !== false, max_occupancy || capacity || 2,
          min_nights || 1, max_nights || 30
        ]
      );

      console.log('Accommodation room created:', result);

      return res.status(201).json({
        success: true,
        message: '객실이 생성되었습니다.',
        data: {
          id: result.insertId,
          room_code,
          room_name
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Accommodation rooms API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
};
