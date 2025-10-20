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
    // PUT - 파트너 수정
    if (req.method === 'PUT') {
      const partnerData = req.body;

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = Array.isArray(partnerData.images)
        ? JSON.stringify(partnerData.images)
        : '[]';

      await connection.execute(
        \`UPDATE partners SET
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
          updated_at = NOW()
        WHERE id = ?\`,
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
      // 관련 데이터 삭제 (cascade)
      await connection.execute('DELETE FROM listings WHERE partner_id = ?', [id]);

      // 파트너 삭제
      const result = await connection.execute('DELETE FROM partners WHERE id = ?', [id]);

      if (result.rowsAffected === 0) {
        return res.status(404).json({ success: false, error: '파트너를 찾을 수 없습니다.' });
      }

      return res.status(200).json({
        success: true,
        message: '파트너가 성공적으로 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in partner API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
