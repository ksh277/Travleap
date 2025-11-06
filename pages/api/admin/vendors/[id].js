import executeQuery from '../../../../utils/database';

export default async function handler(req, res) {
  const { id } = req.query;
  const adminId = req.headers['x-admin-id'];

  // Admin 권한 확인
  if (!adminId) {
    return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  try {
    // Admin 권한 검증
    const [admin] = await executeQuery({
      query: 'SELECT role FROM users WHERE id = ? AND role = ?',
      values: [adminId, 'admin']
    });

    if (!admin) {
      return res.status(403).json({ success: false, message: '관리자만 접근 가능합니다.' });
    }

    if (req.method === 'DELETE') {
      // 벤더 삭제
      await executeQuery({
        query: 'BEGIN'
      });

      try {
        // 1. 해당 벤더의 차량/객실 예약 확인
        const [bookings] = await executeQuery({
          query: `
            SELECT COUNT(*) as count FROM rentcar_bookings rb
            JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
            WHERE rv.vendor_id = ? AND rb.status IN ('confirmed', 'pending')
          `,
          values: [id]
        });

        if (bookings.count > 0) {
          await executeQuery({ query: 'ROLLBACK' });
          return res.status(400).json({
            success: false,
            message: '진행 중이거나 확정된 예약이 있어 삭제할 수 없습니다.'
          });
        }

        // 2. 연관된 차량 예약 기록 삭제
        await executeQuery({
          query: `
            DELETE rb FROM rentcar_bookings rb
            JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
            WHERE rv.vendor_id = ?
          `,
          values: [id]
        });

        // 3. 차량 삭제
        await executeQuery({
          query: 'DELETE FROM rentcar_vehicles WHERE vendor_id = ?',
          values: [id]
        });

        // 4. 업체 위치 삭제
        await executeQuery({
          query: 'DELETE FROM rentcar_locations WHERE vendor_id = ?',
          values: [id]
        });

        // 5. 벤더 계정 삭제
        await executeQuery({
          query: 'DELETE FROM rentcar_vendors WHERE id = ?',
          values: [id]
        });

        await executeQuery({ query: 'COMMIT' });

        return res.status(200).json({
          success: true,
          message: '업체가 성공적으로 삭제되었습니다.'
        });

      } catch (error) {
        await executeQuery({ query: 'ROLLBACK' });
        throw error;
      }

    } else if (req.method === 'PUT') {
      // 벤더 정보 수정 (관리자용)
      const {
        business_name,
        contact_name,
        contact_email,
        contact_phone,
        address,
        description,
        cancellation_policy,
        status,
        is_verified
      } = req.body;

      await executeQuery({
        query: `
          UPDATE rentcar_vendors
          SET business_name = ?,
              contact_name = ?,
              contact_email = ?,
              contact_phone = ?,
              address = ?,
              description = ?,
              cancellation_policy = ?,
              status = ?,
              is_verified = ?,
              updated_at = NOW()
          WHERE id = ?
        `,
        values: [
          business_name,
          contact_name,
          contact_email,
          contact_phone,
          address,
          description,
          cancellation_policy,
          status,
          is_verified,
          id
        ]
      });

      return res.status(200).json({
        success: true,
        message: '업체 정보가 수정되었습니다.'
      });

    } else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin vendor API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
