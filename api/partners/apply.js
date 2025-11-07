const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 로그인 확인 (Authorization 헤더 필요)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다. 다시 로그인해주세요.'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // PartnerApplyPage.tsx에서 보내는 필드명 (snake_case)을 처리
    const {
      business_name,
      contact_name,
      email,
      phone,
      mobile_phone,
      business_address,
      location,
      services,
      base_price,
      base_price_text,
      detailed_address,
      description,
      images,
      business_hours,
      duration,
      min_age,
      max_capacity,
      language,
      lat,
      lng
    } = req.body;

    console.log('파트너 신청 데이터:', {
      business_name,
      business_address,
      location,
      services,
      lat,
      lng
    });

    // 필수 항목 검증 (mobile_phone 필수)
    if (!business_name || !contact_name || !email || !mobile_phone) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      });
    }

    // 좌표를 "위도,경도" 형식으로 변환
    const coordinates = (lat && lng) ? `${lat},${lng}` : null;

    // 상세 정보를 JSON으로 저장 (admin_notes 필드 활용)
    const additionalData = {
      images: images || [],
      base_price,
      base_price_text,
      detailed_address,
      business_hours,
      duration,
      min_age,
      max_capacity,
      language
    };

    // partners 테이블에 직접 저장 (status: pending)
    const result = await connection.execute(`
      INSERT INTO partners (
        business_name,
        contact_name,
        email,
        phone,
        mobile_phone,
        business_address,
        location,
        services,
        description,
        images,
        lat,
        lng,
        base_price,
        base_price_text,
        detailed_address,
        business_hours,
        duration,
        min_age,
        max_capacity,
        language,
        status,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NOW())
    `, [
      business_name,
      contact_name,
      email,
      phone || null,
      mobile_phone,
      business_address || null,
      location || null,
      services || null,
      description || null,
      images && images.length > 0 ? JSON.stringify(images) : null,
      lat || null,
      lng || null,
      base_price || null,
      base_price_text || null,
      detailed_address || null,
      business_hours || null,
      duration || null,
      min_age || null,
      max_capacity || null,
      language || null
    ]);

    console.log('✅ 파트너 신청 완료:', result.insertId);
    console.log('저장된 좌표:', coordinates);

    return res.status(200).json({
      success: true,
      message: '파트너 신청이 완료되었습니다. 관리자 검토 후 연락드리겠습니다.',
      applicationId: result.insertId,
      data: {
        id: result.insertId,
        business_name,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('파트너 신청 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '파트너 신청 처리 중 오류가 발생했습니다.'
    });
  }
};
