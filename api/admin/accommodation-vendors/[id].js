/**
 * 숙박 벤더 개별 관리 API (partners 테이블 사용)
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
    // GET - 특정 벤더 조회 (partners 테이블에서)
    if (req.method === 'GET') {
      const categoryId = 1857; // stay category

      const result = await connection.execute(
        `SELECT
          p.*,
          COUNT(DISTINCT l.id) as room_count,
          MIN(l.price_from) as min_price,
          MAX(l.price_from) as max_price
        FROM partners p
        LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_active = 1
        WHERE p.id = ? AND p.partner_type = 'lodging'
        GROUP BY p.id
        LIMIT 1`,
        [categoryId, id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        });
      }

      const vendor = result.rows[0];

      return res.status(200).json({
        success: true,
        data: {
          ...vendor,
          contact_email: vendor.email,
          contact_phone: vendor.phone,
          logo_url: vendor.logo,
          vendor_code: `ACC${vendor.id}`
        }
      });
    }

    // PUT - 벤더 수정 (partners 테이블)
    if (req.method === 'PUT') {
      const {
        business_name,
        business_number,
        contact_name,
        contact_email,
        contact_phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id,
        pms_sync_enabled,
        pms_sync_interval,
        check_in_time,
        check_out_time,
        policies,
        status
      } = req.body;

      const result = await connection.execute(
        `UPDATE partners SET
          business_name = COALESCE(?, business_name),
          business_number = COALESCE(?, business_number),
          contact_name = COALESCE(?, contact_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          description = COALESCE(?, description),
          logo = COALESCE(?, logo),
          pms_provider = COALESCE(?, pms_provider),
          pms_api_key = COALESCE(?, pms_api_key),
          pms_property_id = COALESCE(?, pms_property_id),
          pms_sync_enabled = COALESCE(?, pms_sync_enabled),
          pms_sync_interval = COALESCE(?, pms_sync_interval),
          check_in_time = COALESCE(?, check_in_time),
          check_out_time = COALESCE(?, check_out_time),
          policies = COALESCE(?, policies),
          status = COALESCE(?, status),
          updated_at = NOW()
        WHERE id = ? AND partner_type = 'lodging'`,
        [
          business_name,
          business_number,
          contact_name,
          contact_email,
          contact_phone,
          description,
          logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          check_in_time,
          check_out_time,
          policies,
          status,
          id
        ]
      );

      console.log('Accommodation vendor updated in partners table:', result);

      return res.status(200).json({
        success: true,
        message: '벤더가 수정되었습니다.'
      });
    }

    // DELETE - 벤더 삭제 (partners 테이블)
    if (req.method === 'DELETE') {
      // 1. 진행 중인 예약 확인
      const activeBookings = await connection.execute(
        `SELECT COUNT(*) as count
         FROM bookings b
         INNER JOIN listings l ON b.listing_id = l.id
         WHERE l.partner_id = ? AND b.status IN ('pending', 'confirmed')`,
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

        // 리뷰 삭제
        await connection.execute(
          `DELETE r FROM reviews r
           INNER JOIN listings l ON r.listing_id = l.id
           WHERE l.partner_id = ?`,
          [id]
        );

        // 과거 예약 삭제
        await connection.execute(
          `DELETE b FROM bookings b
           INNER JOIN listings l ON b.listing_id = l.id
           WHERE l.partner_id = ?`,
          [id]
        );

        // 객실(listings) 삭제
        await connection.execute(
          'DELETE FROM listings WHERE partner_id = ?',
          [id]
        );

        // 파트너 삭제
        const result = await connection.execute(
          'DELETE FROM partners WHERE id = ? AND partner_type = \'lodging\'',
          [id]
        );

        console.log('Accommodation vendor deleted from partners table:', result);

        return res.status(200).json({
          success: true,
          message: '벤더가 성공적으로 삭제되었습니다.'
        });

      } catch (deleteError) {
        console.error('Vendor deletion error:', deleteError);
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
