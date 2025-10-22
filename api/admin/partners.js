const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 파트너 목록 조회 (숙박 제외, 가맹점만)
    if (req.method === 'GET') {
      const result = await connection.execute(`
        SELECT
          p.*,
          COUNT(DISTINCT l.id) as listing_count
        FROM partners p
        LEFT JOIN listings l ON p.id = l.partner_id
        WHERE (p.partner_type IS NULL OR p.partner_type != 'lodging')
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST - 파트너 생성
    if (req.method === 'POST') {
      const partnerData = req.body;

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = Array.isArray(partnerData.images)
        ? JSON.stringify(partnerData.images)
        : '[]';

      const result = await connection.execute(
        `INSERT INTO partners (
          user_id, business_name, contact_name, email, phone,
          business_address, location, services, base_price,
          detailed_address, description, images, business_hours,
          duration, min_age, max_capacity, language,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
        [
          1, // user_id (관리자가 생성하므로 1)
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
          partnerData.language || null
        ]
      );

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '파트너가 성공적으로 생성되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in partners API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
