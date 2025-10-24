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

  // DATABASE_URL 체크
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다!');
    return res.status(500).json({
      success: false,
      error: 'Database configuration error',
      message: 'DATABASE_URL is not configured'
    });
  }

  let connection;
  try {
    connection = connect({ url: process.env.DATABASE_URL });

    // GET - 모든 숙박 벤더 조회 (partners 테이블에서 partner_type='lodging')
    if (req.method === 'GET') {
      console.log('📥 [GET] 숙박 벤더 목록 조회 요청');

      // 간소화된 쿼리 (복잡한 서브쿼리 제거)
      const result = await connection.execute(
        `SELECT
          p.id,
          p.id as partner_id,
          p.user_id,
          p.business_name,
          p.business_number,
          p.contact_name,
          p.email as contact_email,
          p.phone as contact_phone,
          p.description,
          p.logo as logo_url,
          p.pms_provider,
          p.pms_api_key,
          p.pms_property_id,
          p.pms_sync_enabled,
          p.pms_sync_interval,
          p.last_sync_at,
          p.check_in_time,
          p.check_out_time,
          p.policies,
          p.status,
          p.is_active,
          p.tier,
          p.created_at,
          p.updated_at,
          COALESCE(COUNT(DISTINCT l.id), 0) as room_count,
          COALESCE(MIN(l.price_from), 0) as min_price
        FROM partners p
        LEFT JOIN listings l ON l.partner_id = p.id AND l.category = 'stay' AND l.category_id = 1857
        WHERE p.partner_type = 'lodging'
        GROUP BY p.id
        ORDER BY p.created_at DESC`
      );

      console.log(`✅ 숙박 벤더 ${result.rows?.length || 0}개 조회 완료`);

      // brand_name 없으면 business_name 사용
      const vendors = (result.rows || []).map(vendor => ({
        ...vendor,
        brand_name: vendor.brand_name || vendor.business_name,
        vendor_code: `ACC${vendor.id}`,
        avg_rating: 0, // 기본값
        total_reviews: 0 // 기본값
      }));

      return res.status(200).json({
        success: true,
        data: vendors
      });
    }

    // POST - 숙박 벤더 추가 (partners 테이블에 삽입)
    if (req.method === 'POST') {
      console.log('📥 [POST] 숙박 벤더 추가 요청');

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

      // user_id가 없으면 임시 생성
      let finalUserId = user_id;
      if (!finalUserId) {
        try {
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
        } catch (userError) {
          console.error('❌ 사용자 생성 오류:', userError);
          // 사용자 생성 실패해도 기본값으로 진행
          finalUserId = 1; // 기본 사용자 ID
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
    console.error('❌ Accommodation vendors API error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });

    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
