/**
 * 숙박 객실 관리 API (listings 테이블 사용)
 * GET /api/admin/accommodation-rooms - 객실 목록 조회
 * POST /api/admin/accommodation-rooms - 객실 생성
 */

const { connect } = require('@planetscale/database');

const STAY_CATEGORY_ID = 1857; // categories 테이블의 stay 카테고리 ID

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 객실 목록 조회 (listings 테이블에서 category='stay')
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let query = `SELECT
        id,
        partner_id as vendor_id,
        title as room_name,
        description_md as description,
        room_code,
        room_number,
        floor,
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
        max_occupancy,
        min_nights,
        max_nights,
        price_from,
        images,
        amenities,
        is_active as is_available,
        created_at,
        updated_at
      FROM listings
      WHERE category = 'stay' AND category_id = ${STAY_CATEGORY_ID}`;

      let params = [];

      if (vendor_id) {
        query += ' AND partner_id = ?';
        params.push(vendor_id);
      }

      query += ' ORDER BY created_at DESC';

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST - 객실 생성 (listings 테이블에 삽입)
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
      if (!vendor_id || !room_code || !room_name) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (vendor_id, room_code, room_name)'
        });
      }

      // 벤더 존재 확인
      const vendorCheck = await connection.execute(
        'SELECT id FROM partners WHERE id = ? AND partner_type = "lodging"',
        [vendor_id]
      );

      if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        });
      }

      // 중복 room_code 확인
      const existingRoom = await connection.execute(
        'SELECT id FROM listings WHERE partner_id = ? AND room_code = ? AND category = "stay"',
        [vendor_id, room_code]
      );

      if (existingRoom.rows && existingRoom.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: `객실 코드 "${room_code}"가 이미 존재합니다.`
        });
      }

      // amenities와 images를 JSON 문자열로 변환
      const amenitiesJson = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);
      const imagesJson = typeof images === 'string' ? images : JSON.stringify(images || []);

      // 객실 생성 (listings 테이블)
      const result = await connection.execute(
        `INSERT INTO listings (
          category_id,
          category,
          partner_id,
          title,
          description_md,
          room_code,
          room_number,
          floor,
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
          max_occupancy,
          min_nights,
          max_nights,
          price_from,
          price_to,
          amenities,
          images,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ?, 'stay', ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, NOW(), NOW()
        )`,
        [
          STAY_CATEGORY_ID,
          vendor_id,
          room_name,
          description || `${room_type || ''} ${room_name}`,
          room_code,
          room_number || room_code,
          floor || null,
          bed_type || 'double',
          bed_count || 1,
          size_sqm || 30,
          base_price_per_night || 0,
          weekend_surcharge || 0,
          view_type || 'city',
          has_balcony ? 1 : 0,
          breakfast_included ? 1 : 0,
          wifi_available !== false ? 1 : 0,
          tv_available !== false ? 1 : 0,
          minibar_available ? 1 : 0,
          air_conditioning !== false ? 1 : 0,
          heating !== false ? 1 : 0,
          bathroom_type || 'shower',
          max_occupancy || capacity || 2,
          min_nights || 1,
          max_nights || 30,
          base_price_per_night || 0,
          base_price_per_night ? (base_price_per_night + (weekend_surcharge || 0)) : 0,
          amenitiesJson,
          imagesJson,
          is_available !== false ? 1 : 0
        ]
      );

      console.log('Accommodation room created in listings table:', result);

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
