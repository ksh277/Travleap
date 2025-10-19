import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { method } = req;
  const vendorId = req.headers['x-user-id'] || req.query.vendorId || req.body?.vendorId;

  if (!vendorId) {
    return res.status(401).json({ success: false, message: '사용자 인증이 필요합니다.' });
  }

  try {
    if (method === 'GET') {
      // 객실 목록 조회
      const result = await connection.execute(
        `SELECT
          id,
          listing_id,
          room_type as name,
          price,
          max_occupancy,
          bed_type,
          room_size,
          amenities,
          available_rooms,
          is_available,
          created_at,
          updated_at
        FROM accommodation_rooms
        WHERE listing_id IN (
          SELECT id FROM listings WHERE vendor_id = ? AND category IN ('hotel', 'motel', 'pension', 'guesthouse', 'resort')
        )
        ORDER BY created_at DESC`,
        [vendorId]
      );

      const rooms = result.rows.map(room => ({
        ...room,
        amenities: room.amenities ? JSON.parse(room.amenities) : [],
        is_available: room.is_available === 1
      }));

      return res.status(200).json({
        success: true,
        data: rooms
      });
    }

    if (method === 'POST') {
      // 새 객실 추가
      const {
        listing_id,
        room_type,
        price,
        max_occupancy,
        bed_type,
        room_size,
        amenities,
        available_rooms
      } = req.body;

      // listing이 해당 vendor 소유인지 확인
      const checkResult = await connection.execute(
        `SELECT id FROM listings WHERE id = ? AND vendor_id = ?`,
        [listing_id, vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }

      await connection.execute(
        `INSERT INTO accommodation_rooms
        (listing_id, room_type, price, max_occupancy, bed_type, room_size, amenities, available_rooms, is_available, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          listing_id,
          room_type,
          price,
          max_occupancy || 2,
          bed_type || '더블',
          room_size || null,
          amenities ? JSON.stringify(amenities) : null,
          available_rooms || 1
        ]
      );

      return res.status(201).json({
        success: true,
        message: '객실이 추가되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Accommodation rooms API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
