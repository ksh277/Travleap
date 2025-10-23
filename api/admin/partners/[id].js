/**
 * 관리자 파트너 수정/삭제 API
 * PUT /api/admin/partners/[id] - 파트너 정보 수정
 * DELETE /api/admin/partners/[id] - 파트너 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
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
    // PUT - 파트너 정보 수정
    if (req.method === 'PUT') {
      const partnerData = req.body;

      // 이미지 배열 처리
      const imagesJson = Array.isArray(partnerData.images)
        ? JSON.stringify(partnerData.images)
        : partnerData.images || '[]';

      const result = await connection.execute(
        `UPDATE partners SET
          business_name = ?,
          contact_name = ?,
          email = ?,
          phone = ?,
          business_address = ?,
          location = ?,
          services = ?,
          base_price = ?,
          detailed_address = ?,
          description = ?,
          images = ?,
          business_hours = ?,
          duration = ?,
          min_age = ?,
          max_capacity = ?,
          language = ?,
          lat = ?,
          lng = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          partnerData.business_name,
          partnerData.contact_name,
          partnerData.email,
          partnerData.phone,
          partnerData.business_address,
          partnerData.location,
          partnerData.services,
          partnerData.base_price || 0,
          partnerData.detailed_address || '',
          partnerData.description || '',
          imagesJson,
          partnerData.business_hours || '',
          partnerData.duration || null,
          partnerData.min_age || null,
          partnerData.max_capacity || null,
          partnerData.language || null,
          partnerData.lat || null,  // 위도 (카카오 API의 y 값)
          partnerData.lng || null,  // 경도 (카카오 API의 x 값)
          id
        ]
      );

      return res.status(200).json({
        success: true,
        message: '파트너 정보가 성공적으로 수정되었습니다.'
      });
    }

    // DELETE - 파트너 삭제
    if (req.method === 'DELETE') {
      // 파트너 삭제 전 관련 리스팅 확인
      const listingsCheck = await connection.execute(
        `SELECT COUNT(*) as count FROM listings WHERE partner_id = ?`,
        [id]
      );

      const listingCount = listingsCheck.rows?.[0]?.count || 0;

      if (listingCount > 0) {
        return res.status(400).json({
          success: false,
          error: `이 파트너에 ${listingCount}개의 리스팅이 연결되어 있습니다. 먼저 리스팅을 삭제해주세요.`
        });
      }

      // 파트너 삭제
      await connection.execute(
        `DELETE FROM partners WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '파트너가 성공적으로 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in partner detail API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
