/**
 * 숙박 벤더 관리 API
 * GET /api/admin/accommodation-vendors - 모든 숙박 벤더 조회
 * POST /api/admin/accommodation-vendors - 숙박 벤더 추가
 */

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
    // GET - 모든 숙박 벤더 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT * FROM accommodation_vendors ORDER BY created_at DESC`
      );

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST - 숙박 벤더 추가
    if (req.method === 'POST') {
      const {
        vendor_code,
        business_name,
        brand_name,
        business_number,
        contact_name,
        contact_email,
        contact_phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id,
        status = 'active'
      } = req.body;

      // 필수 필드 검증
      if (!business_name) {
        return res.status(400).json({
          success: false,
          error: '사업자명은 필수입니다.'
        });
      }

      // vendor_code 자동 생성 (제공되지 않은 경우)
      const finalVendorCode = vendor_code || `ACC${Date.now()}`;

      const result = await connection.execute(
        `INSERT INTO accommodation_vendors (
          vendor_code, business_name, brand_name, business_number,
          contact_name, contact_email, contact_phone, description,
          logo_url, pms_provider, pms_api_key, pms_property_id,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          finalVendorCode,
          business_name,
          brand_name || business_name,
          business_number,
          contact_name,
          contact_email,
          contact_phone,
          description,
          logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          status
        ]
      );

      console.log('Accommodation vendor added:', result);

      return res.status(201).json({
        success: true,
        message: '숙박 벤더가 추가되었습니다.',
        data: {
          id: result.insertId,
          vendor_code: finalVendorCode
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Accommodation vendors API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
