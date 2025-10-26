/**
 * 관리자 벤더 관리 API
 * DELETE /api/admin/vendors/[id] - 벤더 삭제 (트랜잭션 처리)
 * PUT /api/admin/vendors/[id] - 벤더 정보 수정
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
    return res.status(400).json({ success: false, error: 'Vendor ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // DELETE - 벤더 삭제 (트랜잭션 처리)
    if (req.method === 'DELETE') {
      // 1. 진행 중인 예약 확인
      const activeBookings = await connection.execute(
        `SELECT COUNT(*) as count
         FROM rentcar_bookings
         WHERE vendor_id = ? AND status IN ('pending', 'confirmed')`,
        [id]
      );

      if (activeBookings[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: '진행 중인 예약이 있어 삭제할 수 없습니다.',
          activeBookings: activeBookings[0].count
        });
      }

      // 2. 트랜잭션으로 연관 데이터 삭제
      // PlanetScale은 autocommit이므로 순차적 삭제로 처리
      // (실제 트랜잭션은 연결 풀 필요 - 여기서는 순차 삭제)

      try {
        // 2-1. 차량 삭제
        await connection.execute(
          'DELETE FROM rentcar_vehicles WHERE vendor_id = ?',
          [id]
        );

        // 2-2. 과거 예약 삭제 (완료/취소된 것)
        await connection.execute(
          'DELETE FROM rentcar_bookings WHERE vendor_id = ?',
          [id]
        );

        // 2-3. 위치 정보 삭제 (있다면)
        try {
          await connection.execute(
            'DELETE FROM rentcar_locations WHERE vendor_id = ?',
            [id]
          );
        } catch (locationError) {
          console.log('Location deletion skipped:', locationError.message);
        }

        // 2-4. 리뷰 삭제 (rentcar_vendor_id 컬럼이 있는 경우만)
        try {
          await connection.execute(
            'DELETE FROM reviews WHERE rentcar_vendor_id = ?',
            [id]
          );
        } catch (reviewError) {
          // rentcar_vendor_id 컬럼이 없으면 무시 (마이그레이션 전)
          console.log('Review deletion skipped (column may not exist):', reviewError.message);
        }

        // 2-5. 벤더 삭제
        const result = await connection.execute(
          'DELETE FROM rentcar_vendors WHERE id = ?',
          [id]
        );

        // PlanetScale의 결과 확인
        console.log('Delete result:', result);

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

    // PUT - 벤더 정보 수정
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
        `UPDATE rentcar_vendors SET
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

      console.log('Update result:', result);

      return res.status(200).json({
        success: true,
        message: '벤더 정보가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Vendor API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
