const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    const {
      businessName,
      contactName,
      email,
      phone,
      businessNumber,
      address,
      location,
      latitude,
      longitude,
      coordinates,
      website,
      instagram,
      services,
      description,
      businessHours,
      discountRate
    } = req.body;

    console.log('파트너 신청:', {
      businessName,
      address,
      coordinates
    });

    // 필수 항목 검증
    if (!businessName || !contactName || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      });
    }

    // partner_applications 테이블에 저장
    const result = await connection.execute(`
      INSERT INTO partner_applications (
        company_name,
        representative_name,
        email,
        phone,
        business_number,
        address,
        location,
        coordinates,
        website,
        category,
        description,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      businessName,
      contactName,
      email,
      phone,
      businessNumber || null,
      address || null,
      location || null,
      coordinates || null,  // "위도,경도" 형식
      website || null,
      services || null,      // 카테고리
      description || null,
    ]);

    console.log('파트너 신청 완료:', result.insertId);
    console.log('저장된 좌표:', coordinates);

    return res.status(200).json({
      success: true,
      message: '파트너 신청이 완료되었습니다. 검토 후 연락드리겠습니다.',
      applicationId: result.insertId
    });

  } catch (error) {
    console.error('파트너 신청 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '파트너 신청 처리 중 오류가 발생했습니다.'
    });
  }
};
