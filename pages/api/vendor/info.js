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
      // 업체 정보 조회
      const result = await connection.execute(
        `SELECT
          id,
          vendor_code,
          business_name as name,
          contact_name as contact_person,
          contact_email,
          contact_phone,
          address,
          description,
          logo_url,
          images,
          cancellation_policy,
          status,
          is_verified,
          total_vehicles as vehicle_count
        FROM rentcar_vendors
        WHERE id = ?
        LIMIT 1`,
        [userId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendor = result.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          ...vendor,
          is_verified: vendor.is_verified === 1,
          images: vendor.images ? JSON.parse(vendor.images) : []
        }
      });
    }

    if (method === 'PUT') {
      // 업체 정보 수정
      const {
        name,
        contact_person,
        contact_email,
        contact_phone,
        address,
        cancellation_policy,
        description,
        logo_url,
        images
      } = req.body;

      await connection.execute(
        `UPDATE rentcar_vendors
        SET
          business_name = ?,
          contact_name = ?,
          contact_email = ?,
          contact_phone = ?,
          address = ?,
          cancellation_policy = ?,
          description = ?,
          logo_url = ?,
          images = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          name,
          contact_person,
          contact_email,
          contact_phone,
          address,
          cancellation_policy,
          description || null,
          logo_url || null,
          images ? JSON.stringify(images) : null,
          userId
        ]
      );

      return res.status(200).json({
        success: true,
        message: '업체 정보가 수정되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Vendor info API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
