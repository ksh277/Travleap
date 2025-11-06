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
    // 해당 차량이 이 업체의 차량인지 확인
    const checkResult = await connection.execute(
      'SELECT id FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?',
      [id, userId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: '권한이 없거나 차량을 찾을 수 없습니다.' });
    }

    if (method === 'PUT') {
      // 차량 정보 수정 (단순화: 필수 필드만)
      const {
        display_name,
        daily_rate_krw,
        hourly_rate_krw,
        is_available,
        image_urls
      } = req.body;

      // 필수 필드 검증
      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요. (차량명, 일일 요금)'
        });
      }

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = JSON.stringify(image_urls || []);

      // 시간당 요금 자동 계산 (입력하지 않은 경우)
      const calculatedHourlyRate = hourly_rate_krw || Math.ceil(daily_rate_krw / 24);

      await connection.execute(
        `UPDATE rentcar_vehicles
        SET
          display_name = ?,
          daily_rate_krw = ?,
          hourly_rate_krw = ?,
          thumbnail_url = ?,
          images = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ? AND vendor_id = ?`,
        [
          display_name,
          daily_rate_krw,
          calculatedHourlyRate,
          image_urls && image_urls.length > 0 ? image_urls[0] : null,
          imagesJson,
          is_available !== undefined ? (is_available ? 1 : 0) : 1,
          id,
          userId
        ]
      );

      return res.status(200).json({
        success: true,
        message: '차량 정보가 수정되었습니다.',
        data: {
          id,
          display_name,
          daily_rate_krw,
          hourly_rate_krw: calculatedHourlyRate
        }
      });
    }

    if (method === 'DELETE') {
      // 차량 삭제
      await connection.execute(
        'DELETE FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?',
        [id, userId]
      );

      return res.status(200).json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Vendor vehicle [id] API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
