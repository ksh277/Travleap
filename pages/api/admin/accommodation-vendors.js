/**
 * 숙박 벤더 관리 API (partners 테이블 사용)
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
    // GET - 모든 숙박 벤더 조회 (partners 테이블에서 partner_type='lodging')
    if (req.method === 'GET') {
      console.log('📥 [GET] 숙박 벤더 목록 조회 요청');

      const result = await connection.execute(
        `SELECT
          id,
          id as partner_id,
          user_id,
          business_name,
          business_number,
          contact_name,
          email as contact_email,
          phone as contact_phone,
          description,
          logo as logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          last_sync_at,
          check_in_time,
          check_out_time,
          policies,
          status,
          is_active,
          tier,
          created_at,
          updated_at,
          (SELECT COUNT(*) FROM listings WHERE partner_id = partners.id AND category = 'stay' AND category_id = 1857) as room_count,
          (SELECT MIN(price_from) FROM listings WHERE partner_id = partners.id AND category = 'stay' AND category_id = 1857) as min_price,
          (SELECT AVG(rating) FROM reviews WHERE listing_id IN (SELECT id FROM listings WHERE partner_id = partners.id AND category = 'stay' AND category_id = 1857)) as avg_rating,
          (SELECT COUNT(*) FROM reviews WHERE listing_id IN (SELECT id FROM listings WHERE partner_id = partners.id AND category = 'stay' AND category_id = 1857)) as total_reviews
        FROM partners
        WHERE partner_type = 'lodging'
        ORDER BY created_at DESC`
      );

      console.log(`✅ 숙박 벤더 ${result.rows?.length || 0}개 조회 완료`);

      // brand_name 없으면 business_name 사용
      const vendors = (result.rows || []).map(vendor => ({
        ...vendor,
        brand_name: vendor.brand_name || vendor.business_name,
        vendor_code: `ACC${vendor.id}` // vendor_code 생성
      }));

      return res.status(200).json({
        success: true,
        data: vendors
      });
    }

    // POST - 숙박 벤더 추가 (partners 테이블에 삽입)
    if (req.method === 'POST') {
      console.log('📥 [POST] 숙박 벤더 추가 요청:', req.body);

      const {
        user_id,
        business_name,
        brand_name,
        business_number,
        contact_name,
        email,
        phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id,
        pms_sync_enabled = 0,
        pms_sync_interval = 60,
        check_in_time = '15:00',
        check_out_time = '11:00',
        policies,
        status = 'active',
        tier = 'basic'
      } = req.body;

      // 필수 필드 검증
      if (!business_name) {
        return res.status(400).json({
          success: false,
          error: '사업자명은 필수입니다.'
        });
      }

      // user_id가 없으면 임시 생성 (실제로는 인증 시스템과 연동되어야 함)
      let finalUserId = user_id;
      if (!finalUserId) {
        // 임시 사용자 ID 생성 또는 조회
        const tempUserResult = await connection.execute(
          `SELECT id FROM users WHERE email = ? LIMIT 1`,
          [email || 'temp@accommodation.com']
        );

        if (tempUserResult.rows && tempUserResult.rows.length > 0) {
          finalUserId = tempUserResult.rows[0].id;
        } else {
          // 임시 사용자 생성
          const createUserResult = await connection.execute(
            `INSERT INTO users (email, name, user_type, created_at, updated_at)
             VALUES (?, ?, 'vendor', NOW(), NOW())`,
            [email || 'temp@accommodation.com', contact_name || business_name]
          );
          finalUserId = createUserResult.insertId;
        }
      }

      const result = await connection.execute(
        `INSERT INTO partners (
          user_id,
          partner_type,
          business_name,
          business_number,
          contact_name,
          email,
          phone,
          description,
          logo,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          check_in_time,
          check_out_time,
          policies,
          status,
          is_active,
          tier,
          created_at,
          updated_at
        ) VALUES (?, 'lodging', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
        [
          finalUserId,
          business_name,
          business_number,
          contact_name,
          email,
          phone,
          description,
          logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          check_in_time,
          check_out_time,
          policies,
          status,
          tier
        ]
      );

      console.log('✅ 숙박 벤더 추가 완료:', {
        id: result.insertId,
        business_name,
        user_id: finalUserId
      });

      return res.status(201).json({
        success: true,
        message: '숙박 벤더가 추가되었습니다.',
        data: {
          id: result.insertId,
          partner_id: result.insertId,
          vendor_code: `ACC${result.insertId}`,
          user_id: finalUserId
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
