import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;
  const vendorId = req.headers['x-user-id'];

  if (!vendorId) {
    return res.status(401).json({ success: false, message: '사용자 인증이 필요합니다.' });
  }

  try {
    if (method === 'PUT') {
      // 객실 정보 수정
      const {
        room_type,
        price,
        max_occupancy,
        bed_type,
        room_size,
        amenities,
        available_rooms,
        is_available
      } = req.body;

      // 권한 확인
      const checkResult = await connection.execute(
        `SELECT ar.id FROM accommodation_rooms ar
        JOIN listings l ON ar.listing_id = l.id
        WHERE ar.id = ? AND l.vendor_id = ?`,
        [id, vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }

      await connection.execute(
        `UPDATE accommodation_rooms
        SET
          room_type = ?,
          price = ?,
          max_occupancy = ?,
          bed_type = ?,
          room_size = ?,
          amenities = ?,
          available_rooms = ?,
          is_available = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          room_type,
          price,
          max_occupancy,
          bed_type,
          room_size,
          amenities ? JSON.stringify(amenities) : null,
          available_rooms,
          is_available ? 1 : 0,
          id
        ]
      );

      return res.status(200).json({
        success: true,
        message: '객실 정보가 수정되었습니다.'
      });
    }

    if (method === 'DELETE') {
      // 객실 삭제
      // 권한 확인
      const checkResult = await connection.execute(
        `SELECT ar.id FROM accommodation_rooms ar
        JOIN listings l ON ar.listing_id = l.id
        WHERE ar.id = ? AND l.vendor_id = ?`,
        [id, vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }

      await connection.execute(
        `DELETE FROM accommodation_rooms WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '객실이 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Room update/delete API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
