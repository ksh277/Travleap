import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;
  const userId = req.headers['x-user-id'] || req.body?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '사용자 인증이 필요합니다.' });
  }

  if (!id) {
    return res.status(400).json({ success: false, message: '차량 ID가 필요합니다.' });
  }

  try {
    if (method === 'PATCH') {
      const { is_available } = req.body;

      // 해당 차량이 이 업체의 차량인지 확인
      const checkResult = await connection.execute(
        'SELECT id FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?',
        [id, userId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '권한이 없거나 차량을 찾을 수 없습니다.' });
      }

      // 예약 가능 여부 토글
      await connection.execute(
        `UPDATE rentcar_vehicles
        SET is_active = ?, updated_at = NOW()
        WHERE id = ? AND vendor_id = ?`,
        [is_available ? 1 : 0, id, userId]
      );

      return res.status(200).json({
        success: true,
        message: is_available ? '차량이 예약 가능으로 변경되었습니다.' : '차량이 예약 불가로 변경되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Vehicle availability API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
