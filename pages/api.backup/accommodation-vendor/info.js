import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '사용자 인증이 필요합니다.' });
  }

  try {
    if (method === 'GET') {
      // 숙박 업체 정보 조회 (listings 테이블 기반)
      const result = await connection.execute(
        `SELECT
          id,
          title as name,
          location,
          description,
          main_image as logo_url,
          images,
          cancellation_policy,
          price_from,
          rating,
          category
        FROM listings
        WHERE vendor_id = ? AND category IN ('hotel', 'motel', 'pension', 'guesthouse', 'resort')
        LIMIT 1`,
        [userId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
      }

      const vendor = result.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          ...vendor,
          images: vendor.images ? JSON.parse(vendor.images) : []
        }
      });
    }

    if (method === 'PUT') {
      // 숙박 업체 정보 수정
      const {
        name,
        location,
        description,
        logo_url,
        images,
        cancellation_policy
      } = req.body;

      await connection.execute(
        `UPDATE listings
        SET
          title = ?,
          location = ?,
          description = ?,
          main_image = ?,
          images = ?,
          cancellation_policy = ?,
          updated_at = NOW()
        WHERE vendor_id = ? AND category IN ('hotel', 'motel', 'pension', 'guesthouse', 'resort')`,
        [
          name,
          location,
          description,
          logo_url || null,
          images ? JSON.stringify(images) : null,
          cancellation_policy || null,
          userId
        ]
      );

      return res.status(200).json({
        success: true,
        message: '숙박 업체 정보가 수정되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Accommodation vendor info API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
