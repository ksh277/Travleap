/**
 * 관리자 파트너(숙박 업체) 관리 API
 * DELETE /api/admin/partners/[id] - 파트너 삭제 (트랜잭션 처리)
 * PUT /api/admin/partners/[id] - 파트너 정보 수정
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
    return res.status(400).json({ success: false, error: 'Partner ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // DELETE - 파트너 삭제 (트랜잭션 처리)
    if (req.method === 'DELETE') {
      // 1. 진행 중인 예약 확인 (listings를 통해서)
      const activeBookings = await connection.execute(
        `SELECT COUNT(*) as count
         FROM bookings b
         JOIN listings l ON b.listing_id = l.id
         WHERE l.partner_id = ? AND b.status IN ('pending', 'confirmed')`,
        [id]
      );

      if (activeBookings.rows[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: '진행 중인 예약이 있어 삭제할 수 없습니다.',
          activeBookings: activeBookings.rows[0].count
        });
      }

      // 2. 트랜잭션으로 연관 데이터 삭제
      // PlanetScale은 autocommit이므로 순차적 삭제로 처리

      try {
        // 2-1. 과거 예약 삭제 (listings를 통해서)
        await connection.execute(
          `DELETE b FROM bookings b
           JOIN listings l ON b.listing_id = l.id
           WHERE l.partner_id = ?`,
          [id]
        );

        // 2-2. 리뷰 삭제
        await connection.execute(
          'DELETE FROM reviews WHERE partner_id = ?',
          [id]
        );

        // 2-3. 객실 삭제 (listings 테이블)
        await connection.execute(
          'DELETE FROM listings WHERE partner_id = ?',
          [id]
        );

        // 2-4. 파트너 삭제
        const result = await connection.execute(
          'DELETE FROM partners WHERE id = ?',
          [id]
        );

        if (result.rowsAffected === 0) {
          return res.status(404).json({
            success: false,
            error: '파트너를 찾을 수 없습니다.'
          });
        }

        return res.status(200).json({
          success: true,
          message: '파트너가 성공적으로 삭제되었습니다.'
        });

      } catch (deleteError) {
        console.error('Partner deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          error: '파트너 삭제 중 오류가 발생했습니다.',
          details: deleteError.message
        });
      }
    }

    // PUT - 파트너 정보 수정
    if (req.method === 'PUT') {
      const {
        business_name,
        contact_name,
        email,
        phone,
        address,
        description,
        status,
        tier,
        is_featured
      } = req.body;

      const result = await connection.execute(
        `UPDATE partners SET
          business_name = COALESCE(?, business_name),
          contact_name = COALESCE(?, contact_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          tier = COALESCE(?, tier),
          is_featured = COALESCE(?, is_featured),
          updated_at = NOW()
        WHERE id = ?`,
        [
          business_name,
          contact_name,
          email,
          phone,
          address,
          description,
          status,
          tier,
          is_featured,
          id
        ]
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({
          success: false,
          error: '파트너를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        message: '파트너 정보가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Partner API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
