/**
 * 관리자 팝업 CRUD API
 *
 * 기능:
 * - GET: 모든 팝업 조회 (관리자 전용)
 * - POST: 새 팝업 생성
 * - PUT: 팝업 수정
 * - DELETE: 팝업 삭제
 *
 * 라우트: /api/admin/popups
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

async function handler(req, res) {
  // JWT 인증 (관리자만)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.'
    });
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 모든 팝업 조회
    if (req.method === 'GET') {
      const { limit = '100', offset = '0' } = req.query;

      const popupsResult = await connection.execute(
        `SELECT
          p.*,
          u.name as vendor_name,
          u.email as vendor_email
        FROM popups p
        LEFT JOIN users u ON p.vendor_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
      );

      const popups = popupsResult.rows || [];

      // JSON 필드 파싱
      const parsedPopups = popups.map(popup => ({
        ...popup,
        gallery_images: popup.gallery_images ? JSON.parse(popup.gallery_images) : [],
        tags: popup.tags ? JSON.parse(popup.tags) : []
      }));

      return res.status(200).json({
        success: true,
        data: parsedPopups
      });
    }

    // POST: 새 팝업 생성
    if (req.method === 'POST') {
      const {
        vendor_id,
        brand_name,
        popup_name,
        description,
        category = '팝업',
        location_name,
        address,
        latitude,
        longitude,
        start_date,
        end_date,
        operating_hours,
        entrance_fee = 0,
        is_free = false,
        image_url,
        gallery_images = [],
        requires_reservation = false,
        max_capacity,
        booking_url,
        tags = [],
        sns_instagram,
        sns_website,
        parking_info,
        nearby_subway,
        is_active = true,
        status = 'upcoming'
      } = req.body;

      // 필수 필드 검증
      if (!vendor_id || !brand_name || !popup_name || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: '필수 정보가 누락되었습니다. (vendor_id, brand_name, popup_name, start_date, end_date)'
        });
      }

      const insertResult = await connection.execute(
        `INSERT INTO popups (
          vendor_id, brand_name, popup_name, description, category,
          location_name, address, latitude, longitude,
          start_date, end_date, operating_hours,
          entrance_fee, is_free, image_url, gallery_images,
          requires_reservation, max_capacity, booking_url,
          tags, sns_instagram, sns_website, parking_info, nearby_subway,
          is_active, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendor_id, brand_name, popup_name, description, category,
          location_name, address, latitude, longitude,
          start_date, end_date, operating_hours,
          entrance_fee, is_free, image_url, JSON.stringify(gallery_images),
          requires_reservation, max_capacity, booking_url,
          JSON.stringify(tags), sns_instagram, sns_website, parking_info, nearby_subway,
          is_active, status
        ]
      );

      return res.status(201).json({
        success: true,
        message: '팝업이 생성되었습니다.',
        data: {
          id: insertResult.insertId,
          popup_name
        }
      });
    }

    // PUT: 팝업 수정
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'popup ID가 필요합니다.'
        });
      }

      // 동적 UPDATE 쿼리 생성
      const updateFields = [];
      const updateValues = [];

      const allowedFields = [
        'vendor_id', 'brand_name', 'popup_name', 'description', 'category',
        'location_name', 'address', 'latitude', 'longitude',
        'start_date', 'end_date', 'operating_hours',
        'entrance_fee', 'is_free', 'image_url', 'gallery_images',
        'requires_reservation', 'max_capacity', 'booking_url',
        'tags', 'sns_instagram', 'sns_website', 'parking_info', 'nearby_subway',
        'is_active', 'status'
      ];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          // JSON 필드는 stringify
          if (key === 'gallery_images' || key === 'tags') {
            updateValues.push(JSON.stringify(value));
          } else {
            updateValues.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: '수정할 필드가 없습니다.'
        });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await connection.execute(
        `UPDATE popups SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return res.status(200).json({
        success: true,
        message: '팝업이 수정되었습니다.'
      });
    }

    // DELETE: 팝업 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'popup ID가 필요합니다.'
        });
      }

      await connection.execute(
        `DELETE FROM popups WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '팝업이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('팝업 CRUD 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

module.exports = handler;
